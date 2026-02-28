import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ZoneService } from '../zone.service';
import { ZoneRepository } from '../zone.repository';
import { DeliveryZoneEntity } from '../entities/zone.entity';

describe('ZoneService', () => {
  let service: ZoneService;
  let repository: jest.Mocked<ZoneRepository>;

  const mockZone: Partial<DeliveryZoneEntity> = {
    id: 'zone-uuid-1',
    name: 'Manila Central',
    city: 'Manila',
    province: 'Metro Manila',
    region: 'NCR',
    boundary: null as unknown as string,
    base_delivery_fee: 49,
    per_km_fee: 10,
    surge_multiplier: 1.0,
    is_active: true,
    max_delivery_radius_km: 10,
    capacity_limit: 100,
    current_capacity: 50,
    metadata: {},
    created_at: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZoneService,
        {
          provide: ZoneRepository,
          useValue: {
            createZone: jest.fn(),
            findZoneById: jest.fn(),
            findAllZones: jest.fn(),
            updateZone: jest.fn(),
            lookupZone: jest.fn(),
            incrementCapacity: jest.fn(),
            decrementCapacity: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ZoneService>(ZoneService);
    repository = module.get(ZoneRepository);
  });

  // ============================================================
  // Create Zone
  // ============================================================
  describe('createZone', () => {
    const createDto = {
      name: 'Manila Central',
      city: 'Manila',
      province: 'Metro Manila',
      region: 'NCR',
      base_delivery_fee: 49,
      per_km_fee: 10,
    };

    it('should create zone successfully', async () => {
      repository.createZone.mockResolvedValue(mockZone as DeliveryZoneEntity);

      const result = await service.createZone(createDto);
      expect(result).toEqual(mockZone);
      expect(repository.createZone).toHaveBeenCalledWith(createDto);
    });
  });

  // ============================================================
  // Find Zone
  // ============================================================
  describe('findZoneById', () => {
    it('should return zone when found', async () => {
      repository.findZoneById.mockResolvedValue(mockZone as DeliveryZoneEntity);

      const result = await service.findZoneById('zone-uuid-1');
      expect(result).toEqual(mockZone);
    });

    it('should throw NotFoundException when zone not found', async () => {
      repository.findZoneById.mockResolvedValue(null);

      await expect(service.findZoneById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllZones', () => {
    it('should return all active zones', async () => {
      repository.findAllZones.mockResolvedValue([mockZone as DeliveryZoneEntity]);

      const result = await service.findAllZones();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no zones', async () => {
      repository.findAllZones.mockResolvedValue([]);

      const result = await service.findAllZones();
      expect(result).toHaveLength(0);
    });
  });

  // ============================================================
  // Update Zone
  // ============================================================
  describe('updateZone', () => {
    it('should update zone successfully', async () => {
      const updated = { ...mockZone, name: 'Manila CBD' };
      repository.findZoneById.mockResolvedValue(mockZone as DeliveryZoneEntity);
      repository.updateZone.mockResolvedValue(updated as DeliveryZoneEntity);

      const result = await service.updateZone('zone-uuid-1', { name: 'Manila CBD' });
      expect(result.name).toBe('Manila CBD');
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      repository.findZoneById.mockResolvedValue(null);

      await expect(
        service.updateZone('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if update returns null', async () => {
      repository.findZoneById.mockResolvedValue(mockZone as DeliveryZoneEntity);
      repository.updateZone.mockResolvedValue(null);

      await expect(
        service.updateZone('zone-uuid-1', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // Lookup Zone
  // ============================================================
  describe('lookupZone', () => {
    it('should return zone for valid coordinates', async () => {
      repository.lookupZone.mockResolvedValue(mockZone as DeliveryZoneEntity);

      const result = await service.lookupZone(14.5995, 120.9842);
      expect(result).toEqual(mockZone);
    });

    it('should throw NotFoundException when no zone covers the location', async () => {
      repository.lookupZone.mockResolvedValue(null);

      await expect(service.lookupZone(0, 0)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // Calculate Delivery Fee
  // ============================================================
  describe('calculateDeliveryFee', () => {
    // Manila coordinates ~1km apart
    const originLat = 14.5995;
    const originLng = 120.9842;
    const destLat = 14.6050;
    const destLng = 120.9842;

    it('should calculate delivery fee correctly', async () => {
      repository.lookupZone.mockResolvedValue(mockZone as DeliveryZoneEntity);

      const result = await service.calculateDeliveryFee(originLat, originLng, destLat, destLng);

      expect(result.zone_id).toBe('zone-uuid-1');
      expect(result.zone_name).toBe('Manila Central');
      expect(result.base_fee).toBe(49);
      expect(result.surge_multiplier).toBe(1.0);
      expect(result.currency).toBe('PHP');
      expect(result.distance_km).toBeGreaterThan(0);
      expect(result.total_fee).toBeGreaterThan(49); // base + distance fee
    });

    it('should apply surge multiplier', async () => {
      const surgeZone = { ...mockZone, surge_multiplier: 1.5 };
      repository.lookupZone.mockResolvedValue(surgeZone as DeliveryZoneEntity);

      const result = await service.calculateDeliveryFee(originLat, originLng, destLat, destLng);

      expect(result.surge_multiplier).toBe(1.5);
      const expectedBase = 49 + result.distance_km * 10;
      const expectedTotal = Math.round(expectedBase * 1.5 * 100) / 100;
      expect(result.total_fee).toBeCloseTo(expectedTotal, 1);
    });

    it('should throw NotFoundException when destination zone not found', async () => {
      repository.lookupZone.mockResolvedValue(null);

      await expect(
        service.calculateDeliveryFee(originLat, originLng, destLat, destLng),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when distance exceeds max radius', async () => {
      // Points far apart (Manila to Cebu ~570km)
      const farLat = 10.3157;
      const farLng = 123.8854;
      repository.lookupZone.mockResolvedValue(mockZone as DeliveryZoneEntity);

      await expect(
        service.calculateDeliveryFee(originLat, originLng, farLat, farLng),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate zero distance fee for same origin and destination', async () => {
      repository.lookupZone.mockResolvedValue(mockZone as DeliveryZoneEntity);

      const result = await service.calculateDeliveryFee(
        originLat, originLng, originLat, originLng,
      );

      expect(result.distance_km).toBe(0);
      expect(result.distance_fee).toBe(0);
      expect(result.total_fee).toBe(49); // just base fee
    });
  });

  // ============================================================
  // Capacity Management
  // ============================================================
  describe('incrementCapacity', () => {
    it('should increment capacity when below limit', async () => {
      repository.findZoneById.mockResolvedValue(mockZone as DeliveryZoneEntity);

      await service.incrementCapacity('zone-uuid-1');

      expect(repository.incrementCapacity).toHaveBeenCalledWith('zone-uuid-1');
    });

    it('should throw NotFoundException if zone not found', async () => {
      repository.findZoneById.mockResolvedValue(null);

      await expect(service.incrementCapacity('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when at capacity limit', async () => {
      const fullZone = { ...mockZone, current_capacity: 100, capacity_limit: 100 };
      repository.findZoneById.mockResolvedValue(fullZone as DeliveryZoneEntity);

      await expect(service.incrementCapacity('zone-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('should allow increment when no capacity limit set', async () => {
      const noLimitZone = { ...mockZone, capacity_limit: null as unknown as number, current_capacity: 999 };
      repository.findZoneById.mockResolvedValue(noLimitZone as DeliveryZoneEntity);

      await service.incrementCapacity('zone-uuid-1');

      expect(repository.incrementCapacity).toHaveBeenCalledWith('zone-uuid-1');
    });
  });

  describe('decrementCapacity', () => {
    it('should decrement capacity successfully', async () => {
      repository.findZoneById.mockResolvedValue(mockZone as DeliveryZoneEntity);

      await service.decrementCapacity('zone-uuid-1');

      expect(repository.decrementCapacity).toHaveBeenCalledWith('zone-uuid-1');
    });

    it('should throw NotFoundException if zone not found', async () => {
      repository.findZoneById.mockResolvedValue(null);

      await expect(service.decrementCapacity('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
