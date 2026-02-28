import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from '../order.controller';
import { OrderService } from '../order.service';
import { OrderEntity } from '../entities/order.entity';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: jest.Mocked<OrderService>;

  const mockOrder: Partial<OrderEntity> = {
    id: 'order-uuid-1',
    order_number: 'BIR-2026-123456',
    customer_id: 'customer-uuid-1',
    store_id: 'store-uuid-1',
    status: 'pending',
    total_amount: 634,
    items: [],
  };

  beforeEach(async () => {
    const mockOrderService = {
      createOrder: jest.fn(),
      getOrder: jest.fn(),
      getOrders: jest.fn(),
      getCustomerOrders: jest.fn(),
      getVendorOrders: jest.fn(),
      cancelOrder: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: mockOrderService }],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should call orderService.createOrder with userId and dto', async () => {
      const dto = {
        store_id: 'store-uuid-1',
        items: [{ product_id: 'p1', quantity: 1 }],
      };
      orderService.createOrder.mockResolvedValue(mockOrder as OrderEntity);

      const result = await controller.createOrder('customer-uuid-1', dto as any);

      expect(result).toEqual(mockOrder);
      expect(orderService.createOrder).toHaveBeenCalledWith('customer-uuid-1', dto);
    });
  });

  describe('getOrders', () => {
    it('should call orderService.getOrders with query params', async () => {
      const query = { page: 1, limit: 20 };
      const expected = { items: [mockOrder], total: 1, page: 1, limit: 20, totalPages: 1 };
      orderService.getOrders.mockResolvedValue(expected as any);

      const result = await controller.getOrders(query as any);

      expect(result).toEqual(expected);
      expect(orderService.getOrders).toHaveBeenCalledWith(query);
    });
  });

  describe('getMyOrders', () => {
    it('should call orderService.getCustomerOrders with userId', async () => {
      const expected = { items: [mockOrder], nextCursor: null, hasMore: false };
      orderService.getCustomerOrders.mockResolvedValue(expected as any);

      const result = await controller.getMyOrders('customer-uuid-1', 20, undefined);

      expect(result).toEqual(expected);
      expect(orderService.getCustomerOrders).toHaveBeenCalledWith(
        'customer-uuid-1',
        20,
        undefined,
      );
    });

    it('should default limit to 20 when not provided', async () => {
      orderService.getCustomerOrders.mockResolvedValue({ items: [], nextCursor: null, hasMore: false } as any);

      await controller.getMyOrders('customer-uuid-1', undefined, undefined);

      expect(orderService.getCustomerOrders).toHaveBeenCalledWith(
        'customer-uuid-1',
        20,
        undefined,
      );
    });
  });

  describe('getVendorOrders', () => {
    it('should call orderService.getVendorOrders with storeId and query', async () => {
      const query = { page: 1, limit: 20 };
      const expected = { items: [mockOrder], total: 1, page: 1, limit: 20, totalPages: 1 };
      orderService.getVendorOrders.mockResolvedValue(expected as any);

      const result = await controller.getVendorOrders('store-uuid-1', query as any, 'vendor-uuid');

      expect(result).toEqual(expected);
      expect(orderService.getVendorOrders).toHaveBeenCalledWith(
        'store-uuid-1',
        query,
        'vendor-uuid',
      );
    });
  });

  describe('getOrder', () => {
    it('should call orderService.getOrder with id, userId, and role', async () => {
      orderService.getOrder.mockResolvedValue(mockOrder as OrderEntity);

      const result = await controller.getOrder('order-uuid-1', 'customer-uuid-1', 'customer');

      expect(result).toEqual(mockOrder);
      expect(orderService.getOrder).toHaveBeenCalledWith(
        'order-uuid-1',
        'customer-uuid-1',
        'customer',
      );
    });
  });

  describe('cancelOrder', () => {
    it('should call orderService.cancelOrder with params', async () => {
      const cancelledOrder = { ...mockOrder, status: 'cancelled' };
      orderService.cancelOrder.mockResolvedValue(cancelledOrder as OrderEntity);

      const result = await controller.cancelOrder(
        'order-uuid-1',
        'customer-uuid-1',
        'customer',
        'Changed my mind',
      );

      expect(result).toEqual(cancelledOrder);
      expect(orderService.cancelOrder).toHaveBeenCalledWith(
        'order-uuid-1',
        'customer-uuid-1',
        'customer',
        'Changed my mind',
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should call orderService.updateStatus with params', async () => {
      const updatedOrder = { ...mockOrder, status: 'confirmed' };
      orderService.updateStatus.mockResolvedValue(updatedOrder as OrderEntity);

      const result = await controller.updateOrderStatus(
        'order-uuid-1',
        { status: 'confirmed' } as any,
        'vendor-uuid',
        'vendor_owner',
      );

      expect(result).toEqual(updatedOrder);
      expect(orderService.updateStatus).toHaveBeenCalledWith(
        'order-uuid-1',
        { status: 'confirmed' },
        'vendor-uuid',
        'vendor_owner',
      );
    });
  });
});
