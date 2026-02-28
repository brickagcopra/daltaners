import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderService } from '../order.service';
import { OrderRepository } from '../order.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: jest.Mocked<OrderRepository>;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockItems: Partial<OrderItemEntity>[] = [
    {
      id: 'item-uuid-1',
      order_id: 'order-uuid-1',
      product_id: 'product-uuid-1',
      variant_id: null,
      product_name: 'Rice 5kg',
      product_image_url: null,
      unit_price: 250,
      quantity: 2,
      total_price: 500,
      discount_amount: 0,
      special_instructions: null,
      substitution_product_id: null,
      status: 'pending',
    },
  ];

  const mockOrder: Partial<OrderEntity> = {
    id: 'order-uuid-1',
    order_number: 'BIR-2026-123456',
    customer_id: 'customer-uuid-1',
    store_id: 'store-uuid-1',
    store_location_id: 'location-uuid-1',
    status: 'pending',
    order_type: 'delivery',
    service_type: 'grocery',
    delivery_type: 'standard',
    scheduled_at: null,
    subtotal: 500,
    delivery_fee: 49,
    service_fee: 25,
    tax_amount: 60,
    discount_amount: 0,
    tip_amount: 0,
    total_amount: 634,
    payment_method: 'gcash',
    payment_status: 'pending',
    delivery_address: { street: '123 Rizal St', city: 'Manila' },
    delivery_instructions: null,
    substitution_policy: 'refund_only',
    coupon_code: null,
    customer_notes: null,
    cancellation_reason: null,
    estimated_delivery_at: null,
    actual_delivery_at: null,
    prepared_at: null,
    picked_up_at: null,
    metadata: {},
    created_at: new Date('2026-02-01T10:00:00Z'),
    updated_at: new Date('2026-02-01T10:00:00Z'),
    items: mockItems as OrderItemEntity[],
  };

  beforeEach(async () => {
    const mockOrderRepo = {
      createOrder: jest.fn(),
      findOrderById: jest.fn(),
      findOrderByNumber: jest.fn(),
      findOrders: jest.fn(),
      findOrdersByCustomerId: jest.fn(),
      findOrdersByStoreId: jest.fn(),
      updateOrderStatus: jest.fn(),
      updateOrder: jest.fn(),
      orderNumberExists: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getJson: jest.fn(),
      setJson: jest.fn(),
      getClient: jest.fn(),
    };

    const mockKafkaProducer = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderRepository, useValue: mockOrderRepo },
        { provide: RedisService, useValue: mockRedisService },
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepo = module.get(OrderRepository);
    redisService = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const createDto = {
      store_id: 'store-uuid-1',
      store_location_id: 'location-uuid-1',
      order_type: 'delivery' as const,
      service_type: 'grocery' as const,
      delivery_type: 'standard' as const,
      payment_method: 'gcash' as const,
      delivery_address: { street: '123 Rizal St', city: 'Manila' },
      items: [
        { product_id: 'product-uuid-1', quantity: 2 },
      ],
    };

    it('should create an order and publish ORDER_PLACED event', async () => {
      orderRepo.orderNumberExists.mockResolvedValue(false);
      orderRepo.createOrder.mockResolvedValue(mockOrder as OrderEntity);
      redisService.setJson.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.createOrder('customer-uuid-1', createDto as any);

      expect(result).toEqual(mockOrder);
      expect(orderRepo.createOrder).toHaveBeenCalled();
      expect(redisService.setJson).toHaveBeenCalledWith(
        `order:detail:${mockOrder.id}`,
        mockOrder,
        300,
      );
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.orders.events',
        'com.daltaners.orders.placed',
        expect.objectContaining({
          order_id: mockOrder.id,
          customer_id: 'customer-uuid-1',
          store_id: 'store-uuid-1',
        }),
        mockOrder.id,
      );
    });

    it('should set delivery_fee to 0 for pickup orders', async () => {
      const pickupDto = { ...createDto, order_type: 'pickup' as const };
      orderRepo.orderNumberExists.mockResolvedValue(false);
      orderRepo.createOrder.mockResolvedValue(mockOrder as OrderEntity);

      await service.createOrder('customer-uuid-1', pickupDto as any);

      const createCall = orderRepo.createOrder.mock.calls[0];
      expect(createCall[0]).toEqual(expect.objectContaining({ delivery_fee: 0 }));
    });

    it('should set delivery_fee based on delivery_type', async () => {
      const expressDto = { ...createDto, delivery_type: 'express' as const };
      orderRepo.orderNumberExists.mockResolvedValue(false);
      orderRepo.createOrder.mockResolvedValue(mockOrder as OrderEntity);

      await service.createOrder('customer-uuid-1', expressDto as any);

      const createCall = orderRepo.createOrder.mock.calls[0];
      expect(createCall[0]).toEqual(expect.objectContaining({ delivery_fee: 79 }));
    });

    it('should set default substitution_policy to refund_only', async () => {
      orderRepo.orderNumberExists.mockResolvedValue(false);
      orderRepo.createOrder.mockResolvedValue(mockOrder as OrderEntity);

      await service.createOrder('customer-uuid-1', createDto as any);

      const createCall = orderRepo.createOrder.mock.calls[0];
      expect(createCall[0]).toEqual(
        expect.objectContaining({ substitution_policy: 'refund_only' }),
      );
    });

    it('should throw BadRequestException when order number generation fails after max attempts', async () => {
      orderRepo.orderNumberExists.mockResolvedValue(true); // Always collides

      await expect(service.createOrder('customer-uuid-1', createDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOrder', () => {
    it('should return cached order when available', async () => {
      redisService.getJson.mockResolvedValue(mockOrder as OrderEntity);

      const result = await service.getOrder('order-uuid-1', 'customer-uuid-1', 'customer');

      expect(result).toEqual(mockOrder);
      expect(orderRepo.findOrderById).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache when not in Redis', async () => {
      redisService.getJson.mockResolvedValue(null);
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);

      const result = await service.getOrder('order-uuid-1', 'customer-uuid-1', 'customer');

      expect(result).toEqual(mockOrder);
      expect(orderRepo.findOrderById).toHaveBeenCalledWith('order-uuid-1');
      expect(redisService.setJson).toHaveBeenCalledWith(
        'order:detail:order-uuid-1',
        mockOrder,
        300,
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      redisService.getJson.mockResolvedValue(null);
      orderRepo.findOrderById.mockResolvedValue(null);

      await expect(service.getOrder('nonexistent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when customer accesses another customers order', async () => {
      redisService.getJson.mockResolvedValue(null);
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);

      await expect(
        service.getOrder('order-uuid-1', 'different-customer', 'customer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to access any order', async () => {
      redisService.getJson.mockResolvedValue(null);
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);

      const result = await service.getOrder('order-uuid-1', 'admin-uuid', 'admin');

      expect(result).toEqual(mockOrder);
    });

    it('should allow vendor_owner to access order', async () => {
      redisService.getJson.mockResolvedValue(null);
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);

      const result = await service.getOrder('order-uuid-1', 'vendor-uuid', 'vendor_owner');

      expect(result).toEqual(mockOrder);
    });
  });

  describe('getOrders', () => {
    it('should delegate to orderRepository.findOrders', async () => {
      const query = { page: 1, limit: 20 };
      const expected = { items: [mockOrder as OrderEntity], total: 1, page: 1, limit: 20, totalPages: 1 };
      orderRepo.findOrders.mockResolvedValue(expected);

      const result = await service.getOrders(query as any);

      expect(result).toEqual(expected);
      expect(orderRepo.findOrders).toHaveBeenCalledWith(query);
    });
  });

  describe('getCustomerOrders', () => {
    it('should delegate to orderRepository with cursor pagination', async () => {
      const expected = { items: [mockOrder as OrderEntity], nextCursor: null, hasMore: false };
      orderRepo.findOrdersByCustomerId.mockResolvedValue(expected);

      const result = await service.getCustomerOrders('customer-uuid-1', 20, undefined);

      expect(result).toEqual(expected);
      expect(orderRepo.findOrdersByCustomerId).toHaveBeenCalledWith(
        'customer-uuid-1',
        20,
        undefined,
      );
    });
  });

  describe('getVendorOrders', () => {
    it('should delegate to orderRepository.findOrdersByStoreId', async () => {
      const query = { page: 1, limit: 20 };
      const expected = { items: [mockOrder as OrderEntity], total: 1, page: 1, limit: 20, totalPages: 1 };
      orderRepo.findOrdersByStoreId.mockResolvedValue(expected);

      const result = await service.getVendorOrders('store-uuid-1', query as any, 'vendor-uuid');

      expect(result).toEqual(expected);
      expect(orderRepo.findOrdersByStoreId).toHaveBeenCalledWith('store-uuid-1', query);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a pending order', async () => {
      const cancelledOrder = { ...mockOrder, status: 'cancelled', cancellation_reason: 'Changed my mind' };
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue(cancelledOrder as OrderEntity);
      redisService.del.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.cancelOrder(
        'order-uuid-1',
        'customer-uuid-1',
        'customer',
        'Changed my mind',
      );

      expect(result.status).toBe('cancelled');
      expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        'cancelled',
        expect.objectContaining({
          cancellation_reason: 'Changed my mind',
          payment_status: 'cancelled',
        }),
      );
      expect(redisService.del).toHaveBeenCalledWith('order:detail:order-uuid-1');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.orders.events',
        'com.daltaners.orders.cancelled',
        expect.objectContaining({ order_id: cancelledOrder.id }),
        cancelledOrder.id,
      );
    });

    it('should set payment_status to refund_pending when payment was completed', async () => {
      const paidOrder = { ...mockOrder, payment_status: 'completed' };
      orderRepo.findOrderById.mockResolvedValue(paidOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue({
        ...paidOrder,
        status: 'cancelled',
        payment_status: 'refund_pending',
      } as OrderEntity);

      await service.cancelOrder('order-uuid-1', 'customer-uuid-1', 'customer');

      expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        'cancelled',
        expect.objectContaining({ payment_status: 'refund_pending' }),
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findOrderById.mockResolvedValue(null);

      await expect(
        service.cancelOrder('nonexistent', 'customer-uuid-1', 'customer'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order is not in cancellable status', async () => {
      const preparingOrder = { ...mockOrder, status: 'preparing' };
      orderRepo.findOrderById.mockResolvedValue(preparingOrder as OrderEntity);

      await expect(
        service.cancelOrder('order-uuid-1', 'customer-uuid-1', 'customer'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when customer cancels anothers order', async () => {
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);

      await expect(
        service.cancelOrder('order-uuid-1', 'other-customer', 'customer'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' };
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue(confirmedOrder as OrderEntity);
      redisService.del.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.updateStatus(
        'order-uuid-1',
        { status: 'confirmed' } as any,
        'vendor-uuid',
        'vendor_owner',
      );

      expect(result.status).toBe('confirmed');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.orders.events',
        'com.daltaners.orders.status_changed',
        expect.objectContaining({
          previous_status: 'pending',
          new_status: 'confirmed',
        }),
        confirmedOrder.id,
      );
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);

      await expect(
        service.updateStatus(
          'order-uuid-1',
          { status: 'delivered' } as any,
          'vendor-uuid',
          'vendor_owner',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findOrderById.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          'nonexistent',
          { status: 'confirmed' } as any,
          'vendor-uuid',
          'vendor_owner',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set prepared_at when status changes to ready', async () => {
      const confirmedOrder = { ...mockOrder, status: 'preparing' };
      orderRepo.findOrderById.mockResolvedValue(confirmedOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue({
        ...confirmedOrder,
        status: 'ready',
        prepared_at: new Date(),
      } as OrderEntity);

      await service.updateStatus(
        'order-uuid-1',
        { status: 'ready' } as any,
        'vendor-uuid',
        'vendor_owner',
      );

      expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        'ready',
        expect.objectContaining({ prepared_at: expect.any(Date) }),
      );
    });

    it('should set picked_up_at when status changes to picked_up', async () => {
      const readyOrder = { ...mockOrder, status: 'ready' };
      orderRepo.findOrderById.mockResolvedValue(readyOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue({
        ...readyOrder,
        status: 'picked_up',
      } as OrderEntity);

      await service.updateStatus(
        'order-uuid-1',
        { status: 'picked_up' } as any,
        'vendor-uuid',
        'vendor_owner',
      );

      expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        'picked_up',
        expect.objectContaining({ picked_up_at: expect.any(Date) }),
      );
    });

    it('should set actual_delivery_at when status changes to delivered', async () => {
      const inTransitOrder = { ...mockOrder, status: 'in_transit' };
      orderRepo.findOrderById.mockResolvedValue(inTransitOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue({
        ...inTransitOrder,
        status: 'delivered',
      } as OrderEntity);

      await service.updateStatus(
        'order-uuid-1',
        { status: 'delivered' } as any,
        'admin-uuid',
        'admin',
      );

      expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        'delivered',
        expect.objectContaining({ actual_delivery_at: expect.any(Date) }),
      );
    });

    it('should set payment_status to refunded when status changes to refunded', async () => {
      const deliveredOrder = { ...mockOrder, status: 'delivered' };
      orderRepo.findOrderById.mockResolvedValue(deliveredOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue({
        ...deliveredOrder,
        status: 'refunded',
      } as OrderEntity);

      await service.updateStatus(
        'order-uuid-1',
        { status: 'refunded' } as any,
        'admin-uuid',
        'admin',
      );

      expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        'refunded',
        expect.objectContaining({ payment_status: 'refunded' }),
      );
    });
  });

  describe('handlePaymentCompleted', () => {
    it('should confirm order when payment completes', async () => {
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue(null);
      redisService.del.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      await service.handlePaymentCompleted('order-uuid-1');

      expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        'confirmed',
        expect.objectContaining({ payment_status: 'completed' }),
      );
    });

    it('should skip if order not found', async () => {
      orderRepo.findOrderById.mockResolvedValue(null);

      await service.handlePaymentCompleted('nonexistent');

      expect(orderRepo.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('should skip if payment already completed (idempotent)', async () => {
      const paidOrder = { ...mockOrder, payment_status: 'completed' };
      orderRepo.findOrderById.mockResolvedValue(paidOrder as OrderEntity);

      await service.handlePaymentCompleted('order-uuid-1');

      expect(orderRepo.updateOrderStatus).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentFailed', () => {
    it('should cancel order when payment fails', async () => {
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue(null);
      redisService.del.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      await service.handlePaymentFailed('order-uuid-1');

      expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        'cancelled',
        expect.objectContaining({
          payment_status: 'failed',
          cancellation_reason: 'Payment failed',
        }),
      );
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.orders.events',
        'com.daltaners.orders.cancelled',
        expect.objectContaining({
          cancellation_reason: 'Payment failed',
        }),
        mockOrder.id,
      );
    });

    it('should skip if order not found', async () => {
      orderRepo.findOrderById.mockResolvedValue(null);

      await service.handlePaymentFailed('nonexistent');

      expect(orderRepo.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('should skip if order already cancelled', async () => {
      const cancelledOrder = { ...mockOrder, status: 'cancelled' };
      orderRepo.findOrderById.mockResolvedValue(cancelledOrder as OrderEntity);

      await service.handlePaymentFailed('order-uuid-1');

      expect(orderRepo.updateOrderStatus).not.toHaveBeenCalled();
    });
  });

  describe('handleDeliveryStatusUpdate', () => {
    it('should update order status based on delivery status mapping', async () => {
      const readyOrder = { ...mockOrder, status: 'ready' };
      orderRepo.findOrderById.mockResolvedValue(readyOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue(null);
      redisService.del.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      await service.handleDeliveryStatusUpdate('order-uuid-1', 'picked_up');

      expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        'picked_up',
        expect.objectContaining({ picked_up_at: expect.any(Date) }),
      );
    });

    it('should set actual_delivery_at when delivery is completed', async () => {
      const inTransitOrder = { ...mockOrder, status: 'in_transit' };
      orderRepo.findOrderById.mockResolvedValue(inTransitOrder as OrderEntity);
      orderRepo.updateOrderStatus.mockResolvedValue(null);

      await service.handleDeliveryStatusUpdate('order-uuid-1', 'delivered');

      expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        'delivered',
        expect.objectContaining({ actual_delivery_at: expect.any(Date) }),
      );
    });

    it('should skip unknown delivery statuses', async () => {
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);

      await service.handleDeliveryStatusUpdate('order-uuid-1', 'unknown_status');

      expect(orderRepo.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('should skip invalid transitions', async () => {
      // pending -> picked_up is not a valid transition
      orderRepo.findOrderById.mockResolvedValue(mockOrder as OrderEntity);

      await service.handleDeliveryStatusUpdate('order-uuid-1', 'picked_up');

      expect(orderRepo.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('should skip if order not found', async () => {
      orderRepo.findOrderById.mockResolvedValue(null);

      await service.handleDeliveryStatusUpdate('nonexistent', 'delivered');

      expect(orderRepo.updateOrderStatus).not.toHaveBeenCalled();
    });
  });
});
