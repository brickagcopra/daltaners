import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { VendorService } from '../vendor.service';
import { VendorRepository } from '../vendor.repository';
import { KafkaProducerService } from '../kafka-producer.service';
import { VENDOR_EVENTS } from '../events/vendor.events';
import { Store, StoreCategory, StoreStatus } from '../entities/store.entity';
import { StoreLocation } from '../entities/store-location.entity';
import { OperatingHours } from '../entities/operating-hours.entity';
import { StoreStaff, StaffRole } from '../entities/store-staff.entity';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

describe('VendorService', () => {
  let service: VendorService;
  let repository: jest.Mocked<VendorRepository>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const ownerId = 'owner-uuid-1';

  const mockStore: Partial<Store> = {
    id: 'store-uuid-1',
    owner_id: ownerId,
    name: 'Test Sari-Sari Store',
    slug: 'test-sari-sari-store',
    description: 'A local store',
    category: StoreCategory.GROCERY,
    status: StoreStatus.PENDING,
    commission_rate: 15,
    contact_phone: '+639171234567',
    contact_email: 'store@test.com',
    preparation_time_minutes: 30,
    minimum_order_value: 200,
    rating_average: 0,
    rating_count: 0,
    total_orders: 0,
    is_featured: false,
    metadata: {},
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const mockLocation: Partial<StoreLocation> = {
    id: 'location-uuid-1',
    store_id: 'store-uuid-1',
    branch_name: 'Main Branch',
    address_line1: '123 Test St',
    city: 'Manila',
    province: 'Metro Manila',
    latitude: 14.5995,
    longitude: 120.9842,
    delivery_radius_km: 5,
    is_primary: true,
  };

  const mockHours: Partial<OperatingHours> = {
    id: 'hours-uuid-1',
    store_location_id: 'location-uuid-1',
    day_of_week: 1,
    open_time: '08:00',
    close_time: '22:00',
    is_closed: false,
  };

  const mockStaff: Partial<StoreStaff> = {
    id: 'staff-uuid-1',
    store_id: 'store-uuid-1',
    user_id: 'staff-user-uuid-1',
    role: StaffRole.STAFF,
    permissions: ['product:read', 'product:update'],
    is_active: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorService,
        {
          provide: VendorRepository,
          useValue: {
            createStore: jest.fn(),
            findStoreById: jest.fn(),
            findStoreBySlug: jest.fn(),
            findStoresByOwner: jest.fn(),
            updateStore: jest.fn(),
            storeExistsForOwner: jest.fn(),
            createLocation: jest.fn(),
            findLocationsByStoreId: jest.fn(),
            findLocationById: jest.fn(),
            updateLocation: jest.fn(),
            deleteLocation: jest.fn(),
            locationBelongsToStore: jest.fn(),
            setOperatingHours: jest.fn(),
            findOperatingHoursByLocationId: jest.fn(),
            findNearbyStores: jest.fn(),
            createStaff: jest.fn(),
            findStaffByStoreId: jest.fn(),
            findStaffById: jest.fn(),
            updateStaff: jest.fn(),
            removeStaff: jest.fn(),
            staffExistsForStore: jest.fn(),
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

    service = module.get<VendorService>(VendorService);
    repository = module.get(VendorRepository);
    kafkaProducer = module.get(KafkaProducerService);
  });

  // ============================================================
  // Create Store
  // ============================================================
  describe('createStore', () => {
    const createDto = {
      name: 'Test Sari-Sari Store',
      description: 'A local store',
      category: StoreCategory.GROCERY,
      contact_phone: '+639171234567',
      contact_email: 'store@test.com',
    };

    it('should create a store with unique slug', async () => {
      repository.findStoreBySlug.mockResolvedValue(null);
      repository.createStore.mockResolvedValue(mockStore as Store);

      const result = await service.createStore(ownerId, createDto);

      expect(result).toEqual(mockStore);
      expect(repository.createStore).toHaveBeenCalledWith(
        ownerId,
        createDto,
        'test-sari-sari-store',
      );
    });

    it('should append UUID to slug if slug already exists', async () => {
      repository.findStoreBySlug.mockResolvedValue(mockStore as Store);
      repository.createStore.mockResolvedValue(mockStore as Store);

      await service.createStore(ownerId, createDto);

      expect(repository.createStore).toHaveBeenCalledWith(
        ownerId,
        createDto,
        'test-sari-sari-store-mock-uui',
      );
    });

    it('should publish STORE_CREATED Kafka event', async () => {
      repository.findStoreBySlug.mockResolvedValue(null);
      repository.createStore.mockResolvedValue(mockStore as Store);

      await service.createStore(ownerId, createDto);

      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        VENDOR_EVENTS.STORE_CREATED,
        expect.objectContaining({ key: 'store-uuid-1' }),
      );
    });

    it('should not throw if Kafka publish fails', async () => {
      repository.findStoreBySlug.mockResolvedValue(null);
      repository.createStore.mockResolvedValue(mockStore as Store);
      kafkaProducer.publish.mockRejectedValue(new Error('Kafka down'));

      const result = await service.createStore(ownerId, createDto);
      expect(result).toEqual(mockStore);
    });
  });

  // ============================================================
  // Find Store
  // ============================================================
  describe('findStoreById', () => {
    it('should return store when found', async () => {
      repository.findStoreById.mockResolvedValue(mockStore as Store);

      const result = await service.findStoreById('store-uuid-1');
      expect(result).toEqual(mockStore);
    });

    it('should throw NotFoundException when store not found', async () => {
      repository.findStoreById.mockResolvedValue(null);

      await expect(service.findStoreById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findStoresByOwner', () => {
    it('should return list of stores owned by user', async () => {
      repository.findStoresByOwner.mockResolvedValue([mockStore as Store]);

      const result = await service.findStoresByOwner(ownerId);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no stores owned', async () => {
      repository.findStoresByOwner.mockResolvedValue([]);

      const result = await service.findStoresByOwner('no-stores-user');
      expect(result).toHaveLength(0);
    });
  });

  // ============================================================
  // Update Store
  // ============================================================
  describe('updateStore', () => {
    it('should update store fields', async () => {
      const updated = { ...mockStore, description: 'Updated desc' };
      repository.findStoreById.mockResolvedValue(mockStore as Store);
      repository.updateStore.mockResolvedValue(updated as Store);

      const result = await service.updateStore('store-uuid-1', ownerId, { description: 'Updated desc' });

      expect(result.description).toBe('Updated desc');
    });

    it('should throw NotFoundException if store not found', async () => {
      repository.findStoreById.mockResolvedValue(null);

      await expect(
        service.updateStore('nonexistent', ownerId, { description: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not the owner', async () => {
      repository.findStoreById.mockResolvedValue(mockStore as Store);

      await expect(
        service.updateStore('store-uuid-1', 'other-owner', { description: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should publish STORE_UPDATED event with changed fields', async () => {
      repository.findStoreById.mockResolvedValue(mockStore as Store);
      repository.updateStore.mockResolvedValue(mockStore as Store);

      await service.updateStore('store-uuid-1', ownerId, { description: 'New description' });

      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        VENDOR_EVENTS.STORE_UPDATED,
        expect.objectContaining({ key: 'store-uuid-1' }),
      );
    });

    it('should regenerate slug when name changes', async () => {
      repository.findStoreById
        .mockResolvedValueOnce(mockStore as Store) // initial fetch
        .mockResolvedValueOnce({ ...mockStore, name: 'New Name' } as Store); // re-fetch after update
      repository.findStoreBySlug.mockResolvedValue(null);
      repository.updateStore.mockResolvedValue({ ...mockStore, name: 'New Name' } as Store);

      await service.updateStore('store-uuid-1', ownerId, { name: 'New Name' });

      expect(repository.updateStore).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Verify Store Ownership
  // ============================================================
  describe('verifyStoreOwnership', () => {
    it('should pass when owner matches', async () => {
      repository.storeExistsForOwner.mockResolvedValue(true);

      await expect(service.verifyStoreOwnership('store-uuid-1', ownerId)).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException when not owner', async () => {
      repository.storeExistsForOwner.mockResolvedValue(false);

      await expect(
        service.verifyStoreOwnership('store-uuid-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // Location Methods
  // ============================================================
  describe('createLocation', () => {
    const locationDto = {
      branch_name: 'Branch 1',
      address_line1: '456 Test Ave',
      city: 'Quezon City',
      province: 'Metro Manila',
      latitude: 14.6488,
      longitude: 121.0509,
    };

    it('should create location after ownership verification', async () => {
      repository.storeExistsForOwner.mockResolvedValue(true);
      repository.createLocation.mockResolvedValue(mockLocation as StoreLocation);

      const result = await service.createLocation('store-uuid-1', ownerId, locationDto);

      expect(result).toEqual(mockLocation);
    });

    it('should throw ForbiddenException if not owner', async () => {
      repository.storeExistsForOwner.mockResolvedValue(false);

      await expect(
        service.createLocation('store-uuid-1', 'other-user', locationDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findLocationsByStoreId', () => {
    it('should return locations for existing store', async () => {
      repository.findStoreById.mockResolvedValue(mockStore as Store);
      repository.findLocationsByStoreId.mockResolvedValue([mockLocation as StoreLocation]);

      const result = await service.findLocationsByStoreId('store-uuid-1');
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if store does not exist', async () => {
      repository.findStoreById.mockResolvedValue(null);

      await expect(service.findLocationsByStoreId('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLocation', () => {
    it('should update location with ownership check', async () => {
      const updated = { ...mockLocation, city: 'Makati' };
      repository.findLocationById.mockResolvedValue(mockLocation as StoreLocation);
      repository.storeExistsForOwner.mockResolvedValue(true);
      repository.updateLocation.mockResolvedValue(updated as StoreLocation);

      const result = await service.updateLocation('location-uuid-1', ownerId, { city: 'Makati' });
      expect(result.city).toBe('Makati');
    });

    it('should throw NotFoundException if location not found', async () => {
      repository.findLocationById.mockResolvedValue(null);

      await expect(
        service.updateLocation('nonexistent', ownerId, { city: 'Makati' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteLocation', () => {
    it('should delete location with ownership check', async () => {
      repository.findLocationById.mockResolvedValue(mockLocation as StoreLocation);
      repository.storeExistsForOwner.mockResolvedValue(true);

      await service.deleteLocation('location-uuid-1', ownerId);

      expect(repository.deleteLocation).toHaveBeenCalledWith('location-uuid-1');
    });

    it('should throw NotFoundException if location not found', async () => {
      repository.findLocationById.mockResolvedValue(null);

      await expect(service.deleteLocation('nonexistent', ownerId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      repository.findLocationById.mockResolvedValue(mockLocation as StoreLocation);
      repository.storeExistsForOwner.mockResolvedValue(false);

      await expect(
        service.deleteLocation('location-uuid-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // Operating Hours
  // ============================================================
  describe('setOperatingHours', () => {
    const hoursDto = {
      hours: [
        { day_of_week: 1, open_time: '08:00', close_time: '22:00', is_closed: false },
        { day_of_week: 0, is_closed: true },
      ],
    };

    it('should set operating hours with ownership check', async () => {
      repository.findLocationById.mockResolvedValue(mockLocation as StoreLocation);
      repository.storeExistsForOwner.mockResolvedValue(true);
      repository.setOperatingHours.mockResolvedValue([mockHours as OperatingHours]);

      const result = await service.setOperatingHours('location-uuid-1', ownerId, hoursDto);
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if location not found', async () => {
      repository.findLocationById.mockResolvedValue(null);

      await expect(
        service.setOperatingHours('nonexistent', ownerId, hoursDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOperatingHours', () => {
    it('should return operating hours for location', async () => {
      repository.findLocationById.mockResolvedValue(mockLocation as StoreLocation);
      repository.findOperatingHoursByLocationId.mockResolvedValue([mockHours as OperatingHours]);

      const result = await service.getOperatingHours('location-uuid-1');
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if location not found', async () => {
      repository.findLocationById.mockResolvedValue(null);

      await expect(service.getOperatingHours('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // Nearby Stores
  // ============================================================
  describe('findNearbyStores', () => {
    it('should delegate to repository with coordinates', async () => {
      const nearbyResult = [{ ...mockLocation, distance_meters: 1500, store: mockStore }];
      repository.findNearbyStores.mockResolvedValue(nearbyResult as any);

      const result = await service.findNearbyStores(14.5995, 120.9842, 5);

      expect(repository.findNearbyStores).toHaveBeenCalledWith(14.5995, 120.9842, 5);
      expect(result).toHaveLength(1);
    });
  });

  // ============================================================
  // Staff Methods
  // ============================================================
  describe('addStaff', () => {
    const staffDto = {
      user_id: 'staff-user-uuid-1',
      role: StaffRole.STAFF,
      permissions: ['product:read'],
    };

    it('should add staff after ownership verification', async () => {
      repository.storeExistsForOwner.mockResolvedValue(true);
      repository.staffExistsForStore.mockResolvedValue(false);
      repository.createStaff.mockResolvedValue(mockStaff as StoreStaff);

      const result = await service.addStaff('store-uuid-1', ownerId, staffDto);
      expect(result).toEqual(mockStaff);
    });

    it('should throw ConflictException if user is already staff', async () => {
      repository.storeExistsForOwner.mockResolvedValue(true);
      repository.staffExistsForStore.mockResolvedValue(true);

      await expect(
        service.addStaff('store-uuid-1', ownerId, staffDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      repository.storeExistsForOwner.mockResolvedValue(false);

      await expect(
        service.addStaff('store-uuid-1', 'other-user', staffDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findStaffByStoreId', () => {
    it('should return staff with ownership check', async () => {
      repository.storeExistsForOwner.mockResolvedValue(true);
      repository.findStaffByStoreId.mockResolvedValue([mockStaff as StoreStaff]);

      const result = await service.findStaffByStoreId('store-uuid-1', ownerId);
      expect(result).toHaveLength(1);
    });
  });

  describe('updateStaff', () => {
    it('should update staff with ownership check', async () => {
      const updated = { ...mockStaff, role: 'manager' };
      repository.findStaffById.mockResolvedValue(mockStaff as StoreStaff);
      repository.storeExistsForOwner.mockResolvedValue(true);
      repository.updateStaff.mockResolvedValue(updated as StoreStaff);

      const result = await service.updateStaff('staff-uuid-1', ownerId, { role: 'manager' as any });
      expect(result.role).toBe('manager');
    });

    it('should throw NotFoundException if staff not found', async () => {
      repository.findStaffById.mockResolvedValue(null);

      await expect(
        service.updateStaff('nonexistent', ownerId, { role: 'manager' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeStaff', () => {
    it('should remove staff with ownership check', async () => {
      repository.findStaffById.mockResolvedValue(mockStaff as StoreStaff);
      repository.storeExistsForOwner.mockResolvedValue(true);

      await service.removeStaff('staff-uuid-1', ownerId);

      expect(repository.removeStaff).toHaveBeenCalledWith('staff-uuid-1');
    });

    it('should throw NotFoundException if staff not found', async () => {
      repository.findStaffById.mockResolvedValue(null);

      await expect(service.removeStaff('nonexistent', ownerId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      repository.findStaffById.mockResolvedValue(mockStaff as StoreStaff);
      repository.storeExistsForOwner.mockResolvedValue(false);

      await expect(
        service.removeStaff('staff-uuid-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
