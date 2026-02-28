import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { DeliveryService } from '../delivery.service';
import { DeliveryRepository } from '../delivery.repository';
import { LocationService } from '../location.service';
import { KafkaProducerService } from '../../../config/kafka-producer.service';
import { DeliveryGateway } from '../delivery.gateway';
import { DeliveryEntity } from '../entities/delivery.entity';
import { DeliveryPersonnelEntity } from '../entities/delivery-personnel.entity';
import { DeliveryStatus } from '../dto/update-delivery-status.dto';

describe('Delivery Consumer Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let module: TestingModule;
  let dataSource: DataSource;
  let deliveryService: DeliveryService;
  let deliveryRepo: DeliveryRepository;
  let mockKafka: jest.Mocked<KafkaProducerService>;

  const mockLocationService = {
    updateRiderLocation: jest.fn().mockResolvedValue(undefined),
    removeRiderLocation: jest.fn().mockResolvedValue(undefined),
    findNearbyRiders: jest.fn().mockResolvedValue([]),
    getRiderLocation: jest.fn().mockResolvedValue(null),
    getDistanceBetween: jest.fn().mockResolvedValue(null),
    setRiderOnlineStatus: jest.fn().mockResolvedValue(undefined),
  };

  const mockGateway = {
    broadcastLocationUpdate: jest.fn(),
    broadcastStatusUpdate: jest.fn(),
    notifyRider: jest.fn(),
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();

    const pgClient = new Client({ connectionString: container.getConnectionUri() });
    await pgClient.connect();
    await pgClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await pgClient.query('CREATE SCHEMA IF NOT EXISTS delivery');
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
          entities: [DeliveryEntity, DeliveryPersonnelEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([DeliveryEntity, DeliveryPersonnelEntity]),
      ],
      providers: [
        DeliveryService,
        DeliveryRepository,
        { provide: LocationService, useValue: mockLocationService },
        { provide: KafkaProducerService, useValue: mockKafka },
        { provide: DeliveryGateway, useValue: mockGateway },
      ],
    }).compile();

    deliveryService = module.get<DeliveryService>(DeliveryService);
    deliveryRepo = module.get<DeliveryRepository>(DeliveryRepository);
    dataSource = module.get<DataSource>(DataSource);
  }, 60000);

  afterAll(async () => {
    await dataSource?.destroy();
    await module?.close();
    await container?.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  let riderCounter = 0;
  const createTestRider = async (overrides?: Partial<DeliveryPersonnelEntity>) => {
    riderCounter++;
    const hex = riderCounter.toString(16).padStart(12, '0');
    const userId = `aaaaaaaa-aaaa-aaaa-aaaa-${hex}`;

    return dataSource.getRepository(DeliveryPersonnelEntity).save({
      user_id: userId,
      vehicle_type: 'motorcycle',
      status: 'active',
      is_online: true,
      current_order_count: 0,
      max_concurrent_orders: 3,
      rating_average: 4.5,
      total_deliveries: 50,
      ...overrides,
    });
  };

  let orderCounter = 0;
  const nextOrderId = () => {
    orderCounter++;
    const hex = orderCounter.toString(16).padStart(12, '0');
    return `bbbbbbbb-bbbb-bbbb-bbbb-${hex}`;
  };

  describe('createDelivery', () => {
    it('should create a delivery record with status assigned', async () => {
      const orderId = nextOrderId();

      const delivery = await deliveryService.createDelivery({
        order_id: orderId,
        pickup_location: { lat: 14.5995, lng: 120.9842 },
        dropoff_location: { lat: 14.6042, lng: 121.0012 },
        delivery_fee: 49,
      } as any);

      expect(delivery).toBeDefined();
      expect(delivery.id).toBeDefined();
      expect(delivery.order_id).toBe(orderId);
      expect(delivery.status).toBe('assigned');

      // Verify in database
      const dbDelivery = await dataSource.getRepository(DeliveryEntity).findOne({
        where: { id: delivery.id },
      });
      expect(dbDelivery).toBeDefined();
      expect(dbDelivery!.order_id).toBe(orderId);
      expect(Number(dbDelivery!.delivery_fee)).toBe(49);
    });

    it('should reject duplicate delivery for same order', async () => {
      const orderId = nextOrderId();
      await deliveryService.createDelivery({
        order_id: orderId,
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
      } as any);

      await expect(
        deliveryService.createDelivery({
          order_id: orderId,
          pickup_location: { lat: 14.5, lng: 120.9 },
          dropoff_location: { lat: 14.6, lng: 121.0 },
          delivery_fee: 49,
        } as any),
      ).rejects.toThrow('already exists');
    });
  });

  describe('acceptDelivery', () => {
    it('should change status from assigned to accepted', async () => {
      const rider = await createTestRider();
      const orderId = nextOrderId();

      // Create delivery assigned to this rider
      const delivery = await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        personnel_id: rider.id,
        status: 'assigned',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
      });

      const accepted = await deliveryService.acceptDelivery(delivery.id, rider.user_id);

      expect(accepted.status).toBe('accepted');

      // Verify Kafka event
      expect(mockKafka.publish).toHaveBeenCalledWith(
        'daltaners.delivery.events',
        'com.daltaners.delivery.accepted',
        expect.objectContaining({
          id: delivery.id,
          order_id: orderId,
        }),
      );

      // Verify WebSocket broadcast
      expect(mockGateway.broadcastStatusUpdate).toHaveBeenCalledWith(orderId, 'accepted');
    });

    it('should reject acceptance if not assigned to this rider', async () => {
      const rider = await createTestRider();
      const otherRider = await createTestRider();
      const orderId = nextOrderId();

      const delivery = await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        personnel_id: otherRider.id,
        status: 'assigned',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
      });

      await expect(
        deliveryService.acceptDelivery(delivery.id, rider.user_id),
      ).rejects.toThrow('not assigned to you');
    });
  });

  describe('updateDeliveryStatus — state machine', () => {
    it('should transition: accepted → at_store → picked_up → in_transit → arrived → delivered', async () => {
      const rider = await createTestRider();
      const orderId = nextOrderId();

      const delivery = await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        personnel_id: rider.id,
        status: 'accepted',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
      });

      // accepted → at_store
      let updated = await deliveryService.updateDeliveryStatus(delivery.id, {
        status: DeliveryStatus.AT_STORE,
      } as any);
      expect(updated.status).toBe('at_store');

      // at_store → picked_up
      updated = await deliveryService.updateDeliveryStatus(delivery.id, {
        status: DeliveryStatus.PICKED_UP,
      } as any);
      expect(updated.status).toBe('picked_up');
      expect(updated.actual_pickup_at).toBeDefined();

      // picked_up → in_transit
      updated = await deliveryService.updateDeliveryStatus(delivery.id, {
        status: DeliveryStatus.IN_TRANSIT,
      } as any);
      expect(updated.status).toBe('in_transit');

      // in_transit → arrived
      updated = await deliveryService.updateDeliveryStatus(delivery.id, {
        status: DeliveryStatus.ARRIVED,
      } as any);
      expect(updated.status).toBe('arrived');

      // arrived → delivered
      updated = await deliveryService.updateDeliveryStatus(delivery.id, {
        status: DeliveryStatus.DELIVERED,
        proof_of_delivery: { photo_url: 'https://example.com/proof.jpg' },
      } as any);
      expect(updated.status).toBe('delivered');
      expect(updated.actual_delivery_at).toBeDefined();

      // Verify rider stats updated
      const updatedRider = await dataSource.getRepository(DeliveryPersonnelEntity).findOne({
        where: { id: rider.id },
      });
      expect(updatedRider!.total_deliveries).toBe(51); // was 50, incremented
    });

    it('should reject invalid state transition: delivered → picked_up', async () => {
      const rider = await createTestRider();
      const orderId = nextOrderId();

      const delivery = await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        personnel_id: rider.id,
        status: 'delivered',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
        actual_delivery_at: new Date(),
      });

      await expect(
        deliveryService.updateDeliveryStatus(delivery.id, {
          status: DeliveryStatus.PICKED_UP,
        } as any),
      ).rejects.toThrow('Cannot transition');
    });

    it('should reject invalid state transition: cancelled → accepted', async () => {
      const rider = await createTestRider();
      const orderId = nextOrderId();

      const delivery = await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        personnel_id: rider.id,
        status: 'cancelled',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
      });

      await expect(
        deliveryService.updateDeliveryStatus(delivery.id, {
          status: DeliveryStatus.ACCEPTED,
        } as any),
      ).rejects.toThrow('Cannot transition');
    });

    it('should require failure_reason when status is failed', async () => {
      const rider = await createTestRider();
      const orderId = nextOrderId();

      const delivery = await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        personnel_id: rider.id,
        status: 'picked_up',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
      });

      await expect(
        deliveryService.updateDeliveryStatus(delivery.id, {
          status: DeliveryStatus.FAILED,
        } as any),
      ).rejects.toThrow('failure_reason is required');
    });

    it('should allow failure with reason', async () => {
      const rider = await createTestRider();
      const orderId = nextOrderId();

      const delivery = await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        personnel_id: rider.id,
        status: 'in_transit',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
      });

      const updated = await deliveryService.updateDeliveryStatus(delivery.id, {
        status: DeliveryStatus.FAILED,
        failure_reason: 'Customer unreachable',
      } as any);

      expect(updated.status).toBe('failed');
      expect(updated.failure_reason).toBe('Customer unreachable');
    });
  });

  describe('handleOrderCancelled (via consumer logic)', () => {
    it('should cancel delivery if not in terminal state', async () => {
      const rider = await createTestRider();
      const orderId = nextOrderId();

      const delivery = await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        personnel_id: rider.id,
        status: 'assigned',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
      });

      // Simulate what the consumer does
      const fetched = await deliveryRepo.findDeliveryByOrderId(orderId);
      if (fetched && !['delivered', 'failed', 'cancelled'].includes(fetched.status)) {
        await deliveryRepo.updateDeliveryStatus(fetched.id, 'cancelled', {
          failure_reason: 'Order cancelled',
        });
      }

      const cancelled = await dataSource.getRepository(DeliveryEntity).findOne({
        where: { id: delivery.id },
      });
      expect(cancelled!.status).toBe('cancelled');
    });

    it('should not cancel already delivered delivery', async () => {
      const orderId = nextOrderId();

      await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        status: 'delivered',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
        actual_delivery_at: new Date(),
      });

      const fetched = await deliveryRepo.findDeliveryByOrderId(orderId);
      const shouldCancel = fetched && !['delivered', 'failed', 'cancelled'].includes(fetched.status);
      expect(shouldCancel).toBe(false);
    });
  });

  describe('getDeliveryById / getDeliveryByOrderId', () => {
    it('should retrieve delivery by id', async () => {
      const orderId = nextOrderId();
      const delivery = await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        status: 'assigned',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
      });

      const fetched = await deliveryService.getDeliveryById(delivery.id);
      expect(fetched.id).toBe(delivery.id);
      expect(fetched.order_id).toBe(orderId);
    });

    it('should retrieve delivery by order_id', async () => {
      const orderId = nextOrderId();
      await dataSource.getRepository(DeliveryEntity).save({
        order_id: orderId,
        status: 'assigned',
        pickup_location: { lat: 14.5, lng: 120.9 },
        dropoff_location: { lat: 14.6, lng: 121.0 },
        delivery_fee: 49,
      });

      const fetched = await deliveryService.getDeliveryByOrderId(orderId);
      expect(fetched.order_id).toBe(orderId);
    });

    it('should throw NotFoundException for non-existent delivery', async () => {
      await expect(
        deliveryService.getDeliveryById('99999999-9999-9999-9999-999999999999'),
      ).rejects.toThrow('not found');
    });
  });

  describe('registerRider', () => {
    it('should create a rider profile in the database', async () => {
      const userId = `cccccccc-cccc-cccc-cccc-${(++riderCounter).toString(16).padStart(12, '0')}`;

      const rider = await deliveryService.registerRider({
        user_id: userId,
        vehicle_type: 'motorcycle',
        vehicle_plate: 'ABC-1234',
        license_number: 'LN-5678',
      } as any);

      expect(rider).toBeDefined();
      expect(rider.user_id).toBe(userId);
      expect(rider.vehicle_type).toBe('motorcycle');
      expect(rider.status).toBe('pending');
      expect(rider.is_online).toBe(false);

      // Verify Kafka event
      expect(mockKafka.publish).toHaveBeenCalledWith(
        'daltaners.delivery.events',
        'com.daltaners.delivery.rider_registered',
        expect.objectContaining({
          user_id: userId,
          vehicle_type: 'motorcycle',
        }),
      );
    });

    it('should reject duplicate rider registration', async () => {
      const userId = `cccccccc-cccc-cccc-cccc-${(++riderCounter).toString(16).padStart(12, '0')}`;

      await deliveryService.registerRider({
        user_id: userId,
        vehicle_type: 'bicycle',
      } as any);

      await expect(
        deliveryService.registerRider({
          user_id: userId,
          vehicle_type: 'car',
        } as any),
      ).rejects.toThrow('already registered');
    });
  });
});
