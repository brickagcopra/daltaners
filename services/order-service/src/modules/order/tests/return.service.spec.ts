import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ReturnService } from '../return.service';
import { ReturnRepository } from '../return.repository';
import { OrderRepository } from '../order.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';

describe('ReturnService', () => {
  let service: ReturnService;
  let returnRepository: jest.Mocked<ReturnRepository>;
  let orderRepository: jest.Mocked<OrderRepository>;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockOrder = {
    id: 'order-uuid-1',
    order_number: 'ORD-001',
    customer_id: 'customer-uuid-1',
    store_id: 'store-uuid-1',
    status: 'delivered',
    actual_delivery_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
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
      {
        id: 'item-uuid-2',
        order_id: 'order-uuid-1',
        product_id: 'product-uuid-2',
        product_name: 'Test Product 2',
        unit_price: 50,
        quantity: 2,
        total_price: 100,
        status: 'confirmed',
      },
    ],
  };

  const mockReturnRequest = {
    id: 'return-uuid-1',
    order_id: 'order-uuid-1',
    customer_id: 'customer-uuid-1',
    store_id: 'store-uuid-1',
    request_number: 'RET-ABC-1234',
    status: 'pending',
    reason_category: 'defective',
    reason_details: 'Product is broken',
    evidence_urls: ['https://example.com/photo.jpg'],
    requested_resolution: 'refund',
    refund_amount: 100,
    vendor_response: null,
    vendor_responded_at: null,
    admin_notes: null,
    created_at: new Date(),
    updated_at: new Date(),
    items: [
      {
        id: 'return-item-uuid-1',
        return_request_id: 'return-uuid-1',
        order_item_id: 'item-uuid-1',
        product_id: 'product-uuid-1',
        product_name: 'Test Product',
        quantity: 1,
        unit_price: 100,
        refund_amount: 100,
        condition: 'defective',
        restockable: false,
        inventory_adjusted: false,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnService,
        {
          provide: ReturnRepository,
          useValue: {
            createReturnRequest: jest.fn(),
            findById: jest.fn(),
            findByOrderId: jest.fn(),
            findByCustomerId: jest.fn(),
            findByStoreId: jest.fn(),
            findAllAdmin: jest.fn(),
            updateReturnRequest: jest.fn(),
            updateReturnItems: jest.fn(),
            requestNumberExists: jest.fn(),
            getReturnStats: jest.fn(),
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
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getJson: jest.fn(),
            setJson: jest.fn(),
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

    service = module.get<ReturnService>(ReturnService);
    returnRepository = module.get(ReturnRepository);
    orderRepository = module.get(OrderRepository);
    redisService = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  describe('createReturnRequest', () => {
    const createDto = {
      order_id: 'order-uuid-1',
      reason_category: 'defective',
      reason_details: 'Product is broken',
      evidence_urls: ['https://example.com/photo.jpg'],
      requested_resolution: 'refund',
      items: [
        { order_item_id: 'item-uuid-1', quantity: 1, condition: 'defective' },
      ],
    };

    it('should create a return request successfully', async () => {
      orderRepository.findOrderById.mockResolvedValue(mockOrder as any);
      returnRepository.findByOrderId.mockResolvedValue([]);
      returnRepository.requestNumberExists.mockResolvedValue(false);
      returnRepository.createReturnRequest.mockResolvedValue(mockReturnRequest as any);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.createReturnRequest('customer-uuid-1', createDto as any);

      expect(result).toBeDefined();
      expect(result.request_number).toBe('RET-ABC-1234');
      expect(returnRepository.createReturnRequest).toHaveBeenCalled();
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.returns.events',
        'com.daltaners.returns.created',
        expect.objectContaining({
          return_request_id: 'return-uuid-1',
          order_id: 'order-uuid-1',
        }),
        'return-uuid-1',
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOrderById.mockResolvedValue(null);

      await expect(
        service.createReturnRequest('customer-uuid-1', createDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when customer does not own order', async () => {
      orderRepository.findOrderById.mockResolvedValue(mockOrder as any);

      await expect(
        service.createReturnRequest('different-customer', createDto as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when order is not delivered', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending' };
      orderRepository.findOrderById.mockResolvedValue(pendingOrder as any);

      await expect(
        service.createReturnRequest('customer-uuid-1', createDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when return window expired', async () => {
      const oldOrder = {
        ...mockOrder,
        actual_delivery_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      };
      orderRepository.findOrderById.mockResolvedValue(oldOrder as any);

      await expect(
        service.createReturnRequest('customer-uuid-1', createDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when active return exists', async () => {
      orderRepository.findOrderById.mockResolvedValue(mockOrder as any);
      returnRepository.findByOrderId.mockResolvedValue([mockReturnRequest as any]);

      await expect(
        service.createReturnRequest('customer-uuid-1', createDto as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid order item', async () => {
      orderRepository.findOrderById.mockResolvedValue(mockOrder as any);
      returnRepository.findByOrderId.mockResolvedValue([]);

      const invalidDto = {
        ...createDto,
        items: [{ order_item_id: 'non-existent-item', quantity: 1 }],
      };

      await expect(
        service.createReturnRequest('customer-uuid-1', invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when return quantity exceeds order quantity', async () => {
      orderRepository.findOrderById.mockResolvedValue(mockOrder as any);
      returnRepository.findByOrderId.mockResolvedValue([]);

      const invalidDto = {
        ...createDto,
        items: [{ order_item_id: 'item-uuid-1', quantity: 10, condition: 'defective' }],
      };

      await expect(
        service.createReturnRequest('customer-uuid-1', invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getReturnById', () => {
    it('should return cached return request', async () => {
      redisService.getJson.mockResolvedValue(mockReturnRequest);

      const result = await service.getReturnById('return-uuid-1', 'customer-uuid-1', 'customer');

      expect(result).toEqual(mockReturnRequest);
      expect(returnRepository.findById).not.toHaveBeenCalled();
    });

    it('should fetch from DB when not cached', async () => {
      redisService.getJson.mockResolvedValue(null);
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);

      const result = await service.getReturnById('return-uuid-1', 'customer-uuid-1', 'customer');

      expect(result).toEqual(mockReturnRequest);
      expect(redisService.setJson).toHaveBeenCalled();
    });

    it('should throw NotFoundException when not found', async () => {
      redisService.getJson.mockResolvedValue(null);
      returnRepository.findById.mockResolvedValue(null);

      await expect(
        service.getReturnById('non-existent', undefined, undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when customer accesses another customer return', async () => {
      redisService.getJson.mockResolvedValue(null);
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);

      await expect(
        service.getReturnById('return-uuid-1', 'different-customer', 'customer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to access any return', async () => {
      redisService.getJson.mockResolvedValue(null);
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);

      const result = await service.getReturnById('return-uuid-1', 'admin-uuid', 'admin');
      expect(result).toEqual(mockReturnRequest);
    });
  });

  describe('cancelReturn', () => {
    it('should cancel a pending return', async () => {
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);
      returnRepository.updateReturnRequest.mockResolvedValue({
        ...mockReturnRequest,
        status: 'cancelled',
      } as any);

      const result = await service.cancelReturn('return-uuid-1', 'customer-uuid-1');

      expect(result.status).toBe('cancelled');
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when cancelling another customer return', async () => {
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);

      await expect(
        service.cancelReturn('return-uuid-1', 'different-customer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when return is not pending', async () => {
      returnRepository.findById.mockResolvedValue({
        ...mockReturnRequest,
        status: 'approved',
      } as any);

      await expect(
        service.cancelReturn('return-uuid-1', 'customer-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveReturn', () => {
    it('should approve a pending return', async () => {
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);
      returnRepository.updateReturnRequest.mockResolvedValue({
        ...mockReturnRequest,
        status: 'approved',
      } as any);

      const result = await service.approveReturn('return-uuid-1', 'store-uuid-1', {
        vendor_response: 'Approved for refund',
      });

      expect(result.status).toBe('approved');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.returns.events',
        'com.daltaners.returns.approved',
        expect.objectContaining({ return_request_id: 'return-uuid-1' }),
        'return-uuid-1',
      );
    });

    it('should throw ForbiddenException when store does not match', async () => {
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);

      await expect(
        service.approveReturn('return-uuid-1', 'different-store', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      returnRepository.findById.mockResolvedValue({
        ...mockReturnRequest,
        status: 'cancelled',
      } as any);

      await expect(
        service.approveReturn('return-uuid-1', 'store-uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow custom refund amount', async () => {
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);
      returnRepository.updateReturnRequest.mockResolvedValue({
        ...mockReturnRequest,
        status: 'approved',
        refund_amount: 50,
      } as any);

      await service.approveReturn('return-uuid-1', 'store-uuid-1', {
        refund_amount: 50,
      });

      expect(returnRepository.updateReturnRequest).toHaveBeenCalledWith(
        'return-uuid-1',
        expect.objectContaining({ refund_amount: 50 }),
      );
    });
  });

  describe('denyReturn', () => {
    it('should deny a pending return', async () => {
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);
      returnRepository.updateReturnRequest.mockResolvedValue({
        ...mockReturnRequest,
        status: 'denied',
      } as any);

      const result = await service.denyReturn('return-uuid-1', 'store-uuid-1', {
        vendor_response: 'Item was used',
      });

      expect(result.status).toBe('denied');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.returns.events',
        'com.daltaners.returns.denied',
        expect.objectContaining({ return_request_id: 'return-uuid-1' }),
        'return-uuid-1',
      );
    });
  });

  describe('markReceived', () => {
    it('should mark approved return as received', async () => {
      const approvedReturn = { ...mockReturnRequest, status: 'approved' };
      returnRepository.findById.mockResolvedValue(approvedReturn as any);
      returnRepository.updateReturnRequest.mockResolvedValue({
        ...approvedReturn,
        status: 'received',
      } as any);

      const result = await service.markReceived('return-uuid-1', 'store-uuid-1', {
        restockable: true,
      });

      expect(result.status).toBe('received');
      expect(returnRepository.updateReturnItems).toHaveBeenCalledWith(
        'return-uuid-1',
        { restockable: true },
      );
    });

    it('should throw BadRequestException when status is not approved', async () => {
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);

      await expect(
        service.markReceived('return-uuid-1', 'store-uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('escalateReturn', () => {
    it('should escalate a pending return', async () => {
      returnRepository.findById.mockResolvedValue(mockReturnRequest as any);
      returnRepository.updateReturnRequest.mockResolvedValue({
        ...mockReturnRequest,
        status: 'escalated',
      } as any);

      const result = await service.escalateReturn('return-uuid-1', {
        admin_notes: 'Vendor not responding',
      });

      expect(result.status).toBe('escalated');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.returns.events',
        'com.daltaners.returns.escalated',
        expect.objectContaining({ return_request_id: 'return-uuid-1' }),
        'return-uuid-1',
      );
    });

    it('should throw NotFoundException when return not found', async () => {
      returnRepository.findById.mockResolvedValue(null);

      await expect(
        service.escalateReturn('non-existent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('overrideApprove', () => {
    it('should override approve a denied return', async () => {
      const deniedReturn = { ...mockReturnRequest, status: 'denied' };
      returnRepository.findById.mockResolvedValue(deniedReturn as any);
      returnRepository.updateReturnRequest.mockResolvedValue({
        ...deniedReturn,
        status: 'approved',
      } as any);

      const result = await service.overrideApprove('return-uuid-1', {
        admin_notes: 'Customer provided valid evidence',
        refund_amount: 80,
      });

      expect(result.status).toBe('approved');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.returns.events',
        'com.daltaners.returns.approved',
        expect.objectContaining({ override: true }),
        'return-uuid-1',
      );
    });

    it('should throw BadRequestException for already refunded return', async () => {
      const refundedReturn = { ...mockReturnRequest, status: 'refunded' };
      returnRepository.findById.mockResolvedValue(refundedReturn as any);

      await expect(
        service.overrideApprove('return-uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('overrideDeny', () => {
    it('should override deny an approved return', async () => {
      const approvedReturn = { ...mockReturnRequest, status: 'approved' };
      returnRepository.findById.mockResolvedValue(approvedReturn as any);
      returnRepository.updateReturnRequest.mockResolvedValue({
        ...approvedReturn,
        status: 'denied',
      } as any);

      const result = await service.overrideDeny('return-uuid-1', {
        admin_notes: 'Evidence was falsified',
      });

      expect(result.status).toBe('denied');
    });
  });

  describe('getCustomerReturns', () => {
    it('should return paginated customer returns', async () => {
      returnRepository.findByCustomerId.mockResolvedValue({
        items: [mockReturnRequest as any],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.getCustomerReturns('customer-uuid-1', {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getVendorReturns', () => {
    it('should return paginated vendor store returns', async () => {
      returnRepository.findByStoreId.mockResolvedValue({
        items: [mockReturnRequest as any],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.getVendorReturns('store-uuid-1', {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getAdminReturns', () => {
    it('should return paginated admin returns', async () => {
      returnRepository.findAllAdmin.mockResolvedValue({
        items: [mockReturnRequest as any],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.getAdminReturns({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getReturnStats', () => {
    it('should return return statistics', async () => {
      returnRepository.getReturnStats.mockResolvedValue({
        totalReturns: 10,
        pendingReturns: 3,
        approvedReturns: 4,
        deniedReturns: 2,
        escalatedReturns: 1,
        totalRefundAmount: 5000,
        returnsByStatus: [{ status: 'pending', count: 3 }],
        returnsByReason: [{ reason_category: 'defective', count: 5 }],
      });

      const result = await service.getReturnStats();

      expect(result.success).toBe(true);
      expect(result.data.totalReturns).toBe(10);
    });
  });
});
