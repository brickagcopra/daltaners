import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { OrderService } from '../order.service';
import { OrderRepository } from '../order.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';

describe('Order Flow Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let module: TestingModule;
  let dataSource: DataSource;
  let orderService: OrderService;
  let mockKafka: jest.Mocked<KafkaProducerService>;

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue(undefined),
    getClient: jest.fn().mockReturnValue({}),
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();

    const pgClient = new Client({ connectionString: container.getConnectionUri() });
    await pgClient.connect();
    await pgClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await pgClient.query('CREATE SCHEMA IF NOT EXISTS orders');
    await pgClient.end();

    mockKafka = {
      publish: jest.fn().mockResolvedValue(undefined),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: container.getConnectionUri(),
          entities: [OrderEntity, OrderItemEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([OrderEntity, OrderItemEntity]),
      ],
      providers: [
        OrderService,
        OrderRepository,
        { provide: RedisService, useValue: mockRedis },
        { provide: KafkaProducerService, useValue: mockKafka },
      ],
    }).compile();

    orderService = module.get<OrderService>(OrderService);
    dataSource = module.get<DataSource>(DataSource);
  }, 60000);

  afterAll(async () => {
    await dataSource?.destroy();
    await module?.close();
    await container?.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.getJson.mockResolvedValue(null);
  });

  const createTestOrderDto = (overrides?: Partial<CreateOrderDto>): CreateOrderDto => ({
    store_id: '11111111-1111-1111-1111-111111111111',
    store_location_id: '22222222-2222-2222-2222-222222222222',
    order_type: 'delivery',
    service_type: 'grocery',
    delivery_type: 'standard',
    payment_method: 'gcash',
    delivery_address: { street: '123 Test St', city: 'Manila', zip: '1000' },
    items: [
      { product_id: '33333333-3333-3333-3333-333333333333', quantity: 2 },
      { product_id: '44444444-4444-4444-4444-444444444444', quantity: 1 },
    ],
    ...overrides,
  } as CreateOrderDto);

  const customerId = '55555555-5555-5555-5555-555555555555';

  describe('createOrder', () => {
    it('should insert order and items into the database', async () => {
      const dto = createTestOrderDto();

      const order = await orderService.createOrder(customerId, dto);

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.order_number).toMatch(/^BIR-\d{4}-\d{6}$/);
      expect(order.customer_id).toBe(customerId);
      expect(order.store_id).toBe(dto.store_id);
      expect(order.status).toBe('pending');
      expect(order.payment_status).toBe('pending');
      expect(order.order_type).toBe('delivery');
      expect(order.delivery_type).toBe('standard');
      expect(order.payment_method).toBe('gcash');
      expect(order.items).toHaveLength(2);

      // Verify directly from database
      const dbOrder = await dataSource.getRepository(OrderEntity).findOne({
        where: { id: order.id },
        relations: ['items'],
      });
      expect(dbOrder).toBeDefined();
      expect(dbOrder!.order_number).toBe(order.order_number);
      expect(dbOrder!.items).toHaveLength(2);
    });

    it('should publish ORDER_PLACED Kafka event', async () => {
      const dto = createTestOrderDto();

      const order = await orderService.createOrder(customerId, dto);

      expect(mockKafka.publish).toHaveBeenCalledWith(
        'daltaners.orders.events',
        'com.daltaners.orders.placed',
        expect.objectContaining({
          order_id: order.id,
          customer_id: customerId,
          store_id: dto.store_id,
          payment_method: 'gcash',
        }),
        order.id,
      );
    });

    it('should set delivery_fee to 0 for pickup orders', async () => {
      const dto = createTestOrderDto({ order_type: 'pickup' });

      const order = await orderService.createOrder(customerId, dto);

      expect(Number(order.delivery_fee)).toBe(0);
    });

    it('should set delivery_fee based on delivery_type', async () => {
      const expressDto = createTestOrderDto({ delivery_type: 'express' });
      const order = await orderService.createOrder(customerId, expressDto);
      expect(Number(order.delivery_fee)).toBe(79);
    });
  });

  describe('getOrder', () => {
    it('should retrieve order by id from database', async () => {
      const dto = createTestOrderDto();
      const created = await orderService.createOrder(customerId, dto);

      const fetched = await orderService.getOrder(created.id);

      expect(fetched.id).toBe(created.id);
      expect(fetched.order_number).toBe(created.order_number);
      expect(fetched.items).toHaveLength(2);
    });

    it('should throw NotFoundException for non-existent order', async () => {
      await expect(
        orderService.getOrder('99999999-9999-9999-9999-999999999999'),
      ).rejects.toThrow('not found');
    });

    it('should enforce access control for customers', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);

      await expect(
        orderService.getOrder(order.id, 'other-user-id', 'customer'),
      ).rejects.toThrow('do not have access');
    });
  });

  describe('getOrders', () => {
    it('should return paginated orders', async () => {
      // Create a few orders
      await orderService.createOrder(customerId, createTestOrderDto());
      await orderService.createOrder(customerId, createTestOrderDto());

      const result = await orderService.getOrders({ page: 1, limit: 5 });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(5);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const result = await orderService.getOrders({ status: 'pending', page: 1, limit: 100 });

      result.items.forEach((order) => {
        expect(order.status).toBe('pending');
      });
    });
  });

  describe('handlePaymentCompleted', () => {
    it('should update order to confirmed with payment_status completed', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      jest.clearAllMocks();

      await orderService.handlePaymentCompleted(order.id);

      const updated = await dataSource.getRepository(OrderEntity).findOne({
        where: { id: order.id },
      });
      expect(updated!.status).toBe('confirmed');
      expect(updated!.payment_status).toBe('completed');
    });

    it('should publish status_changed event', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      jest.clearAllMocks();

      await orderService.handlePaymentCompleted(order.id);

      expect(mockKafka.publish).toHaveBeenCalledWith(
        'daltaners.orders.events',
        'com.daltaners.orders.status_changed',
        expect.objectContaining({
          order_id: order.id,
          previous_status: 'pending',
          new_status: 'confirmed',
        }),
        order.id,
      );
    });

    it('should be idempotent — second call should not re-process', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      jest.clearAllMocks();

      await orderService.handlePaymentCompleted(order.id);
      await orderService.handlePaymentCompleted(order.id);

      // Should only publish once (second call is a no-op)
      expect(mockKafka.publish).toHaveBeenCalledTimes(1);

      const updated = await dataSource.getRepository(OrderEntity).findOne({
        where: { id: order.id },
      });
      expect(updated!.status).toBe('confirmed');
    });

    it('should silently skip unknown order', async () => {
      await expect(
        orderService.handlePaymentCompleted('99999999-9999-9999-9999-999999999999'),
      ).resolves.toBeUndefined();
    });
  });

  describe('handlePaymentFailed', () => {
    it('should cancel order with payment_status failed', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      jest.clearAllMocks();

      await orderService.handlePaymentFailed(order.id);

      const updated = await dataSource.getRepository(OrderEntity).findOne({
        where: { id: order.id },
      });
      expect(updated!.status).toBe('cancelled');
      expect(updated!.payment_status).toBe('failed');
      expect(updated!.cancellation_reason).toBe('Payment failed');
    });

    it('should publish cancelled event on payment failure', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      jest.clearAllMocks();

      await orderService.handlePaymentFailed(order.id);

      expect(mockKafka.publish).toHaveBeenCalledWith(
        'daltaners.orders.events',
        'com.daltaners.orders.cancelled',
        expect.objectContaining({
          order_id: order.id,
          cancellation_reason: 'Payment failed',
        }),
        order.id,
      );
    });

    it('should skip if order is already cancelled', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      await orderService.handlePaymentFailed(order.id);
      jest.clearAllMocks();

      await orderService.handlePaymentFailed(order.id);

      expect(mockKafka.publish).not.toHaveBeenCalled();
    });
  });

  describe('handleDeliveryStatusUpdate', () => {
    it('should update order status when delivery is picked_up', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      // Move through payment confirmed → preparing → ready first
      await orderService.handlePaymentCompleted(order.id);
      await orderService.updateStatus(order.id, { status: 'preparing' } as any, 'vendor', 'vendor_owner');
      await orderService.updateStatus(order.id, { status: 'ready' } as any, 'vendor', 'vendor_owner');
      jest.clearAllMocks();

      await orderService.handleDeliveryStatusUpdate(order.id, 'picked_up');

      const updated = await dataSource.getRepository(OrderEntity).findOne({
        where: { id: order.id },
      });
      expect(updated!.status).toBe('picked_up');
      expect(updated!.picked_up_at).toBeDefined();
    });

    it('should update order status when delivery is delivered', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      // Move through: pending → confirmed → preparing → ready → picked_up → in_transit
      await orderService.handlePaymentCompleted(order.id);
      await orderService.updateStatus(order.id, { status: 'preparing' } as any, 'vendor', 'vendor_owner');
      await orderService.updateStatus(order.id, { status: 'ready' } as any, 'vendor', 'vendor_owner');
      await orderService.handleDeliveryStatusUpdate(order.id, 'picked_up');
      await orderService.handleDeliveryStatusUpdate(order.id, 'in_transit');
      jest.clearAllMocks();

      await orderService.handleDeliveryStatusUpdate(order.id, 'delivered');

      const updated = await dataSource.getRepository(OrderEntity).findOne({
        where: { id: order.id },
      });
      expect(updated!.status).toBe('delivered');
      expect(updated!.actual_delivery_at).toBeDefined();
    });

    it('should ignore unknown delivery status', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      jest.clearAllMocks();

      await orderService.handleDeliveryStatusUpdate(order.id, 'unknown_status');

      expect(mockKafka.publish).not.toHaveBeenCalled();
    });

    it('should ignore invalid state transition', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      jest.clearAllMocks();

      // pending → picked_up is not a valid transition
      await orderService.handleDeliveryStatusUpdate(order.id, 'picked_up');

      expect(mockKafka.publish).not.toHaveBeenCalled();
      const unchanged = await dataSource.getRepository(OrderEntity).findOne({
        where: { id: order.id },
      });
      expect(unchanged!.status).toBe('pending');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a pending order', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      jest.clearAllMocks();

      const cancelled = await orderService.cancelOrder(
        order.id,
        customerId,
        'customer',
        'Changed my mind',
      );

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellation_reason).toBe('Changed my mind');
      expect(cancelled.payment_status).toBe('cancelled');
    });

    it('should set payment_status to refund_pending when payment was completed', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      await orderService.handlePaymentCompleted(order.id);
      jest.clearAllMocks();

      const cancelled = await orderService.cancelOrder(
        order.id,
        customerId,
        'customer',
        'No longer needed',
      );

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.payment_status).toBe('refund_pending');
    });

    it('should publish ORDER_CANCELLED event', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      jest.clearAllMocks();

      await orderService.cancelOrder(order.id, customerId, 'customer');

      expect(mockKafka.publish).toHaveBeenCalledWith(
        'daltaners.orders.events',
        'com.daltaners.orders.cancelled',
        expect.objectContaining({
          order_id: order.id,
          customer_id: customerId,
        }),
        order.id,
      );
    });

    it('should reject cancellation for non-cancellable status', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      await orderService.handlePaymentCompleted(order.id);
      await orderService.updateStatus(order.id, { status: 'preparing' } as any, 'vendor', 'vendor_owner');

      await expect(
        orderService.cancelOrder(order.id, 'admin-id', 'admin'),
      ).rejects.toThrow('cannot be cancelled');
    });
  });

  describe('updateStatus', () => {
    it('should validate state transitions', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);

      // pending → delivered is not valid
      await expect(
        orderService.updateStatus(order.id, { status: 'delivered' } as any, 'admin', 'admin'),
      ).rejects.toThrow('Invalid status transition');
    });

    it('should set prepared_at when status becomes ready', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      await orderService.handlePaymentCompleted(order.id);
      await orderService.updateStatus(order.id, { status: 'preparing' } as any, 'vendor', 'vendor_owner');

      const ready = await orderService.updateStatus(
        order.id,
        { status: 'ready' } as any,
        'vendor',
        'vendor_owner',
      );

      expect(ready.prepared_at).toBeDefined();
    });
  });

  describe('full order lifecycle', () => {
    it('should handle complete lifecycle: create → payment → preparing → ready → picked_up → in_transit → delivered', async () => {
      const dto = createTestOrderDto();
      const order = await orderService.createOrder(customerId, dto);
      expect(order.status).toBe('pending');

      // Payment completed
      await orderService.handlePaymentCompleted(order.id);
      let current = await dataSource.getRepository(OrderEntity).findOne({ where: { id: order.id } });
      expect(current!.status).toBe('confirmed');
      expect(current!.payment_status).toBe('completed');

      // Vendor starts preparing
      await orderService.updateStatus(order.id, { status: 'preparing' } as any, 'vendor', 'vendor_owner');
      current = await dataSource.getRepository(OrderEntity).findOne({ where: { id: order.id } });
      expect(current!.status).toBe('preparing');

      // Order ready
      await orderService.updateStatus(order.id, { status: 'ready' } as any, 'vendor', 'vendor_owner');
      current = await dataSource.getRepository(OrderEntity).findOne({ where: { id: order.id } });
      expect(current!.status).toBe('ready');
      expect(current!.prepared_at).toBeDefined();

      // Rider picks up
      await orderService.handleDeliveryStatusUpdate(order.id, 'picked_up');
      current = await dataSource.getRepository(OrderEntity).findOne({ where: { id: order.id } });
      expect(current!.status).toBe('picked_up');
      expect(current!.picked_up_at).toBeDefined();

      // In transit
      await orderService.handleDeliveryStatusUpdate(order.id, 'in_transit');
      current = await dataSource.getRepository(OrderEntity).findOne({ where: { id: order.id } });
      expect(current!.status).toBe('in_transit');

      // Delivered
      await orderService.handleDeliveryStatusUpdate(order.id, 'delivered');
      current = await dataSource.getRepository(OrderEntity).findOne({ where: { id: order.id } });
      expect(current!.status).toBe('delivered');
      expect(current!.actual_delivery_at).toBeDefined();
    });
  });

  describe('getCustomerOrders', () => {
    it('should return cursor-paginated orders for a customer', async () => {
      const uniqueCustomer = '66666666-6666-6666-6666-666666666666';
      await orderService.createOrder(uniqueCustomer, createTestOrderDto());
      await orderService.createOrder(uniqueCustomer, createTestOrderDto());

      const result = await orderService.getCustomerOrders(uniqueCustomer, 10);

      expect(result.items.length).toBe(2);
      expect(result.items[0].customer_id).toBe(uniqueCustomer);
    });
  });
});
