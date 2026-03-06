import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ChatRepository, CassandraMessage } from './chat.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageQueryDto, ConversationQueryDto } from './dto/message-query.dto';
import { ConversationEntity } from './entities/conversation.entity';

const CHAT_EVENTS_TOPIC = 'daltaners.chat.events';
const PRESENCE_TTL = 300; // 5 minutes
const TYPING_TTL = 10; // 10 seconds

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ─── Conversations ──────────────────────────────────────────

  async createConversation(
    dto: CreateConversationDto,
    userId: string,
    userRole: string,
  ): Promise<ConversationEntity> {
    // For order-based conversations, check if one already exists
    if (dto.type === 'order' && dto.order_id) {
      const existing = await this.chatRepo.findConversationByOrderId(dto.order_id);
      if (existing) {
        throw new ConflictException('Conversation already exists for this order');
      }
    }

    const userType = this.mapRoleToUserType(userRole);
    const conversation = await this.chatRepo.createConversation(dto, userId, userType);

    try {
      await this.kafka.publish(
        CHAT_EVENTS_TOPIC,
        'conversation_created',
        {
          conversation_id: conversation.id,
          type: conversation.type,
          order_id: conversation.order_id,
          participants: conversation.participants.map((p) => ({
            user_id: p.user_id,
            user_type: p.user_type,
          })),
        },
        conversation.id,
      );
    } catch {
      this.logger.warn(`Failed to publish conversation_created event for ${conversation.id}`);
    }

    return conversation;
  }

  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationEntity> {
    const conversation = await this.chatRepo.findConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some((p) => p.user_id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    return conversation;
  }

  async getConversations(
    userId: string,
    query: ConversationQueryDto,
  ): Promise<{ items: ConversationEntity[]; total: number; page: number; limit: number }> {
    const result = await this.chatRepo.findConversationsByUserId(userId, query);
    return {
      ...result,
      page: query.page || 1,
      limit: query.limit || 20,
    };
  }

  async getConversationByOrderId(
    orderId: string,
    userId: string,
  ): Promise<ConversationEntity> {
    const conversation = await this.chatRepo.findConversationByOrderId(orderId);
    if (!conversation) {
      throw new NotFoundException('No conversation found for this order');
    }

    const isParticipant = conversation.participants.some((p) => p.user_id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    return conversation;
  }

  async closeConversation(
    conversationId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);

    // Only admin, vendor, or conversation creator can close
    if (userRole !== 'admin') {
      const participant = conversation.participants.find((p) => p.user_id === userId);
      if (!participant || !['vendor', 'admin'].includes(participant.user_type)) {
        throw new ForbiddenException('Only vendors or admins can close conversations');
      }
    }

    await this.chatRepo.closeConversation(conversationId);

    try {
      await this.kafka.publish(
        CHAT_EVENTS_TOPIC,
        'conversation_closed',
        { conversation_id: conversationId, closed_by: userId },
        conversationId,
      );
    } catch {
      this.logger.warn(`Failed to publish conversation_closed event for ${conversationId}`);
    }
  }

  // ─── Messages ───────────────────────────────────────────────

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    userId: string,
    userRole: string,
  ): Promise<CassandraMessage> {
    // Verify participant access
    const conversation = await this.chatRepo.findConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.status !== 'active') {
      throw new BadRequestException('Cannot send messages to a closed conversation');
    }

    const participant = conversation.participants.find((p) => p.user_id === userId);
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    const senderType = participant.user_type;

    // Validate message content
    if (dto.message_type === 'text' && (!dto.content || dto.content.trim().length === 0)) {
      throw new BadRequestException('Text messages must have content');
    }

    if (dto.message_type === 'image' && !dto.media_url) {
      throw new BadRequestException('Image messages must have a media_url');
    }

    // Insert message into Cassandra
    const message = await this.chatRepo.insertMessage(
      conversationId,
      userId,
      senderType,
      dto.message_type,
      dto.content,
      dto.media_url || null,
    );

    // Update conversation metadata in PostgreSQL
    await this.chatRepo.updateLastMessage(
      conversationId,
      dto.message_type === 'text' ? dto.content : `[${dto.message_type}]`,
      message.created_at,
    );

    // Increment unread count for other participants
    await this.chatRepo.incrementUnreadCount(conversationId, userId);

    // Publish Kafka event
    try {
      await this.kafka.publish(
        CHAT_EVENTS_TOPIC,
        'message_sent',
        {
          conversation_id: conversationId,
          message_id: message.message_id,
          sender_id: userId,
          sender_type: senderType,
          message_type: dto.message_type,
          content: dto.content,
          media_url: dto.media_url || null,
          created_at: message.created_at.toISOString(),
        },
        conversationId,
      );
    } catch {
      this.logger.warn(`Failed to publish message_sent event for conversation ${conversationId}`);
    }

    // Clear typing indicator
    await this.redis.del(`chat:typing:${conversationId}:${userId}`);

    return message;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    query: MessageQueryDto,
  ): Promise<{ messages: CassandraMessage[]; has_more: boolean }> {
    // Verify access
    const isParticipant = await this.chatRepo.isParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    const limit = query.limit || 50;
    const messages = await this.chatRepo.getMessages(
      conversationId,
      limit + 1, // fetch one extra to determine has_more
      query.before,
      query.after,
    );

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    return { messages, has_more: hasMore };
  }

  async markAsRead(
    conversationId: string,
    userId: string,
    messageIds: string[],
  ): Promise<void> {
    const isParticipant = await this.chatRepo.isParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    if (messageIds.length > 0) {
      await this.chatRepo.markMessagesAsRead(conversationId, messageIds);
    }

    // Reset unread counter for user
    await this.chatRepo.resetUnreadCount(conversationId, userId);
  }

  // ─── Presence & Typing ─────────────────────────────────────

  async setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const key = `chat:typing:${conversationId}:${userId}`;
    if (isTyping) {
      await this.redis.set(key, '1', TYPING_TTL);
    } else {
      await this.redis.del(key);
    }
  }

  async setOnline(userId: string): Promise<void> {
    await this.redis.set(`chat:presence:${userId}`, 'online', PRESENCE_TTL);
  }

  async setOffline(userId: string): Promise<void> {
    await this.redis.del(`chat:presence:${userId}`);
  }

  async isOnline(userId: string): Promise<boolean> {
    const status = await this.redis.get(`chat:presence:${userId}`);
    return status === 'online';
  }

  async getOnlineParticipants(conversationId: string): Promise<string[]> {
    const conversation = await this.chatRepo.findConversationById(conversationId);
    if (!conversation) return [];

    const online: string[] = [];
    for (const p of conversation.participants) {
      if (await this.isOnline(p.user_id)) {
        online.push(p.user_id);
      }
    }
    return online;
  }

  // ─── Helpers ────────────────────────────────────────────────

  private mapRoleToUserType(role: string): string {
    switch (role) {
      case 'customer':
        return 'customer';
      case 'vendor_owner':
      case 'vendor_staff':
        return 'vendor';
      case 'delivery':
        return 'delivery';
      case 'admin':
        return 'admin';
      default:
        return 'customer';
    }
  }
}
