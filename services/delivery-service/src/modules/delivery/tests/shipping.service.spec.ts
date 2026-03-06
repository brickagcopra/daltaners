import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ShippingService } from '../shipping.service';
import { ShippingRepository } from '../shipping.repository';
import { RedisService } from '../../../config/redis.service';
import { KafkaProducerService } from '../../../config/kafka-producer.service';
import { ShippingCarrierEntity } from '../entities/shipping-carrier.entity';
import { CarrierServiceEntity } from '../entities/carrier-service.entity';
import { ShipmentEntity } from '../entities/shipment.entity';
import { SHIPPING_EVENTS } from '../events/shipping.events';

describe('ShippingService', () => {
  let service: ShippingService;
  let shippingRepo: jest.Mocked<ShippingRepository>;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockCarrier: Partial<ShippingCarrierEntity> = {
    id: 'carrier-uuid-1',
    name: 'J&T Express',
    code: 'jnt',
    type: 'third_party',
    is_active: true,
    priority: 10,
    api_base_url: 'https://api.jtexpress.ph',
    api_credentials: { api_key: 'test-key' },
    supported_service_types: ['grocery', 'parcel'],
    tracking_url_template: 'https://www.jtexpress.ph/track?billcode={{tracking_number}}',
    settings: {},
    services: [],
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const mockCarrierService: Partial<CarrierServiceEntity> = {
    id: 'cs-uuid-1',
    carrier_id: 'carrier-uuid-1',
    name: 'Express Delivery',
    code: 'express',
    estimated_days_min: 1,
    estimated_days_max: 2,
    base_price: 85,
    per_kg_price: 15,
    max_weight_kg: 50,
    is_cod_supported: true,
    is_insurance_available: true,
    is_active: true,
    created_at: new Date('2026-01-01'),
  };

  const mockShipment: Partial<ShipmentEntity> = {
    id: 'shipment-uuid-1',
    shipment_number: 'SHP-20260301-0001',
    order_id: 'order-uuid-1',
    carrier_id: 'carrier-uuid-1',
    carrier_service_id: 'cs-uuid-1',
    store_id: 'store-uuid-1',
    status: 'pending',
    tracking_number: null,
    weight_kg: 2.5,
    package_count: 1,
    pickup_address: { city: 'Manila', latitude: 14.5995, longitude: 120.9842 },
    delivery_address: { city: 'Quezon City', latitude: 14.6510, longitude: 121.0496 },
    shipping_fee: 122.5,
    insurance_amount: 0,
    cod_amount: 0,
    metadata: {},
    created_at: new Date('2026-03-01'),
    updated_at: new Date('2026-03-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: ShippingRepository,
          useValue: {
            createCarrier: jest.fn(),
            findCarrierById: jest.fn(),
            findCarrierByCode: jest.fn(),
            findAllCarriers: jest.fn(),
            findActiveCarriers: jest.fn(),
            updateCarrier: jest.fn(),
            deleteCarrier: jest.fn(),
            createCarrierService: jest.fn(),
            findCarrierServiceById: jest.fn(),
            findServicesByCarrierId: jest.fn(),
            findActiveServicesByCarrierId: jest.fn(),
            updateCarrierService: jest.fn(),
            deleteCarrierService: jest.fn(),
            createShipment: jest.fn(),
            findShipmentById: jest.fn(),
            findShipmentByNumber: jest.fn(),
            findShipmentByOrderId: jest.fn(),
            findShipmentByTrackingNumber: jest.fn(),
            findShipments: jest.fn(),
            updateShipment: jest.fn(),
            getShipmentStats: jest.fn(),
            getNextShipmentNumber: jest.fn(),
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

    service = module.get<ShippingService>(ShippingService);
    shippingRepo = module.get(ShippingRepository);
    redisService = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Carrier CRUD ---

  describe('createCarrier', () => {
    it('should create a carrier successfully', async () => {
      shippingRepo.findCarrierByCode.mockResolvedValue(null);
      shippingRepo.createCarrier.mockResolvedValue(mockCarrier as ShippingCarrierEntity);

      const result = await service.createCarrier({
        name: 'J&T Express',
        code: 'jnt',
        type: 'third_party',
      });

      expect(result.code).toBe('jnt');
      expect(shippingRepo.createCarrier).toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalledWith('shipping:carriers:active');
    });

    it('should throw ConflictException if carrier code exists', async () => {
      shippingRepo.findCarrierByCode.mockResolvedValue(mockCarrier as ShippingCarrierEntity);

      await expect(
        service.createCarrier({ name: 'Test', code: 'jnt', type: 'third_party' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getCarrier', () => {
    it('should return carrier by ID', async () => {
      shippingRepo.findCarrierById.mockResolvedValue(mockCarrier as ShippingCarrierEntity);

      const result = await service.getCarrier('carrier-uuid-1');
      expect(result.id).toBe('carrier-uuid-1');
    });

    it('should throw NotFoundException if not found', async () => {
      shippingRepo.findCarrierById.mockResolvedValue(null);

      await expect(service.getCarrier('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listCarriers', () => {
    it('should return paginated list of carriers', async () => {
      shippingRepo.findAllCarriers.mockResolvedValue({
        items: [mockCarrier as ShippingCarrierEntity],
        total: 1,
      });

      const result = await service.listCarriers({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getActiveCarriers', () => {
    it('should return cached active carriers', async () => {
      redisService.get.mockResolvedValue(JSON.stringify([mockCarrier]));

      const result = await service.getActiveCarriers();
      expect(result).toHaveLength(1);
      expect(shippingRepo.findActiveCarriers).not.toHaveBeenCalled();
    });

    it('should fetch and cache active carriers if not cached', async () => {
      redisService.get.mockResolvedValue(null);
      shippingRepo.findActiveCarriers.mockResolvedValue([mockCarrier as ShippingCarrierEntity]);

      const result = await service.getActiveCarriers();
      expect(result).toHaveLength(1);
      expect(redisService.set).toHaveBeenCalled();
    });
  });

  describe('updateCarrier', () => {
    it('should update carrier successfully', async () => {
      const updated = { ...mockCarrier, name: 'J&T Express Philippines' };
      shippingRepo.findCarrierById.mockResolvedValue(mockCarrier as ShippingCarrierEntity);
      shippingRepo.updateCarrier.mockResolvedValue(updated as ShippingCarrierEntity);

      const result = await service.updateCarrier('carrier-uuid-1', { name: 'J&T Express Philippines' });
      expect(result.name).toBe('J&T Express Philippines');
      expect(redisService.del).toHaveBeenCalledWith('shipping:carriers:active');
    });
  });

  describe('deleteCarrier', () => {
    it('should delete carrier successfully', async () => {
      shippingRepo.findCarrierById.mockResolvedValue(mockCarrier as ShippingCarrierEntity);
      shippingRepo.deleteCarrier.mockResolvedValue(undefined);

      await service.deleteCarrier('carrier-uuid-1');
      expect(shippingRepo.deleteCarrier).toHaveBeenCalledWith('carrier-uuid-1');
      expect(redisService.del).toHaveBeenCalledWith('shipping:carriers:active');
    });
  });

  // --- Carrier Service CRUD ---

  describe('createCarrierService', () => {
    it('should create a carrier service', async () => {
      shippingRepo.findCarrierById.mockResolvedValue(mockCarrier as ShippingCarrierEntity);
      shippingRepo.createCarrierService.mockResolvedValue(mockCarrierService as CarrierServiceEntity);

      const result = await service.createCarrierService({
        carrier_id: 'carrier-uuid-1',
        name: 'Express Delivery',
        code: 'express',
        base_price: 85,
      });

      expect(result.code).toBe('express');
    });

    it('should throw NotFoundException if carrier does not exist', async () => {
      shippingRepo.findCarrierById.mockResolvedValue(null);

      await expect(
        service.createCarrierService({ carrier_id: 'unknown', name: 'Test', code: 'test', base_price: 0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listCarrierServices', () => {
    it('should return services for a carrier', async () => {
      shippingRepo.findServicesByCarrierId.mockResolvedValue([mockCarrierService as CarrierServiceEntity]);

      const result = await service.listCarrierServices('carrier-uuid-1');
      expect(result).toHaveLength(1);
    });
  });

  // --- Shipping Rates ---

  describe('getShippingRates', () => {
    it('should return rates from active carriers', async () => {
      const carrierWithServices = {
        ...mockCarrier,
        services: [mockCarrierService as CarrierServiceEntity],
      };
      redisService.get.mockResolvedValue(null);
      shippingRepo.findActiveCarriers.mockResolvedValue([carrierWithServices as ShippingCarrierEntity]);

      const rates = await service.getShippingRates({

        pickup_address: { city: 'Manila' },
        delivery_address: { city: 'Quezon City' },
        weight_kg: 2.5,
      });

      expect(rates.length).toBeGreaterThanOrEqual(1);
      expect(rates[0].carrier_code).toBe('jnt');
      expect(rates[0].shipping_fee).toBeGreaterThan(0);
    });

    it('should filter carriers that do not support COD when required', async () => {
      const carrierNoCod = {
        ...mockCarrier,
        services: [{ ...mockCarrierService, is_cod_supported: false } as CarrierServiceEntity],
      };
      redisService.get.mockResolvedValue(null);
      shippingRepo.findActiveCarriers.mockResolvedValue([carrierNoCod as ShippingCarrierEntity]);

      const rates = await service.getShippingRates({

        pickup_address: {},
        delivery_address: {},
        cod_required: true,
      });

      expect(rates).toHaveLength(0);
    });
  });

  // --- Shipment Lifecycle ---

  describe('createShipment', () => {
    it('should create a shipment successfully', async () => {
      shippingRepo.findCarrierById.mockResolvedValue(mockCarrier as ShippingCarrierEntity);
      shippingRepo.findCarrierServiceById.mockResolvedValue(mockCarrierService as CarrierServiceEntity);
      shippingRepo.findShipmentByOrderId.mockResolvedValue(null);
      shippingRepo.getNextShipmentNumber.mockResolvedValue('SHP-20260301-0001');
      shippingRepo.createShipment.mockResolvedValue(mockShipment as ShipmentEntity);
      shippingRepo.findShipmentById.mockResolvedValue(mockShipment as ShipmentEntity);

      const result = await service.createShipment({
        order_id: 'order-uuid-1',
        carrier_id: 'carrier-uuid-1',
        carrier_service_id: 'cs-uuid-1',
        store_id: 'store-uuid-1',
        pickup_address: { city: 'Manila' },
        delivery_address: { city: 'Quezon City' },
      });

      expect(result.shipment_number).toBe('SHP-20260301-0001');
      expect(result.status).toBe('pending');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        SHIPPING_EVENTS.TOPIC,
        SHIPPING_EVENTS.SHIPMENT_CREATED,
        expect.any(Object),
      );
    });

    it('should throw if carrier is inactive', async () => {
      shippingRepo.findCarrierById.mockResolvedValue({
        ...mockCarrier,
        is_active: false,
      } as ShippingCarrierEntity);

      await expect(
        service.createShipment({
          order_id: 'order-uuid-1',
          carrier_id: 'carrier-uuid-1',
          store_id: 'store-uuid-1',
          pickup_address: {},
          delivery_address: {},
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if shipment already exists for order', async () => {
      shippingRepo.findCarrierById.mockResolvedValue(mockCarrier as ShippingCarrierEntity);
      shippingRepo.findShipmentByOrderId.mockResolvedValue(mockShipment as ShipmentEntity);

      await expect(
        service.createShipment({
          order_id: 'order-uuid-1',
          carrier_id: 'carrier-uuid-1',
          store_id: 'store-uuid-1',
          pickup_address: {},
          delivery_address: {},
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw if carrier service does not match carrier', async () => {
      shippingRepo.findCarrierById.mockResolvedValue(mockCarrier as ShippingCarrierEntity);
      shippingRepo.findShipmentByOrderId.mockResolvedValue(null);
      shippingRepo.findCarrierServiceById.mockResolvedValue({
        ...mockCarrierService,
        carrier_id: 'different-carrier',
      } as CarrierServiceEntity);

      await expect(
        service.createShipment({
          order_id: 'order-uuid-1',
          carrier_id: 'carrier-uuid-1',
          carrier_service_id: 'cs-uuid-1',
          store_id: 'store-uuid-1',
          pickup_address: {},
          delivery_address: {},
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bookShipment', () => {
    it('should book a pending shipment', async () => {
      const pendingShipment = { ...mockShipment, status: 'pending' } as ShipmentEntity;
      const bookedShipment = {
        ...mockShipment,
        status: 'booked',
        tracking_number: 'JNT-123456',
      } as ShipmentEntity;

      shippingRepo.findShipmentById.mockResolvedValueOnce(pendingShipment);
      shippingRepo.findCarrierById.mockResolvedValue({
        ...mockCarrier,
        services: [],
      } as ShippingCarrierEntity);
      shippingRepo.updateShipment.mockResolvedValue(bookedShipment);

      const result = await service.bookShipment('shipment-uuid-1');
      expect(result.status).toBe('booked');
      expect(result.tracking_number).toBe('JNT-123456');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        SHIPPING_EVENTS.TOPIC,
        SHIPPING_EVENTS.SHIPMENT_BOOKED,
        expect.any(Object),
      );
    });

    it('should throw if shipment is not in pending status', async () => {
      shippingRepo.findShipmentById.mockResolvedValue({
        ...mockShipment,
        status: 'delivered',
      } as ShipmentEntity);

      await expect(service.bookShipment('shipment-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateLabel', () => {
    it('should generate label for booked shipment', async () => {
      const bookedShipment = {
        ...mockShipment,
        status: 'booked',
        tracking_number: 'JNT-123456',
      } as ShipmentEntity;
      const labeledShipment = {
        ...bookedShipment,
        status: 'label_generated',
        label_url: 'https://labels.daltaners.ph/jnt/JNT-123456.pdf',
        label_format: 'pdf',
      } as ShipmentEntity;

      shippingRepo.findShipmentById.mockResolvedValueOnce(bookedShipment);
      shippingRepo.findCarrierById.mockResolvedValue({
        ...mockCarrier,
        services: [],
      } as ShippingCarrierEntity);
      shippingRepo.updateShipment.mockResolvedValue(labeledShipment);

      const result = await service.generateLabel('shipment-uuid-1');
      expect(result.label_url).toContain('.pdf');
      expect(result.status).toBe('label_generated');
    });

    it('should throw if shipment is not booked', async () => {
      shippingRepo.findShipmentById.mockResolvedValue({
        ...mockShipment,
        status: 'pending',
      } as ShipmentEntity);

      await expect(service.generateLabel('shipment-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateShipmentStatus', () => {
    it('should update status with valid transition', async () => {
      const bookedShipment = { ...mockShipment, status: 'booked' } as ShipmentEntity;
      const pickedUpShipment = { ...mockShipment, status: 'picked_up' } as ShipmentEntity;

      shippingRepo.findShipmentById.mockResolvedValueOnce(bookedShipment);
      shippingRepo.updateShipment.mockResolvedValue(pickedUpShipment);

      const result = await service.updateShipmentStatus('shipment-uuid-1', {
        status: 'picked_up',
      });

      expect(result.status).toBe('picked_up');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        SHIPPING_EVENTS.TOPIC,
        SHIPPING_EVENTS.SHIPMENT_PICKED_UP,
        expect.any(Object),
      );
    });

    it('should reject invalid status transitions', async () => {
      shippingRepo.findShipmentById.mockResolvedValue({
        ...mockShipment,
        status: 'pending',
      } as ShipmentEntity);

      await expect(
        service.updateShipmentStatus('shipment-uuid-1', { status: 'delivered' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set actual_pickup_at when picked_up', async () => {
      const bookedShipment = { ...mockShipment, status: 'label_generated' } as ShipmentEntity;
      shippingRepo.findShipmentById.mockResolvedValueOnce(bookedShipment);
      shippingRepo.updateShipment.mockImplementation(async (id, data) => {
        expect(data.actual_pickup_at).toBeInstanceOf(Date);
        return { ...bookedShipment, ...data } as ShipmentEntity;
      });

      await service.updateShipmentStatus('shipment-uuid-1', { status: 'picked_up' });
    });

    it('should set actual_delivery_at when delivered', async () => {
      const inTransitShipment = { ...mockShipment, status: 'out_for_delivery' } as ShipmentEntity;
      shippingRepo.findShipmentById.mockResolvedValueOnce(inTransitShipment);
      shippingRepo.updateShipment.mockImplementation(async (id, data) => {
        expect(data.actual_delivery_at).toBeInstanceOf(Date);
        return { ...inTransitShipment, ...data } as ShipmentEntity;
      });

      await service.updateShipmentStatus('shipment-uuid-1', { status: 'delivered' });
    });
  });

  describe('cancelShipment', () => {
    it('should cancel a pending shipment', async () => {
      const pending = { ...mockShipment, status: 'pending' } as ShipmentEntity;
      const cancelled = { ...mockShipment, status: 'cancelled' } as ShipmentEntity;

      shippingRepo.findShipmentById.mockResolvedValueOnce(pending);
      shippingRepo.updateShipment.mockResolvedValue(cancelled);

      const result = await service.cancelShipment('shipment-uuid-1', 'No longer needed');
      expect(result.status).toBe('cancelled');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        SHIPPING_EVENTS.TOPIC,
        SHIPPING_EVENTS.SHIPMENT_CANCELLED,
        expect.objectContaining({ reason: 'No longer needed' }),
      );
    });

    it('should cancel a booked shipment and attempt carrier cancellation', async () => {
      const booked = {
        ...mockShipment,
        status: 'booked',
        tracking_number: 'JNT-123',
      } as ShipmentEntity;
      const cancelled = { ...booked, status: 'cancelled' } as ShipmentEntity;

      shippingRepo.findShipmentById
        .mockResolvedValueOnce(booked)
        .mockResolvedValueOnce(booked); // for getCarrier inside cancel
      shippingRepo.findCarrierById.mockResolvedValue({
        ...mockCarrier,
        services: [],
      } as ShippingCarrierEntity);
      shippingRepo.updateShipment.mockResolvedValue(cancelled);

      const result = await service.cancelShipment('shipment-uuid-1');
      expect(result.status).toBe('cancelled');
    });

    it('should throw if shipment cannot be cancelled', async () => {
      shippingRepo.findShipmentById.mockResolvedValue({
        ...mockShipment,
        status: 'delivered',
      } as ShipmentEntity);

      await expect(
        service.cancelShipment('shipment-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('trackShipment', () => {
    it('should return tracking info', async () => {
      const booked = {
        ...mockShipment,
        status: 'in_transit',
        tracking_number: 'JNT-123',
      } as ShipmentEntity;

      shippingRepo.findShipmentById.mockResolvedValue(booked);
      shippingRepo.findCarrierById.mockResolvedValue({
        ...mockCarrier,
        services: [],
      } as ShippingCarrierEntity);

      const tracking = await service.trackShipment('shipment-uuid-1');
      expect(tracking.status).toBeDefined();
      expect(tracking.events).toBeDefined();
    });

    it('should throw if no tracking number', async () => {
      shippingRepo.findShipmentById.mockResolvedValue({
        ...mockShipment,
        tracking_number: null,
      } as ShipmentEntity);

      await expect(service.trackShipment('shipment-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  // --- Shipment Queries ---

  describe('listShipments', () => {
    it('should return paginated shipments', async () => {
      shippingRepo.findShipments.mockResolvedValue({
        items: [mockShipment as ShipmentEntity],
        total: 1,
      });

      const result = await service.listShipments({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getShipmentStats', () => {
    const mockStats = {
      total: 100,
      pending: 10,
      booked: 15,
      in_transit: 25,
      delivered: 40,
      failed: 5,
      cancelled: 5,
    };

    it('should return cached stats', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockStats));

      const result = await service.getShipmentStats();
      expect(result.total).toBe(100);
      expect(shippingRepo.getShipmentStats).not.toHaveBeenCalled();
    });

    it('should fetch and cache stats if not cached', async () => {
      redisService.get.mockResolvedValue(null);
      shippingRepo.getShipmentStats.mockResolvedValue(mockStats);

      const result = await service.getShipmentStats();
      expect(result.total).toBe(100);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should scope stats by store ID', async () => {
      redisService.get.mockResolvedValue(null);
      shippingRepo.getShipmentStats.mockResolvedValue(mockStats);

      await service.getShipmentStats('store-uuid-1');
      expect(redisService.get).toHaveBeenCalledWith('shipping:stats:store-uuid-1');
    });
  });

  // --- Carrier Webhook ---

  describe('handleCarrierWebhook', () => {
    it('should process webhook and publish event', async () => {
      shippingRepo.findCarrierByCode.mockResolvedValue(mockCarrier as ShippingCarrierEntity);

      await service.handleCarrierWebhook('jnt', { event: 'delivered', tracking: 'JNT-123' });

      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        SHIPPING_EVENTS.TOPIC,
        SHIPPING_EVENTS.CARRIER_WEBHOOK_RECEIVED,
        expect.objectContaining({ carrier_code: 'jnt' }),
      );
    });

    it('should throw if carrier code not found', async () => {
      shippingRepo.findCarrierByCode.mockResolvedValue(null);

      await expect(
        service.handleCarrierWebhook('unknown', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- Status Transition Validation ---

  describe('status transitions', () => {
    const testTransition = async (from: string, to: string, shouldSucceed: boolean) => {
      shippingRepo.findShipmentById.mockResolvedValue({
        ...mockShipment,
        status: from,
        tracking_number: 'TRACK-123',
      } as ShipmentEntity);
      shippingRepo.updateShipment.mockResolvedValue({
        ...mockShipment,
        status: to,
      } as ShipmentEntity);

      if (shouldSucceed) {
        const result = await service.updateShipmentStatus('shipment-uuid-1', { status: to });
        expect(result.status).toBe(to);
      } else {
        await expect(
          service.updateShipmentStatus('shipment-uuid-1', { status: to }),
        ).rejects.toThrow(BadRequestException);
      }
    };

    it('should allow pending → booked', () => testTransition('pending', 'booked', true));
    it('should allow pending → cancelled', () => testTransition('pending', 'cancelled', true));
    it('should allow booked → picked_up', () => testTransition('booked', 'picked_up', true));
    it('should allow in_transit → delivered', () => testTransition('in_transit', 'delivered', true));
    it('should allow in_transit → failed', () => testTransition('in_transit', 'failed', true));
    it('should allow failed → in_transit (retry)', () => testTransition('failed', 'in_transit', true));
    it('should reject pending → delivered', () => testTransition('pending', 'delivered', false));
    it('should reject delivered → cancelled', () => testTransition('delivered', 'cancelled', false));
    it('should reject cancelled → booked', () => testTransition('cancelled', 'booked', false));
  });
});
