import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DisputeService } from '../dispute.service';
import { DisputeRepository } from '../dispute.repository';
import { OrderRepository } from '../order.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';

describe('DisputeService', () => {
  let service: DisputeService;
  let disputeRepository: jest.Mocked<DisputeRepository>;
  let orderRepository: jest.Mocked<OrderRepository>;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockOrder = {
    id: 'order-uuid-1',
    order_number: 'ORD-001',
    customer_id: 'customer-uuid-1',
    store_id: 'store-uuid-1',
    status: 'delivered',
    actual_delivery_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updated_at: new Date(),
    items: [
      {
        id: 'item-uuid-1',
        order_id: 'order-uuid-1',
        product_id: 'product-uuid-1',
        product_name: 'Test Product',
        unit_price: 100,
        quantity: 3,
        total_price: 300,
        status: 'confirmed',
      },
    ],
  };

  const mockDispute = {
    id: 'dispute-uuid-1',
    dispute_number: 'DIS-ABC-1234',
    order_id: 'order-uuid-1',
    return_request_id: null,
    customer_id: 'customer-uuid-1',
    store_id: 'store-uuid-1',
    category: 'damaged_item',
    status: 'open',
    priority: 'medium',
    subject: 'Damaged product received',
    description: 'The product arrived broken',
    evidence_urls: ['https://example.com/photo.jpg'],
    requested_resolution: 'refund',
    resolution_type: null,
    resolution_amount: 0,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    escalated_at: null,
    escalation_reason: null,
    vendor_response_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    admin_assigned_to: null,
    created_at: new Date(),
    updated_at: new Date(),
    messages: [],
    order: mockOrder,
  };

  const mockMessage = {
    id: 'message-uuid-1',
    dispute_id: 'dispute-uuid-1',
    sender_id: 'customer-uuid-1',
    sender_role: 'customer',
    message: 'The product arrived broken',
    attachments: [],
    is_internal: false,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeService,
        {
          provide: DisputeRepository,
          useValue: {
            createDispute: jest.fn(),
            findById: jest.fn(),
            findByIdWithPublicMessages: jest.fn(),
            findByDisputeNumber: jest.fn(),
            findByOrderId: jest.fn(),
            findByCustomerId: jest.fn(),
            findByStoreId: jest.fn(),
            findAllAdmin: jest.fn(),
            updateDispute: jest.fn(),
            addMessage: jest.fn(),
            getMessages: jest.fn(),
            disputeNumberExists: jest.fn(),
            findOverdueDisputes: jest.fn(),
            getDisputeStats: jest.fn(),
          },
        },
        {
          provide: OrderRepository,
          useValue: {
            findOrderById: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getJson: jest.fn(),
            setJson: jest.fn(),
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

    service = module.get<DisputeService>(DisputeService);
    disputeRepository = module.get(DisputeRepository);
    orderRepository = module.get(OrderRepository);
    redisService = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── createDispute ──

  describe('createDispute', () => {
    const createDto = {
      order_id: 'order-uuid-1',
      category: 'damaged_item',
      subject: 'Damaged product received',
      description: 'The product arrived broken',
      evidence_urls: ['https://example.com/photo.jpg'],
      requested_resolution: 'refund',
    };

    it('should create a dispute successfully', async () => {
      orderRepository.findOrderById.mockResolvedValue(mockOrder as any);
      disputeRepository.findByOrderId.mockResolvedValue([]);
      disputeRepository.disputeNumberExists.mockResolvedValue(false);
      disputeRepository.createDispute.mockResolvedValue(mockDispute as any);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.createDispute('customer-uuid-1', createDto);

      expect(result).toEqual(mockDispute);
      expect(disputeRepository.createDispute).toHaveBeenCalled();
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.disputes.events',
        'com.daltaners.disputes.created',
        expect.objectContaining({
          dispute_id: mockDispute.id,
          order_id: 'order-uuid-1',
          category: 'damaged_item',
        }),
        mockDispute.id,
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOrderById.mockResolvedValue(null);

      await expect(service.createDispute('customer-uuid-1', createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when order belongs to another customer', async () => {
      orderRepository.findOrderById.mockResolvedValue(mockOrder as any);

      await expect(service.createDispute('other-customer', createDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when active dispute exists', async () => {
      orderRepository.findOrderById.mockResolvedValue(mockOrder as any);
      disputeRepository.findByOrderId.mockResolvedValue([mockDispute as any]);

      await expect(service.createDispute('customer-uuid-1', createDto)).rejects.toThrow(ConflictException);
    });

    it('should set priority based on category', async () => {
      orderRepository.findOrderById.mockResolvedValue(mockOrder as any);
      disputeRepository.findByOrderId.mockResolvedValue([]);
      disputeRepository.disputeNumberExists.mockResolvedValue(false);
      disputeRepository.createDispute.mockResolvedValue(mockDispute as any);

      await service.createDispute('customer-uuid-1', {
        ...createDto,
        category: 'unauthorized_charge',
      });

      expect(disputeRepository.createDispute).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'urgent' }),
        expect.anything(),
      );
    });

    it('should set vendor response deadline to 48 hours', async () => {
      orderRepository.findOrderById.mockResolvedValue(mockOrder as any);
      disputeRepository.findByOrderId.mockResolvedValue([]);
      disputeRepository.disputeNumberExists.mockResolvedValue(false);
      disputeRepository.createDispute.mockResolvedValue(mockDispute as any);

      await service.createDispute('customer-uuid-1', createDto);

      const callArgs = disputeRepository.createDispute.mock.calls[0][0];
      const deadline = new Date(callArgs.vendor_response_deadline!);
      const now = new Date();
      const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(diffHours).toBeGreaterThan(47);
      expect(diffHours).toBeLessThanOrEqual(48.1);
    });
  });

  // ── getDisputeById ──

  describe('getDisputeById', () => {
    it('should return cached dispute if available', async () => {
      redisService.getJson.mockResolvedValue(mockDispute as any);

      const result = await service.getDisputeById('dispute-uuid-1', 'customer-uuid-1', 'customer');

      expect(result).toEqual(mockDispute);
      expect(disputeRepository.findById).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache when not cached (admin)', async () => {
      redisService.getJson.mockResolvedValue(null);
      disputeRepository.findById.mockResolvedValue(mockDispute as any);

      const result = await service.getDisputeById('dispute-uuid-1', undefined, 'admin');

      expect(result).toEqual(mockDispute);
      expect(disputeRepository.findById).toHaveBeenCalledWith('dispute-uuid-1');
      expect(redisService.setJson).toHaveBeenCalled();
    });

    it('should fetch public messages only for non-admin', async () => {
      redisService.getJson.mockResolvedValue(null);
      disputeRepository.findByIdWithPublicMessages.mockResolvedValue(mockDispute as any);

      await service.getDisputeById('dispute-uuid-1', 'customer-uuid-1', 'customer');

      expect(disputeRepository.findByIdWithPublicMessages).toHaveBeenCalledWith('dispute-uuid-1');
    });

    it('should throw NotFoundException when dispute not found', async () => {
      redisService.getJson.mockResolvedValue(null);
      disputeRepository.findByIdWithPublicMessages.mockResolvedValue(null);

      await expect(service.getDisputeById('non-existent', 'customer-uuid-1', 'customer')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized customer', async () => {
      redisService.getJson.mockResolvedValue(mockDispute as any);

      await expect(service.getDisputeById('dispute-uuid-1', 'other-customer', 'customer')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── addCustomerMessage ──

  describe('addCustomerMessage', () => {
    it('should add a message successfully', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);
      disputeRepository.addMessage.mockResolvedValue(mockMessage as any);
      redisService.del.mockResolvedValue(undefined);

      const result = await service.addCustomerMessage('dispute-uuid-1', 'customer-uuid-1', {
        message: 'Follow up message',
      });

      expect(result).toEqual(mockMessage);
      expect(disputeRepository.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          dispute_id: 'dispute-uuid-1',
          sender_id: 'customer-uuid-1',
          sender_role: 'customer',
        }),
      );
    });

    it('should update status to customer_reply when vendor had responded', async () => {
      const disputeWithVendorResponse = { ...mockDispute, status: 'vendor_response' };
      disputeRepository.findById.mockResolvedValue(disputeWithVendorResponse as any);
      disputeRepository.addMessage.mockResolvedValue(mockMessage as any);
      disputeRepository.updateDispute.mockResolvedValue(disputeWithVendorResponse as any);

      await service.addCustomerMessage('dispute-uuid-1', 'customer-uuid-1', {
        message: 'My reply',
      });

      expect(disputeRepository.updateDispute).toHaveBeenCalledWith('dispute-uuid-1', { status: 'customer_reply' });
    });

    it('should throw ForbiddenException for wrong customer', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);

      await expect(
        service.addCustomerMessage('dispute-uuid-1', 'other-customer', { message: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for resolved dispute', async () => {
      const resolvedDispute = { ...mockDispute, status: 'resolved' };
      disputeRepository.findById.mockResolvedValue(resolvedDispute as any);

      await expect(
        service.addCustomerMessage('dispute-uuid-1', 'customer-uuid-1', { message: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── customerEscalate ──

  describe('customerEscalate', () => {
    it('should escalate a dispute successfully', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);
      disputeRepository.updateDispute.mockResolvedValue({ ...mockDispute, status: 'escalated' } as any);
      disputeRepository.addMessage.mockResolvedValue(mockMessage as any);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.customerEscalate('dispute-uuid-1', 'customer-uuid-1', {
        escalation_reason: 'No response from vendor',
      });

      expect(result.status).toBe('escalated');
      expect(disputeRepository.updateDispute).toHaveBeenCalledWith('dispute-uuid-1', expect.objectContaining({
        status: 'escalated',
      }));
    });

    it('should throw ForbiddenException for wrong customer', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);

      await expect(
        service.customerEscalate('dispute-uuid-1', 'other-customer', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const resolvedDispute = { ...mockDispute, status: 'resolved' };
      disputeRepository.findById.mockResolvedValue(resolvedDispute as any);

      await expect(
        service.customerEscalate('dispute-uuid-1', 'customer-uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── vendorRespond ──

  describe('vendorRespond', () => {
    it('should add vendor response and update status', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);
      disputeRepository.addMessage.mockResolvedValue(mockMessage as any);
      disputeRepository.updateDispute.mockResolvedValue({ ...mockDispute, status: 'vendor_response' } as any);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.vendorRespond('dispute-uuid-1', 'store-uuid-1', 'vendor-user-1', {
        message: 'We apologize for the inconvenience',
      });

      expect(disputeRepository.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sender_role: 'vendor',
          message: 'We apologize for the inconvenience',
        }),
      );
      expect(disputeRepository.updateDispute).toHaveBeenCalledWith('dispute-uuid-1', { status: 'vendor_response' });
    });

    it('should throw ForbiddenException for wrong store', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);

      await expect(
        service.vendorRespond('dispute-uuid-1', 'wrong-store', 'vendor-user-1', { message: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for resolved dispute', async () => {
      const resolvedDispute = { ...mockDispute, status: 'resolved' };
      disputeRepository.findById.mockResolvedValue(resolvedDispute as any);

      await expect(
        service.vendorRespond('dispute-uuid-1', 'store-uuid-1', 'vendor-user-1', { message: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── assignDispute ──

  describe('assignDispute', () => {
    it('should assign dispute to admin', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);
      disputeRepository.updateDispute.mockResolvedValue({ ...mockDispute, admin_assigned_to: 'admin-uuid-1' } as any);
      disputeRepository.addMessage.mockResolvedValue(mockMessage as any);

      const result = await service.assignDispute('dispute-uuid-1', { admin_id: 'admin-uuid-1' });

      expect(disputeRepository.updateDispute).toHaveBeenCalledWith('dispute-uuid-1', expect.objectContaining({
        admin_assigned_to: 'admin-uuid-1',
      }));
    });

    it('should throw BadRequestException for resolved dispute', async () => {
      const resolvedDispute = { ...mockDispute, status: 'resolved' };
      disputeRepository.findById.mockResolvedValue(resolvedDispute as any);

      await expect(
        service.assignDispute('dispute-uuid-1', { admin_id: 'admin-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── resolveDispute ──

  describe('resolveDispute', () => {
    it('should resolve a dispute successfully', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);
      disputeRepository.updateDispute.mockResolvedValue({ ...mockDispute, status: 'resolved', resolution_type: 'refund' } as any);
      disputeRepository.addMessage.mockResolvedValue(mockMessage as any);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.resolveDispute('dispute-uuid-1', 'admin-uuid-1', {
        resolution_type: 'refund',
        resolution_amount: 300,
        resolution_notes: 'Full refund approved',
      });

      expect(disputeRepository.updateDispute).toHaveBeenCalledWith('dispute-uuid-1', expect.objectContaining({
        status: 'resolved',
        resolution_type: 'refund',
        resolution_amount: 300,
        resolved_by: 'admin-uuid-1',
      }));
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.disputes.events',
        'com.daltaners.disputes.resolved',
        expect.objectContaining({
          resolution_type: 'refund',
          resolution_amount: 300,
        }),
        'dispute-uuid-1',
      );
    });

    it('should throw BadRequestException if already resolved', async () => {
      const resolvedDispute = { ...mockDispute, status: 'resolved' };
      disputeRepository.findById.mockResolvedValue(resolvedDispute as any);

      await expect(
        service.resolveDispute('dispute-uuid-1', 'admin-uuid-1', {
          resolution_type: 'refund',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── closeDispute ──

  describe('closeDispute', () => {
    it('should close a dispute successfully', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);
      disputeRepository.updateDispute.mockResolvedValue({ ...mockDispute, status: 'closed' } as any);
      disputeRepository.addMessage.mockResolvedValue(mockMessage as any);

      const result = await service.closeDispute('dispute-uuid-1', 'admin-uuid-1');

      expect(result.status).toBe('closed');
      expect(disputeRepository.updateDispute).toHaveBeenCalledWith('dispute-uuid-1', { status: 'closed' });
    });

    it('should throw BadRequestException if already closed', async () => {
      const closedDispute = { ...mockDispute, status: 'closed' };
      disputeRepository.findById.mockResolvedValue(closedDispute as any);

      await expect(service.closeDispute('dispute-uuid-1', 'admin-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── autoEscalateOverdueDisputes ──

  describe('autoEscalateOverdueDisputes', () => {
    it('should auto-escalate overdue disputes', async () => {
      const overdueDispute1 = { ...mockDispute, id: 'overdue-1', dispute_number: 'DIS-OVD-001' };
      const overdueDispute2 = { ...mockDispute, id: 'overdue-2', dispute_number: 'DIS-OVD-002' };
      disputeRepository.findOverdueDisputes.mockResolvedValue([overdueDispute1 as any, overdueDispute2 as any]);
      disputeRepository.updateDispute.mockResolvedValue(overdueDispute1 as any);
      disputeRepository.addMessage.mockResolvedValue(mockMessage as any);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const count = await service.autoEscalateOverdueDisputes();

      expect(count).toBe(2);
      expect(disputeRepository.updateDispute).toHaveBeenCalledTimes(2);
      expect(kafkaProducer.publish).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no overdue disputes', async () => {
      disputeRepository.findOverdueDisputes.mockResolvedValue([]);

      const count = await service.autoEscalateOverdueDisputes();

      expect(count).toBe(0);
      expect(disputeRepository.updateDispute).not.toHaveBeenCalled();
    });

    it('should continue processing when one dispute fails', async () => {
      const dispute1 = { ...mockDispute, id: 'overdue-1', dispute_number: 'DIS-OVD-001' };
      const dispute2 = { ...mockDispute, id: 'overdue-2', dispute_number: 'DIS-OVD-002' };
      disputeRepository.findOverdueDisputes.mockResolvedValue([dispute1 as any, dispute2 as any]);
      disputeRepository.updateDispute
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(dispute2 as any);
      disputeRepository.addMessage.mockResolvedValue(mockMessage as any);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const count = await service.autoEscalateOverdueDisputes();

      expect(count).toBe(1);
    });
  });

  // ── getDisputeMessages ──

  describe('getDisputeMessages', () => {
    it('should return messages with internal for admin', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);
      disputeRepository.getMessages.mockResolvedValue([mockMessage as any]);

      await service.getDisputeMessages('dispute-uuid-1', 'admin-1', 'admin');

      expect(disputeRepository.getMessages).toHaveBeenCalledWith('dispute-uuid-1', true);
    });

    it('should return messages without internal for customer', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);
      disputeRepository.getMessages.mockResolvedValue([mockMessage as any]);

      await service.getDisputeMessages('dispute-uuid-1', 'customer-uuid-1', 'customer');

      expect(disputeRepository.getMessages).toHaveBeenCalledWith('dispute-uuid-1', false);
    });
  });

  // ── getCustomerDisputes ──

  describe('getCustomerDisputes', () => {
    it('should return paginated disputes for customer', async () => {
      disputeRepository.findByCustomerId.mockResolvedValue({
        items: [mockDispute as any],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.getCustomerDisputes('customer-uuid-1', {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  // ── getVendorDisputes ──

  describe('getVendorDisputes', () => {
    it('should return paginated disputes for vendor store', async () => {
      disputeRepository.findByStoreId.mockResolvedValue({
        items: [mockDispute as any],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.getVendorDisputes('store-uuid-1', {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  // ── getAdminDisputes ──

  describe('getAdminDisputes', () => {
    it('should return paginated disputes for admin', async () => {
      disputeRepository.findAllAdmin.mockResolvedValue({
        items: [mockDispute as any],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.getAdminDisputes({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  // ── getDisputeStats ──

  describe('getDisputeStats', () => {
    it('should return dispute statistics', async () => {
      const mockStats = {
        totalDisputes: 10,
        openDisputes: 3,
        escalatedDisputes: 2,
        resolvedDisputes: 4,
        closedDisputes: 1,
        totalResolutionAmount: 5000,
        disputesByStatus: [{ status: 'open', count: 3 }],
        disputesByCategory: [{ category: 'damaged_item', count: 5 }],
        disputesByPriority: [{ priority: 'medium', count: 6 }],
      };
      disputeRepository.getDisputeStats.mockResolvedValue(mockStats);

      const result = await service.getDisputeStats();

      expect(result.success).toBe(true);
      expect(result.data.totalDisputes).toBe(10);
    });
  });

  // ── adminEscalate ──

  describe('adminEscalate', () => {
    it('should escalate a dispute by admin', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);
      disputeRepository.updateDispute.mockResolvedValue({ ...mockDispute, status: 'escalated' } as any);
      disputeRepository.addMessage.mockResolvedValue(mockMessage as any);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.adminEscalate('dispute-uuid-1', 'admin-uuid-1', {
        escalation_reason: 'Needs senior review',
      });

      expect(result.status).toBe('escalated');
    });
  });

  // ── addAdminMessage ──

  describe('addAdminMessage', () => {
    it('should add admin message with internal flag', async () => {
      disputeRepository.findById.mockResolvedValue(mockDispute as any);
      disputeRepository.addMessage.mockResolvedValue({
        ...mockMessage,
        sender_role: 'admin',
        is_internal: true,
      } as any);

      const result = await service.addAdminMessage('dispute-uuid-1', 'admin-uuid-1', {
        message: 'Internal note',
        is_internal: true,
      });

      expect(disputeRepository.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sender_role: 'admin',
          is_internal: true,
        }),
      );
    });
  });
});
