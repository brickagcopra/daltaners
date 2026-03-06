import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ChatService } from '../chat.service';
import { ChatRepository, CassandraMessage } from '../chat.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { ConversationEntity } from '../entities/conversation.entity';
import { ConversationParticipantEntity } from '../entities/conversation-participant.entity';

describe('ChatService', () => {
  let service: ChatService;
  let chatRepo: jest.Mocked<ChatRepository>;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  const userId = '10000001-0000-0000-0000-000000000001';
  const otherUserId = '10000001-0000-0000-0000-000000000002';
  const orderId = '50000001-0000-0000-0000-000000000001';
  const conversationId = '90000001-0000-0000-0000-000000000001';

  const mockParticipant = (overrides: Partial<ConversationParticipantEntity> = {}): ConversationParticipantEntity => ({
    id: '91000001-0000-0000-0000-000000000001',
    conversation_id: conversationId,
    user_id: userId,
    user_type: 'customer',
    display_name: 'Maria Santos',
    is_muted: false,
    unread_count: 0,
    last_read_at: null,
    joined_at: new Date(),
    left_at: null,
    conversation: {} as ConversationEntity,
    ...overrides,
  });

  const mockConversation = (overrides: Partial<ConversationEntity> = {}): ConversationEntity => ({
    id: conversationId,
    type: 'order',
    order_id: orderId,
    title: null,
    status: 'active',
    last_message_at: null,
    last_message_preview: null,
    message_count: 0,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
    participants: [
      mockParticipant(),
      mockParticipant({
        id: '91000001-0000-0000-0000-000000000002',
        user_id: otherUserId,
        user_type: 'delivery',
        display_name: 'Kuya Mike',
      }),
    ],
    ...overrides,
  });

  const mockMessage = (overrides: Partial<CassandraMessage> = {}): CassandraMessage => ({
    conversation_id: conversationId,
    message_id: 'timeuuid-001',
    sender_id: userId,
    sender_type: 'customer',
    message_type: 'text',
    content: 'Kumusta po!',
    media_url: null,
    read_at: null,
    created_at: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ChatRepository,
          useValue: {
            createConversation: jest.fn(),
            findConversationById: jest.fn(),
            findConversationByOrderId: jest.fn(),
            findConversationsByUserId: jest.fn(),
            isParticipant: jest.fn(),
            getParticipant: jest.fn(),
            updateLastMessage: jest.fn(),
            incrementUnreadCount: jest.fn(),
            resetUnreadCount: jest.fn(),
            closeConversation: jest.fn(),
            insertMessage: jest.fn(),
            getMessages: jest.fn(),
            markMessagesAsRead: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    chatRepo = module.get(ChatRepository) as jest.Mocked<ChatRepository>;
    redis = module.get(RedisService) as jest.Mocked<RedisService>;
    kafka = module.get(KafkaProducerService) as jest.Mocked<KafkaProducerService>;
  });

  // ─── createConversation ────────────────────────────────────

  describe('createConversation', () => {
    const dto = {
      type: 'order',
      order_id: orderId,
      participants: [
        { user_id: otherUserId, user_type: 'delivery', display_name: 'Kuya Mike' },
      ],
    };

    it('should create a new conversation', async () => {
      const conversation = mockConversation();
      chatRepo.findConversationByOrderId.mockResolvedValue(null);
      chatRepo.createConversation.mockResolvedValue(conversation);

      const result = await service.createConversation(dto, userId, 'customer');

      expect(result).toEqual(conversation);
      expect(chatRepo.createConversation).toHaveBeenCalledWith(dto, userId, 'customer');
    });

    it('should throw ConflictException if order conversation already exists', async () => {
      chatRepo.findConversationByOrderId.mockResolvedValue(mockConversation());

      await expect(
        service.createConversation(dto, userId, 'customer'),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow direct conversations without order_id check', async () => {
      const directDto = { type: 'direct', participants: dto.participants };
      const conversation = mockConversation({ type: 'direct', order_id: null });
      chatRepo.createConversation.mockResolvedValue(conversation);

      const result = await service.createConversation(directDto, userId, 'customer');

      expect(result).toEqual(conversation);
      expect(chatRepo.findConversationByOrderId).not.toHaveBeenCalled();
    });

    it('should publish Kafka event on creation', async () => {
      chatRepo.findConversationByOrderId.mockResolvedValue(null);
      chatRepo.createConversation.mockResolvedValue(mockConversation());

      await service.createConversation(dto, userId, 'customer');

      expect(kafka.publish).toHaveBeenCalledWith(
        'daltaners.chat.events',
        'conversation_created',
        expect.objectContaining({ conversation_id: conversationId }),
        conversationId,
      );
    });

    it('should not fail if Kafka publish fails', async () => {
      chatRepo.findConversationByOrderId.mockResolvedValue(null);
      chatRepo.createConversation.mockResolvedValue(mockConversation());
      kafka.publish.mockRejectedValue(new Error('Kafka down'));

      const result = await service.createConversation(dto, userId, 'customer');

      expect(result).toBeDefined();
    });

    it('should map vendor_owner role to vendor user_type', async () => {
      chatRepo.findConversationByOrderId.mockResolvedValue(null);
      chatRepo.createConversation.mockResolvedValue(mockConversation());

      await service.createConversation(dto, userId, 'vendor_owner');

      expect(chatRepo.createConversation).toHaveBeenCalledWith(dto, userId, 'vendor');
    });
  });

  // ─── getConversation ───────────────────────────────────────

  describe('getConversation', () => {
    it('should return conversation for participant', async () => {
      chatRepo.findConversationById.mockResolvedValue(mockConversation());

      const result = await service.getConversation(conversationId, userId);

      expect(result.id).toBe(conversationId);
    });

    it('should throw NotFoundException if not found', async () => {
      chatRepo.findConversationById.mockResolvedValue(null);

      await expect(
        service.getConversation(conversationId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-participant', async () => {
      chatRepo.findConversationById.mockResolvedValue(mockConversation());

      await expect(
        service.getConversation(conversationId, 'unknown-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getConversations ──────────────────────────────────────

  describe('getConversations', () => {
    it('should return paginated conversations for user', async () => {
      chatRepo.findConversationsByUserId.mockResolvedValue({
        items: [mockConversation()],
        total: 1,
      });

      const result = await service.getConversations(userId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should pass query filters to repository', async () => {
      const query = { page: 2, limit: 10, type: 'order', status: 'active' };
      chatRepo.findConversationsByUserId.mockResolvedValue({ items: [], total: 0 });

      await service.getConversations(userId, query);

      expect(chatRepo.findConversationsByUserId).toHaveBeenCalledWith(userId, query);
    });
  });

  // ─── getConversationByOrderId ──────────────────────────────

  describe('getConversationByOrderId', () => {
    it('should return conversation for order', async () => {
      chatRepo.findConversationByOrderId.mockResolvedValue(mockConversation());

      const result = await service.getConversationByOrderId(orderId, userId);

      expect(result.order_id).toBe(orderId);
    });

    it('should throw NotFoundException if not found', async () => {
      chatRepo.findConversationByOrderId.mockResolvedValue(null);

      await expect(
        service.getConversationByOrderId(orderId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-participant', async () => {
      chatRepo.findConversationByOrderId.mockResolvedValue(mockConversation());

      await expect(
        service.getConversationByOrderId(orderId, 'unknown-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── closeConversation ─────────────────────────────────────

  describe('closeConversation', () => {
    it('should allow admin to close any conversation', async () => {
      chatRepo.findConversationById.mockResolvedValue(
        mockConversation({
          participants: [
            mockParticipant({ user_id: 'admin-id', user_type: 'admin' }),
          ],
        }),
      );

      await service.closeConversation(conversationId, 'admin-id', 'admin');

      expect(chatRepo.closeConversation).toHaveBeenCalledWith(conversationId);
    });

    it('should allow vendor participant to close', async () => {
      chatRepo.findConversationById.mockResolvedValue(
        mockConversation({
          participants: [
            mockParticipant({ user_id: userId, user_type: 'vendor' }),
          ],
        }),
      );

      await service.closeConversation(conversationId, userId, 'vendor_owner');

      expect(chatRepo.closeConversation).toHaveBeenCalled();
    });

    it('should reject customer closing a conversation', async () => {
      chatRepo.findConversationById.mockResolvedValue(mockConversation());

      await expect(
        service.closeConversation(conversationId, userId, 'customer'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── sendMessage ───────────────────────────────────────────

  describe('sendMessage', () => {
    const dto = { message_type: 'text', content: 'Kumusta po!' };

    it('should send a text message successfully', async () => {
      const message = mockMessage();
      chatRepo.findConversationById.mockResolvedValue(mockConversation());
      chatRepo.insertMessage.mockResolvedValue(message);

      const result = await service.sendMessage(conversationId, dto, userId, 'customer');

      expect(result).toEqual(message);
      expect(chatRepo.insertMessage).toHaveBeenCalledWith(
        conversationId, userId, 'customer', 'text', 'Kumusta po!', null,
      );
    });

    it('should update conversation last_message and increment unread', async () => {
      chatRepo.findConversationById.mockResolvedValue(mockConversation());
      chatRepo.insertMessage.mockResolvedValue(mockMessage());

      await service.sendMessage(conversationId, dto, userId, 'customer');

      expect(chatRepo.updateLastMessage).toHaveBeenCalled();
      expect(chatRepo.incrementUnreadCount).toHaveBeenCalledWith(conversationId, userId);
    });

    it('should throw NotFoundException if conversation not found', async () => {
      chatRepo.findConversationById.mockResolvedValue(null);

      await expect(
        service.sendMessage(conversationId, dto, userId, 'customer'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for closed conversation', async () => {
      chatRepo.findConversationById.mockResolvedValue(
        mockConversation({ status: 'closed' }),
      );

      await expect(
        service.sendMessage(conversationId, dto, userId, 'customer'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for non-participant', async () => {
      chatRepo.findConversationById.mockResolvedValue(mockConversation());

      await expect(
        service.sendMessage(conversationId, dto, 'unknown-user', 'customer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for empty text message', async () => {
      chatRepo.findConversationById.mockResolvedValue(mockConversation());

      await expect(
        service.sendMessage(conversationId, { message_type: 'text', content: '' }, userId, 'customer'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for image without media_url', async () => {
      chatRepo.findConversationById.mockResolvedValue(mockConversation());

      await expect(
        service.sendMessage(
          conversationId,
          { message_type: 'image', content: 'photo' },
          userId,
          'customer',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send image message with media_url', async () => {
      const imageDto = {
        message_type: 'image',
        content: 'Check this',
        media_url: 'https://cdn.example.com/photo.jpg',
      };
      chatRepo.findConversationById.mockResolvedValue(mockConversation());
      chatRepo.insertMessage.mockResolvedValue(
        mockMessage({ message_type: 'image', media_url: 'https://cdn.example.com/photo.jpg' }),
      );

      const result = await service.sendMessage(conversationId, imageDto, userId, 'customer');

      expect(result.message_type).toBe('image');
      expect(chatRepo.insertMessage).toHaveBeenCalledWith(
        conversationId, userId, 'customer', 'image', 'Check this', 'https://cdn.example.com/photo.jpg',
      );
    });

    it('should publish Kafka event on message send', async () => {
      chatRepo.findConversationById.mockResolvedValue(mockConversation());
      chatRepo.insertMessage.mockResolvedValue(mockMessage());

      await service.sendMessage(conversationId, dto, userId, 'customer');

      expect(kafka.publish).toHaveBeenCalledWith(
        'daltaners.chat.events',
        'message_sent',
        expect.objectContaining({
          conversation_id: conversationId,
          sender_id: userId,
        }),
        conversationId,
      );
    });

    it('should clear typing indicator after sending', async () => {
      chatRepo.findConversationById.mockResolvedValue(mockConversation());
      chatRepo.insertMessage.mockResolvedValue(mockMessage());

      await service.sendMessage(conversationId, dto, userId, 'customer');

      expect(redis.del).toHaveBeenCalledWith(`chat:typing:${conversationId}:${userId}`);
    });
  });

  // ─── getMessages ───────────────────────────────────────────

  describe('getMessages', () => {
    it('should return messages for participant', async () => {
      chatRepo.isParticipant.mockResolvedValue(true);
      chatRepo.getMessages.mockResolvedValue([mockMessage()]);

      const result = await service.getMessages(conversationId, userId, { limit: 50 });

      expect(result.messages).toHaveLength(1);
      expect(result.has_more).toBe(false);
    });

    it('should detect has_more when more messages exist', async () => {
      chatRepo.isParticipant.mockResolvedValue(true);
      // Return limit + 1 items (service requests 51 and pops the last one)
      const messages = Array.from({ length: 51 }, (_, i) =>
        mockMessage({ message_id: `timeuuid-${i}` }),
      );
      chatRepo.getMessages.mockResolvedValue(messages);

      const result = await service.getMessages(conversationId, userId, { limit: 50 });

      expect(result.messages).toHaveLength(50);
      expect(result.has_more).toBe(true);
    });

    it('should throw ForbiddenException for non-participant', async () => {
      chatRepo.isParticipant.mockResolvedValue(false);

      await expect(
        service.getMessages(conversationId, userId, { limit: 50 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass before cursor to repository', async () => {
      chatRepo.isParticipant.mockResolvedValue(true);
      chatRepo.getMessages.mockResolvedValue([]);

      await service.getMessages(conversationId, userId, { limit: 20, before: 'cursor-id' });

      expect(chatRepo.getMessages).toHaveBeenCalledWith(
        conversationId, 21, 'cursor-id', undefined,
      );
    });
  });

  // ─── markAsRead ────────────────────────────────────────────

  describe('markAsRead', () => {
    it('should mark messages as read and reset unread count', async () => {
      chatRepo.isParticipant.mockResolvedValue(true);

      await service.markAsRead(conversationId, userId, ['msg-1', 'msg-2']);

      expect(chatRepo.markMessagesAsRead).toHaveBeenCalledWith(
        conversationId, ['msg-1', 'msg-2'],
      );
      expect(chatRepo.resetUnreadCount).toHaveBeenCalledWith(conversationId, userId);
    });

    it('should skip marking when no message_ids provided', async () => {
      chatRepo.isParticipant.mockResolvedValue(true);

      await service.markAsRead(conversationId, userId, []);

      expect(chatRepo.markMessagesAsRead).not.toHaveBeenCalled();
      expect(chatRepo.resetUnreadCount).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-participant', async () => {
      chatRepo.isParticipant.mockResolvedValue(false);

      await expect(
        service.markAsRead(conversationId, userId, ['msg-1']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Presence & Typing ─────────────────────────────────────

  describe('setTyping', () => {
    it('should set typing indicator in Redis', async () => {
      await service.setTyping(conversationId, userId, true);

      expect(redis.set).toHaveBeenCalledWith(
        `chat:typing:${conversationId}:${userId}`, '1', 10,
      );
    });

    it('should clear typing indicator', async () => {
      await service.setTyping(conversationId, userId, false);

      expect(redis.del).toHaveBeenCalledWith(`chat:typing:${conversationId}:${userId}`);
    });
  });

  describe('setOnline / setOffline', () => {
    it('should set user as online with TTL', async () => {
      await service.setOnline(userId);

      expect(redis.set).toHaveBeenCalledWith(`chat:presence:${userId}`, 'online', 300);
    });

    it('should set user as offline by deleting key', async () => {
      await service.setOffline(userId);

      expect(redis.del).toHaveBeenCalledWith(`chat:presence:${userId}`);
    });
  });

  describe('isOnline', () => {
    it('should return true when user is online', async () => {
      redis.get.mockResolvedValue('online');

      expect(await service.isOnline(userId)).toBe(true);
    });

    it('should return false when user is offline', async () => {
      redis.get.mockResolvedValue(null);

      expect(await service.isOnline(userId)).toBe(false);
    });
  });

  describe('getOnlineParticipants', () => {
    it('should return online participant IDs', async () => {
      chatRepo.findConversationById.mockResolvedValue(mockConversation());
      redis.get
        .mockResolvedValueOnce('online')  // userId is online
        .mockResolvedValueOnce(null);     // otherUserId is offline

      const result = await service.getOnlineParticipants(conversationId);

      expect(result).toEqual([userId]);
    });

    it('should return empty array if conversation not found', async () => {
      chatRepo.findConversationById.mockResolvedValue(null);

      const result = await service.getOnlineParticipants(conversationId);

      expect(result).toEqual([]);
    });
  });
});
