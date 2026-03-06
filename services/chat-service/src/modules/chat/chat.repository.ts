import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationEntity } from './entities/conversation.entity';
import { ConversationParticipantEntity } from './entities/conversation-participant.entity';
import { CassandraService } from './cassandra.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationQueryDto } from './dto/message-query.dto';

export interface CassandraMessage {
  conversation_id: string;
  message_id: string;
  sender_id: string;
  sender_type: string;
  message_type: string;
  content: string;
  media_url: string | null;
  read_at: Date | null;
  created_at: Date;
}

@Injectable()
export class ChatRepository {
  private readonly logger = new Logger(ChatRepository.name);

  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(ConversationParticipantEntity)
    private readonly participantRepo: Repository<ConversationParticipantEntity>,
    private readonly cassandra: CassandraService,
  ) {}

  // ─── Conversation CRUD (PostgreSQL) ──────────────────────────

  async createConversation(
    dto: CreateConversationDto,
    creatorId: string,
    creatorType: string,
  ): Promise<ConversationEntity> {
    const conversation = this.conversationRepo.create({
      type: dto.type,
      order_id: dto.order_id || null,
      title: dto.title || null,
      status: 'active',
    });
    const saved = await this.conversationRepo.save(conversation);

    // Add creator as participant if not already in the list
    const allParticipants = [...dto.participants];
    if (!allParticipants.some((p) => p.user_id === creatorId)) {
      allParticipants.unshift({
        user_id: creatorId,
        user_type: creatorType,
        display_name: undefined,
      });
    }

    const participantEntities = allParticipants.map((p) =>
      this.participantRepo.create({
        conversation_id: saved.id,
        user_id: p.user_id,
        user_type: p.user_type,
        display_name: p.display_name || null,
      }),
    );
    await this.participantRepo.save(participantEntities);

    return this.findConversationById(saved.id) as Promise<ConversationEntity>;
  }

  async findConversationById(id: string): Promise<ConversationEntity | null> {
    return this.conversationRepo.findOne({
      where: { id },
      relations: ['participants'],
    });
  }

  async findConversationByOrderId(orderId: string): Promise<ConversationEntity | null> {
    return this.conversationRepo.findOne({
      where: { order_id: orderId, type: 'order' },
      relations: ['participants'],
    });
  }

  async findConversationsByUserId(
    userId: string,
    query: ConversationQueryDto,
  ): Promise<{ items: ConversationEntity[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'p', 'p.user_id = :userId AND p.left_at IS NULL', { userId })
      .leftJoinAndSelect('c.participants', 'allP');

    if (query.type) {
      qb.andWhere('c.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('c.status = :status', { status: query.status });
    } else {
      qb.andWhere('c.status != :archived', { archived: 'archived' });
    }

    qb.orderBy('c.last_message_at', 'DESC', 'NULLS LAST')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const count = await this.participantRepo.count({
      where: { conversation_id: conversationId, user_id: userId, left_at: undefined },
    });
    return count > 0;
  }

  async getParticipant(
    conversationId: string,
    userId: string,
  ): Promise<ConversationParticipantEntity | null> {
    return this.participantRepo.findOne({
      where: { conversation_id: conversationId, user_id: userId },
    });
  }

  async updateLastMessage(
    conversationId: string,
    preview: string,
    timestamp: Date,
  ): Promise<void> {
    await this.conversationRepo.update(conversationId, {
      last_message_preview: preview.substring(0, 200),
      last_message_at: timestamp,
      message_count: () => 'message_count + 1',
    } as any);
  }

  async incrementUnreadCount(conversationId: string, excludeUserId: string): Promise<void> {
    await this.participantRepo
      .createQueryBuilder()
      .update(ConversationParticipantEntity)
      .set({ unread_count: () => 'unread_count + 1' })
      .where('conversation_id = :conversationId AND user_id != :excludeUserId', {
        conversationId,
        excludeUserId,
      })
      .execute();
  }

  async resetUnreadCount(conversationId: string, userId: string): Promise<void> {
    await this.participantRepo.update(
      { conversation_id: conversationId, user_id: userId },
      { unread_count: 0, last_read_at: new Date() },
    );
  }

  async closeConversation(conversationId: string): Promise<void> {
    await this.conversationRepo.update(conversationId, { status: 'closed' });
  }

  // ─── Messages (CassandraDB) ─────────────────────────────────

  async insertMessage(
    conversationId: string,
    senderId: string,
    senderType: string,
    messageType: string,
    content: string,
    mediaUrl: string | null,
  ): Promise<CassandraMessage> {
    const messageId = this.cassandra.getTimeUuid();
    const now = new Date();

    const query = `
      INSERT INTO chat_messages (
        conversation_id, message_id, sender_id, sender_type,
        message_type, content, media_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.cassandra.execute(query, [
      conversationId,
      messageId,
      senderId,
      senderType,
      messageType,
      content,
      mediaUrl,
      now,
    ]);

    return {
      conversation_id: conversationId,
      message_id: messageId.toString(),
      sender_id: senderId,
      sender_type: senderType,
      message_type: messageType,
      content,
      media_url: mediaUrl,
      read_at: null,
      created_at: now,
    };
  }

  async getMessages(
    conversationId: string,
    limit: number,
    before?: string,
    after?: string,
  ): Promise<CassandraMessage[]> {
    let query: string;
    let params: unknown[];

    if (before) {
      // Fetch older messages (before cursor, DESC order)
      query = `
        SELECT * FROM chat_messages
        WHERE conversation_id = ? AND message_id < ?
        ORDER BY message_id DESC
        LIMIT ?
      `;
      params = [conversationId, CassandraService.fromTimeUuid(before), limit];
    } else if (after) {
      // Fetch newer messages (after cursor, ASC order)
      query = `
        SELECT * FROM chat_messages
        WHERE conversation_id = ? AND message_id > ?
        ORDER BY message_id ASC
        LIMIT ?
      `;
      params = [conversationId, CassandraService.fromTimeUuid(after), limit];
    } else {
      // Fetch most recent messages (DESC order)
      query = `
        SELECT * FROM chat_messages
        WHERE conversation_id = ?
        ORDER BY message_id DESC
        LIMIT ?
      `;
      params = [conversationId, limit];
    }

    const result = await this.cassandra.execute(query, params);

    return result.rows.map((row) => ({
      conversation_id: row.conversation_id.toString(),
      message_id: row.message_id.toString(),
      sender_id: row.sender_id.toString(),
      sender_type: row.sender_type,
      message_type: row.message_type,
      content: row.content,
      media_url: row.media_url || null,
      read_at: row.read_at || null,
      created_at: row.created_at,
    }));
  }

  async markMessagesAsRead(
    conversationId: string,
    messageIds: string[],
  ): Promise<void> {
    const now = new Date();
    for (const messageId of messageIds) {
      const query = `
        UPDATE chat_messages
        SET read_at = ?
        WHERE conversation_id = ? AND message_id = ?
      `;
      await this.cassandra.execute(query, [
        now,
        conversationId,
        CassandraService.fromTimeUuid(messageId),
      ]);
    }
  }
}
