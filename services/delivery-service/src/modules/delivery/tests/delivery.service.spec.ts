import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DeliveryService } from '../delivery.service';
import { DeliveryRepository } from '../delivery.repository';
import { LocationService } from '../location.service';
import { KafkaProducerService } from '../../../config/kafka-producer.service';
import { DeliveryGateway } from '../delivery.gateway';
import { DeliveryPersonnelEntity } from '../entities/delivery-personnel.entity';
import { DeliveryEntity } from '../entities/delivery.entity';
import { DeliveryStatus } from '../dto/update-delivery-status.dto';
import { VehicleType } from '../dto/register-rider.dto';

describe('DeliveryService', () => {
  let service: DeliveryService;
  let repository: jest.Mocked<DeliveryRepository>;
  let locationService: jest.Mocked<LocationService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;
  let deliveryGateway: jest.Mocked<DeliveryGateway>;

  const mockPersonnel: Partial<DeliveryPersonnelEntity> = {
    id: 'personnel-uuid-1',
    user_id: 'user-uuid-1',
    vehicle_type: 'motorcycle',
    vehicle_plate: 'ABC-1234',
    license_number: 'LIC-001',
    license_expiry: new Date('2027-12-31'),
    status: 'active',
    is_online: true,
    current_latitude: 14.5995,
    current_longitude: 120.9842,
    current_zone_id: 'zone-uuid-1',
    max_concurrent_orders: 2,
    current_order_count: 0,
    rating_average: 4.5,
    total_deliveries: 100,
    created_at: new Date('2026-01-01'),
  };

  const mockDelivery: Partial<DeliveryEntity> = {
    id: 'delivery-uuid-1',
    order_id: 'order-uuid-1',
    personnel_id: 'personnel-uuid-1',
    status: 'assigned',
    pickup_location: { lat: 14.5995, lng: 120.9842 },
    dropoff_location: { lat: 14.6042, lng: 120.9822 },
    estimated_pickup_at: new Date(),
    distance_km: 2.5,
    delivery_fee: 49,
    cod_amount: 0,
    cod_collected: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        {
          provide: DeliveryRepository,
          useValue: {
            createPersonnel: jest.fn(),
            findPersonnelById: jest.fn(),
            findPersonnelByUserId: jest.fn(),
            updatePersonnel: jest.fn(),
            toggleOnline: jest.fn(),
            updateLocation: jest.fn(),
            findOnlineAvailablePersonnel: jest.fn(),
            incrementOrderCount: jest.fn(),
            decrementOrderCount: jest.fn(),
            incrementTotalDeliveries: jest.fn(),
            createDelivery: jest.fn(),
            findDeliveryById: jest.fn(),
            findDeliveryByOrderId: jest.fn(),
            findDeliveriesByPersonnelId: jest.fn(),
            updateDelivery: jest.fn(),
            updateDeliveryStatus: jest.fn(),
            findAllActiveDeliveries: jest.fn(),
            findActiveDeliveriesByPersonnelId: jest.fn(),
          },
        },
        {
          provide: LocationService,
          useValue: {
            updateRiderLocation: jest.fn(),
            removeRiderLocation: jest.fn(),
            findNearbyRiders: jest.fn(),
            getRiderLocation: jest.fn(),
            getDistanceBetween: jest.fn(),
            setRiderOnlineStatus: jest.fn(),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: DeliveryGateway,
          useValue: {
            broadcastLocationUpdate: jest.fn(),
            broadcastStatusUpdate: jest.fn(),
            notifyRider: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
    repository = module.get(DeliveryRepository);
    locationService = module.get(LocationService);
    kafkaProducer = module.get(KafkaProducerService);
    deliveryGateway = module.get(DeliveryGateway);
  });

  // ============================================================
  // Rider Registration
  // ============================================================
  describe('registerRider', () => {
    const registerDto = {
      user_id: 'user-uuid-1',
      vehicle_type: VehicleType.MOTORCYCLE,
      vehicle_plate: 'ABC-1234',
      license_number: 'LIC-001',
      license_expiry: '2027-12-31',
    };

    it('should register a new rider successfully', async () => {
      repository.findPersonnelByUserId.mockResolvedValue(null);
      repository.createPersonnel.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);

      const result = await service.registerRider(registerDto);

      expect(result).toEqual(mockPersonnel);
      expect(repository.createPersonnel).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-uuid-1',
          vehicle_type: 'motorcycle',
          status: 'pending',
          is_online: false,
          current_order_count: 0,
          max_concurrent_orders: 2,
        }),
      );
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.delivery.events',
        'com.daltaners.delivery.rider_registered',
        expect.objectContaining({ user_id: 'user-uuid-1' }),
      );
    });

    it('should throw ConflictException if rider already registered', async () => {
      repository.findPersonnelByUserId.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);

      await expect(service.registerRider(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  // ============================================================
  // Get Rider
  // ============================================================
  describe('getRiderByUserId', () => {
    it('should return rider when found', async () => {
      repository.findPersonnelByUserId.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);

      const result = await service.getRiderByUserId('user-uuid-1');
      expect(result).toEqual(mockPersonnel);
    });

    it('should throw NotFoundException when rider not found', async () => {
      repository.findPersonnelByUserId.mockResolvedValue(null);

      await expect(service.getRiderByUserId('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRiderById', () => {
    it('should return rider when found', async () => {
      repository.findPersonnelById.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);

      const result = await service.getRiderById('personnel-uuid-1');
      expect(result).toEqual(mockPersonnel);
    });

    it('should throw NotFoundException when rider not found', async () => {
      repository.findPersonnelById.mockResolvedValue(null);

      await expect(service.getRiderById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // Toggle Online
  // ============================================================
  describe('toggleOnline', () => {
    it('should toggle rider online', async () => {
      const updatedPersonnel = { ...mockPersonnel, is_online: true };
      repository.findPersonnelByUserId.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);
      repository.toggleOnline.mockResolvedValue(updatedPersonnel as DeliveryPersonnelEntity);

      const result = await service.toggleOnline('user-uuid-1', true);

      expect(result.is_online).toBe(true);
      expect(locationService.setRiderOnlineStatus).toHaveBeenCalledWith('personnel-uuid-1', true);
      expect(locationService.removeRiderLocation).not.toHaveBeenCalled();
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.delivery.events',
        'com.daltaners.delivery.rider_status_changed',
        expect.objectContaining({ is_online: true }),
      );
    });

    it('should toggle rider offline and remove location', async () => {
      repository.findPersonnelByUserId.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);
      repository.toggleOnline.mockResolvedValue({ ...mockPersonnel, is_online: false } as DeliveryPersonnelEntity);

      await service.toggleOnline('user-uuid-1', false);

      expect(locationService.setRiderOnlineStatus).toHaveBeenCalledWith('personnel-uuid-1', false);
      expect(locationService.removeRiderLocation).toHaveBeenCalledWith('personnel-uuid-1');
    });

    it('should throw BadRequestException if rider is not active', async () => {
      const pendingRider = { ...mockPersonnel, status: 'pending' };
      repository.findPersonnelByUserId.mockResolvedValue(pendingRider as DeliveryPersonnelEntity);

      await expect(service.toggleOnline('user-uuid-1', true)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // GPS Location
  // ============================================================
  describe('updateGpsLocation', () => {
    const locationDto = {
      latitude: 14.6000,
      longitude: 120.9850,
      speed: 30,
      heading: 45,
      accuracy: 5,
      battery_level: 80,
    };

    it('should update location and broadcast to active deliveries', async () => {
      const activeDeliveries = [
        { ...mockDelivery, order_id: 'order-1' },
        { ...mockDelivery, order_id: 'order-2' },
      ];
      repository.findPersonnelByUserId.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);
      repository.findActiveDeliveriesByPersonnelId.mockResolvedValue(activeDeliveries as DeliveryEntity[]);

      await service.updateGpsLocation('user-uuid-1', locationDto);

      expect(locationService.updateRiderLocation).toHaveBeenCalledWith('personnel-uuid-1', 14.6000, 120.9850);
      expect(repository.updateLocation).toHaveBeenCalledWith('personnel-uuid-1', 14.6000, 120.9850);
      expect(deliveryGateway.broadcastLocationUpdate).toHaveBeenCalledTimes(2);
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.delivery.location',
        'com.daltaners.delivery.location_updated',
        expect.objectContaining({ latitude: 14.6000 }),
      );
    });

    it('should throw BadRequestException if rider is offline', async () => {
      const offlineRider = { ...mockPersonnel, is_online: false };
      repository.findPersonnelByUserId.mockResolvedValue(offlineRider as DeliveryPersonnelEntity);

      await expect(service.updateGpsLocation('user-uuid-1', locationDto)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // Find Nearby Riders
  // ============================================================
  describe('findNearbyRiders', () => {
    it('should return nearby riders with locations', async () => {
      locationService.findNearbyRiders.mockResolvedValue(['rider-1', 'rider-2']);
      locationService.getRiderLocation
        .mockResolvedValueOnce({ lat: 14.6, lng: 120.98 })
        .mockResolvedValueOnce({ lat: 14.61, lng: 120.99 });

      const result = await service.findNearbyRiders(14.5995, 120.9842, 5);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ personnel_id: 'rider-1', location: { lat: 14.6, lng: 120.98 } });
    });

    it('should return empty array when no riders found', async () => {
      locationService.findNearbyRiders.mockResolvedValue([]);

      const result = await service.findNearbyRiders(14.5995, 120.9842, 5);
      expect(result).toHaveLength(0);
    });
  });

  // ============================================================
  // Rider Assignment (Complex Algorithm)
  // ============================================================
  describe('assignRider', () => {
    const pickupLat = 14.5995;
    const pickupLng = 120.9842;

    it('should return existing delivery if already assigned and active', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(mockDelivery as DeliveryEntity);

      const result = await service.assignRider('order-uuid-1', pickupLat, pickupLng);
      expect(result).toEqual(mockDelivery);
      expect(locationService.findNearbyRiders).not.toHaveBeenCalled();
    });

    it('should proceed if existing delivery is cancelled', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue({ ...mockDelivery, status: 'cancelled' } as DeliveryEntity);
      locationService.findNearbyRiders.mockResolvedValue(['rider-1']);
      repository.findOnlineAvailablePersonnel.mockResolvedValue([mockPersonnel as DeliveryPersonnelEntity]);
      locationService.getDistanceBetween.mockResolvedValue(2.5);
      repository.createDelivery.mockResolvedValue(mockDelivery as DeliveryEntity);

      const result = await service.assignRider('order-uuid-1', pickupLat, pickupLng);
      expect(result).toBeDefined();
    });

    it('should select highest scored rider', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(null);
      locationService.findNearbyRiders.mockResolvedValue(['rider-1', 'rider-2']);

      const riderA = {
        ...mockPersonnel,
        id: 'rider-1',
        rating_average: 4.5,
        current_order_count: 0,
      };
      const riderB = {
        ...mockPersonnel,
        id: 'rider-2',
        rating_average: 3.0,
        current_order_count: 1,
      };
      repository.findOnlineAvailablePersonnel.mockResolvedValue([riderA, riderB] as DeliveryPersonnelEntity[]);
      locationService.getDistanceBetween
        .mockResolvedValueOnce(1.0) // rider-1 closer
        .mockResolvedValueOnce(3.0); // rider-2 farther
      repository.createDelivery.mockResolvedValue(mockDelivery as DeliveryEntity);

      await service.assignRider('order-uuid-1', pickupLat, pickupLng);

      expect(repository.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({ personnel_id: 'rider-1' }),
      );
      expect(repository.incrementOrderCount).toHaveBeenCalledWith('rider-1');
    });

    it('should expand search radius when no riders found at smaller radius', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(null);
      // First radius (5km): no riders
      locationService.findNearbyRiders
        .mockResolvedValueOnce([])
        // Second radius (10km): riders found
        .mockResolvedValueOnce(['rider-1']);
      repository.findOnlineAvailablePersonnel.mockResolvedValue([mockPersonnel as DeliveryPersonnelEntity]);
      locationService.getDistanceBetween.mockResolvedValue(7.0);
      repository.createDelivery.mockResolvedValue(mockDelivery as DeliveryEntity);

      await service.assignRider('order-uuid-1', pickupLat, pickupLng);

      expect(locationService.findNearbyRiders).toHaveBeenCalledTimes(2);
      expect(repository.createDelivery).toHaveBeenCalled();
    });

    it('should return null and publish no_rider_available when all radii exhausted', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(null);
      locationService.findNearbyRiders.mockResolvedValue([]);

      const result = await service.assignRider('order-uuid-1', pickupLat, pickupLng);

      expect(result).toBeNull();
      expect(locationService.findNearbyRiders).toHaveBeenCalledTimes(3); // 5, 10, 15
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.delivery.events',
        'com.daltaners.delivery.no_rider_available',
        expect.objectContaining({ order_id: 'order-uuid-1' }),
      );
    });

    it('should filter by zone when zoneId option provided', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(null);
      locationService.findNearbyRiders.mockResolvedValue(['rider-1', 'rider-2']);

      const zoneRider = { ...mockPersonnel, id: 'rider-1', current_zone_id: 'zone-uuid-1' };
      const otherRider = { ...mockPersonnel, id: 'rider-2', current_zone_id: 'zone-uuid-2' };
      repository.findOnlineAvailablePersonnel.mockResolvedValue(
        [zoneRider, otherRider] as DeliveryPersonnelEntity[],
      );
      locationService.getDistanceBetween.mockResolvedValue(2.0);
      repository.createDelivery.mockResolvedValue(mockDelivery as DeliveryEntity);

      await service.assignRider('order-uuid-1', pickupLat, pickupLng, { zoneId: 'zone-uuid-1' });

      // Should only score the zone-matching rider
      expect(locationService.getDistanceBetween).toHaveBeenCalledTimes(1);
      expect(repository.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({ personnel_id: 'rider-1' }),
      );
    });

    it('should filter by vehicle type when requiredVehicle option provided', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(null);
      locationService.findNearbyRiders.mockResolvedValue(['rider-1', 'rider-2']);

      const bikeRider = { ...mockPersonnel, id: 'rider-1', vehicle_type: 'bicycle' };
      const carRider = { ...mockPersonnel, id: 'rider-2', vehicle_type: 'car' };
      repository.findOnlineAvailablePersonnel.mockResolvedValue(
        [bikeRider, carRider] as DeliveryPersonnelEntity[],
      );
      locationService.getDistanceBetween.mockResolvedValue(2.0);
      repository.createDelivery.mockResolvedValue(mockDelivery as DeliveryEntity);

      await service.assignRider('order-uuid-1', pickupLat, pickupLng, { requiredVehicle: 'car' });

      // Only car rider should be selected (bicycle < car in capacity order)
      expect(repository.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({ personnel_id: 'rider-2' }),
      );
    });

    it('should publish Kafka event and broadcast WebSocket on successful assignment', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(null);
      locationService.findNearbyRiders.mockResolvedValue(['rider-1']);
      repository.findOnlineAvailablePersonnel.mockResolvedValue([mockPersonnel as DeliveryPersonnelEntity]);
      locationService.getDistanceBetween.mockResolvedValue(2.5);
      repository.createDelivery.mockResolvedValue(mockDelivery as DeliveryEntity);

      await service.assignRider('order-uuid-1', pickupLat, pickupLng);

      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.delivery.events',
        'com.daltaners.delivery.assigned',
        expect.objectContaining({
          order_id: 'order-uuid-1',
          personnel_id: 'personnel-uuid-1',
        }),
      );
      expect(deliveryGateway.broadcastStatusUpdate).toHaveBeenCalledWith('order-uuid-1', 'assigned');
    });

    it('should use radius as fallback distance when getDistanceBetween returns null', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(null);
      locationService.findNearbyRiders.mockResolvedValue(['rider-1']);
      repository.findOnlineAvailablePersonnel.mockResolvedValue([mockPersonnel as DeliveryPersonnelEntity]);
      locationService.getDistanceBetween.mockResolvedValue(null);
      repository.createDelivery.mockResolvedValue(mockDelivery as DeliveryEntity);

      await service.assignRider('order-uuid-1', pickupLat, pickupLng);

      // Should still create delivery using radius (5km) as fallback distance
      expect(repository.createDelivery).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Create Delivery
  // ============================================================
  describe('createDelivery', () => {
    const createDto = {
      order_id: 'order-uuid-2',
      pickup_location: { lat: 14.5995, lng: 120.9842 },
      dropoff_location: { lat: 14.6042, lng: 120.9822 },
      delivery_fee: 49,
      cod_amount: 100,
      tip_amount: 20,
    };

    it('should create delivery successfully', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(null);
      repository.createDelivery.mockResolvedValue(mockDelivery as DeliveryEntity);

      const result = await service.createDelivery(createDto);
      expect(result).toEqual(mockDelivery);
    });

    it('should throw ConflictException if active delivery already exists', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(mockDelivery as DeliveryEntity);

      await expect(service.createDelivery(createDto)).rejects.toThrow(ConflictException);
    });

    it('should allow creation if existing delivery is cancelled', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue({ ...mockDelivery, status: 'cancelled' } as DeliveryEntity);
      repository.createDelivery.mockResolvedValue(mockDelivery as DeliveryEntity);

      const result = await service.createDelivery(createDto);
      expect(result).toBeDefined();
    });
  });

  // ============================================================
  // Accept Delivery
  // ============================================================
  describe('acceptDelivery', () => {
    it('should accept delivery assigned to the rider', async () => {
      const accepted = { ...mockDelivery, status: 'accepted' };
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);
      repository.findPersonnelByUserId.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);
      repository.updateDeliveryStatus.mockResolvedValue(accepted as DeliveryEntity);

      const result = await service.acceptDelivery('delivery-uuid-1', 'user-uuid-1');

      expect(result.status).toBe('accepted');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.delivery.events',
        'com.daltaners.delivery.accepted',
        expect.objectContaining({ id: 'delivery-uuid-1' }),
      );
    });

    it('should throw BadRequestException if delivery not assigned to rider', async () => {
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);
      repository.findPersonnelByUserId.mockResolvedValue({
        ...mockPersonnel,
        id: 'different-personnel',
      } as DeliveryPersonnelEntity);

      await expect(service.acceptDelivery('delivery-uuid-1', 'user-uuid-2')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if delivery is not in assigned status', async () => {
      repository.findDeliveryById.mockResolvedValue({ ...mockDelivery, status: 'accepted' } as DeliveryEntity);
      repository.findPersonnelByUserId.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);

      await expect(service.acceptDelivery('delivery-uuid-1', 'user-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // Reject Delivery
  // ============================================================
  describe('rejectDelivery', () => {
    it('should reject delivery and decrement order count', async () => {
      const rejected = { ...mockDelivery, status: 'cancelled', failure_reason: 'Rejected by rider' };
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);
      repository.findPersonnelByUserId.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);
      repository.updateDeliveryStatus.mockResolvedValue(rejected as DeliveryEntity);

      const result = await service.rejectDelivery('delivery-uuid-1', 'user-uuid-1');

      expect(repository.decrementOrderCount).toHaveBeenCalledWith('personnel-uuid-1');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.delivery.events',
        'com.daltaners.delivery.rejected',
        expect.objectContaining({ id: 'delivery-uuid-1' }),
      );
    });

    it('should throw BadRequestException if delivery not assigned to rider', async () => {
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);
      repository.findPersonnelByUserId.mockResolvedValue({
        ...mockPersonnel,
        id: 'different-personnel',
      } as DeliveryPersonnelEntity);

      await expect(service.rejectDelivery('delivery-uuid-1', 'user-uuid-2')).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // Update Delivery Status
  // ============================================================
  describe('updateDeliveryStatus', () => {
    it('should transition from assigned to accepted', async () => {
      const updated = { ...mockDelivery, status: 'accepted' };
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);
      repository.updateDeliveryStatus.mockResolvedValue(updated as DeliveryEntity);

      const result = await service.updateDeliveryStatus('delivery-uuid-1', {
        status: DeliveryStatus.ACCEPTED,
      });

      expect(result.status).toBe('accepted');
    });

    it('should set actual_pickup_at when status is picked_up', async () => {
      const acceptedDelivery = { ...mockDelivery, status: 'at_store' };
      repository.findDeliveryById.mockResolvedValue(acceptedDelivery as DeliveryEntity);
      repository.updateDeliveryStatus.mockResolvedValue({ ...mockDelivery, status: 'picked_up' } as DeliveryEntity);

      await service.updateDeliveryStatus('delivery-uuid-1', {
        status: DeliveryStatus.PICKED_UP,
      });

      expect(repository.updateDeliveryStatus).toHaveBeenCalledWith(
        'delivery-uuid-1',
        'picked_up',
        expect.objectContaining({ actual_pickup_at: expect.any(Date) }),
      );
    });

    it('should set actual_delivery_at and update rider stats on delivered', async () => {
      const inTransitDelivery = { ...mockDelivery, status: 'arrived' };
      repository.findDeliveryById.mockResolvedValue(inTransitDelivery as DeliveryEntity);
      repository.updateDeliveryStatus.mockResolvedValue({ ...mockDelivery, status: 'delivered' } as DeliveryEntity);

      await service.updateDeliveryStatus('delivery-uuid-1', {
        status: DeliveryStatus.DELIVERED,
      });

      expect(repository.decrementOrderCount).toHaveBeenCalledWith('personnel-uuid-1');
      expect(repository.incrementTotalDeliveries).toHaveBeenCalledWith('personnel-uuid-1');
    });

    it('should decrement order count on failed status', async () => {
      const inTransitDelivery = { ...mockDelivery, status: 'in_transit' };
      repository.findDeliveryById.mockResolvedValue(inTransitDelivery as DeliveryEntity);
      repository.updateDeliveryStatus.mockResolvedValue({ ...mockDelivery, status: 'failed' } as DeliveryEntity);

      await service.updateDeliveryStatus('delivery-uuid-1', {
        status: DeliveryStatus.FAILED,
        failure_reason: 'Customer not available',
      });

      expect(repository.decrementOrderCount).toHaveBeenCalledWith('personnel-uuid-1');
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);

      await expect(
        service.updateDeliveryStatus('delivery-uuid-1', { status: DeliveryStatus.DELIVERED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when failed status without failure_reason', async () => {
      const inTransitDelivery = { ...mockDelivery, status: 'in_transit' };
      repository.findDeliveryById.mockResolvedValue(inTransitDelivery as DeliveryEntity);

      await expect(
        service.updateDeliveryStatus('delivery-uuid-1', { status: DeliveryStatus.FAILED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include proof_of_delivery when provided', async () => {
      const arrivedDelivery = { ...mockDelivery, status: 'arrived' };
      repository.findDeliveryById.mockResolvedValue(arrivedDelivery as DeliveryEntity);
      repository.updateDeliveryStatus.mockResolvedValue({ ...mockDelivery, status: 'delivered' } as DeliveryEntity);

      const proof = { photo_url: 'https://cdn.daltaners.com/proof.jpg', otp_verified: true };
      await service.updateDeliveryStatus('delivery-uuid-1', {
        status: DeliveryStatus.DELIVERED,
        proof_of_delivery: proof,
      });

      expect(repository.updateDeliveryStatus).toHaveBeenCalledWith(
        'delivery-uuid-1',
        'delivered',
        expect.objectContaining({ proof_of_delivery: proof }),
      );
    });

    it('should not modify rider stats for terminal statuses without personnel', async () => {
      const deliveryNoPerson = { ...mockDelivery, status: 'in_transit', personnel_id: null };
      repository.findDeliveryById.mockResolvedValue(deliveryNoPerson as DeliveryEntity);
      repository.updateDeliveryStatus.mockResolvedValue({ ...mockDelivery, status: 'failed' } as DeliveryEntity);

      await service.updateDeliveryStatus('delivery-uuid-1', {
        status: DeliveryStatus.FAILED,
        failure_reason: 'No rider',
      });

      expect(repository.decrementOrderCount).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Reassign Delivery
  // ============================================================
  describe('reassignDelivery', () => {
    it('should manually reassign to a specific rider', async () => {
      const newRider = {
        ...mockPersonnel,
        id: 'personnel-uuid-2',
        user_id: 'user-uuid-2',
        current_order_count: 0,
      };
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);
      repository.findPersonnelById.mockResolvedValue(newRider as DeliveryPersonnelEntity);
      repository.updateDelivery.mockResolvedValue({
        ...mockDelivery,
        personnel_id: 'personnel-uuid-2',
        status: 'assigned',
      } as DeliveryEntity);

      const result = await service.reassignDelivery('delivery-uuid-1', 'personnel-uuid-2', 'Slow delivery');

      expect(repository.decrementOrderCount).toHaveBeenCalledWith('personnel-uuid-1');
      expect(repository.incrementOrderCount).toHaveBeenCalledWith('personnel-uuid-2');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.delivery.events',
        'com.daltaners.delivery.reassigned',
        expect.objectContaining({
          previous_personnel_id: 'personnel-uuid-1',
          personnel_id: 'personnel-uuid-2',
        }),
      );
    });

    it('should throw BadRequestException for terminal status delivery', async () => {
      repository.findDeliveryById.mockResolvedValue({
        ...mockDelivery,
        status: 'delivered',
      } as DeliveryEntity);

      await expect(
        service.reassignDelivery('delivery-uuid-1', 'personnel-uuid-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if target rider is not active', async () => {
      const inactiveRider = { ...mockPersonnel, id: 'personnel-uuid-2', status: 'suspended' };
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);
      repository.findPersonnelById.mockResolvedValue(inactiveRider as DeliveryPersonnelEntity);

      await expect(
        service.reassignDelivery('delivery-uuid-1', 'personnel-uuid-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if target rider is at max capacity', async () => {
      const fullRider = {
        ...mockPersonnel,
        id: 'personnel-uuid-2',
        current_order_count: 2,
        max_concurrent_orders: 2,
      };
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);
      repository.findPersonnelById.mockResolvedValue(fullRider as DeliveryPersonnelEntity);

      await expect(
        service.reassignDelivery('delivery-uuid-1', 'personnel-uuid-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-reassign when no personnelId provided', async () => {
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);
      repository.updateDelivery.mockResolvedValue(null);
      // Mock assignRider flow
      repository.findDeliveryByOrderId.mockResolvedValue(null);
      locationService.findNearbyRiders.mockResolvedValue(['rider-1']);
      repository.findOnlineAvailablePersonnel.mockResolvedValue([mockPersonnel as DeliveryPersonnelEntity]);
      locationService.getDistanceBetween.mockResolvedValue(2.0);
      repository.createDelivery.mockResolvedValue({ ...mockDelivery, id: 'new-delivery-uuid' } as DeliveryEntity);

      const result = await service.reassignDelivery('delivery-uuid-1');

      expect(repository.decrementOrderCount).toHaveBeenCalledWith('personnel-uuid-1');
    });
  });

  // ============================================================
  // Auto Assign Delivery
  // ============================================================
  describe('autoAssignDelivery', () => {
    it('should throw BadRequestException for terminal status', async () => {
      repository.findDeliveryById.mockResolvedValue({
        ...mockDelivery,
        status: 'delivered',
      } as DeliveryEntity);

      await expect(service.autoAssignDelivery('delivery-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no pickup location', async () => {
      repository.findDeliveryById.mockResolvedValue({
        ...mockDelivery,
        pickup_location: null,
      } as DeliveryEntity);

      await expect(service.autoAssignDelivery('delivery-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no rider available', async () => {
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);
      repository.findDeliveryByOrderId.mockResolvedValue(null);
      locationService.findNearbyRiders.mockResolvedValue([]);

      await expect(service.autoAssignDelivery('delivery-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // Query Methods
  // ============================================================
  describe('getActiveDeliveries', () => {
    it('should return paginated active deliveries', async () => {
      repository.findAllActiveDeliveries.mockResolvedValue({
        items: [mockDelivery as DeliveryEntity],
        total: 1,
      });

      const result = await service.getActiveDeliveries(1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });
  });

  describe('getDeliveryById', () => {
    it('should return delivery when found', async () => {
      repository.findDeliveryById.mockResolvedValue(mockDelivery as DeliveryEntity);

      const result = await service.getDeliveryById('delivery-uuid-1');
      expect(result).toEqual(mockDelivery);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findDeliveryById.mockResolvedValue(null);

      await expect(service.getDeliveryById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDeliveryByOrderId', () => {
    it('should return delivery when found', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(mockDelivery as DeliveryEntity);

      const result = await service.getDeliveryByOrderId('order-uuid-1');
      expect(result).toEqual(mockDelivery);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findDeliveryByOrderId.mockResolvedValue(null);

      await expect(service.getDeliveryByOrderId('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyDeliveries', () => {
    it('should return paginated deliveries for rider', async () => {
      repository.findPersonnelByUserId.mockResolvedValue(mockPersonnel as DeliveryPersonnelEntity);
      repository.findDeliveriesByPersonnelId.mockResolvedValue({
        items: [mockDelivery as DeliveryEntity],
        total: 1,
      });

      const result = await service.getMyDeliveries('user-uuid-1', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException if rider not found', async () => {
      repository.findPersonnelByUserId.mockResolvedValue(null);

      await expect(service.getMyDeliveries('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
