import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ZoneClientService } from '../zone-client.service';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('ZoneClientService', () => {
  let service: ZoneClientService;

  const mockZoneFeeResponse = {
    zone_id: 'zone-uuid-1',
    zone_name: 'Makati / BGC',
    distance_km: 3.5,
    base_fee: 39,
    distance_fee: 42,
    surge_multiplier: 1.0,
    total_fee: 81,
    currency: 'PHP',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZoneClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'ZONE_SERVICE_URL') return 'http://localhost:3014';
              if (key === 'ZONE_CLIENT_TIMEOUT') return 5000;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ZoneClientService>(ZoneClientService);
    service.resetCircuitBreaker();
    mockFetch.mockReset();
  });

  describe('calculateDeliveryFee', () => {
    it('should return zone-based fee on successful response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockZoneFeeResponse,
      });

      const fee = await service.calculateDeliveryFee(14.5547, 121.0244, 14.5500, 121.0300, 'standard');

      expect(fee).toBe(81);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fall back to static fee when no destination coords', async () => {
      const fee = await service.calculateDeliveryFee(14.5547, 121.0244, 0, 0, 'express');

      expect(fee).toBe(79);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fall back to static fee when no origin coords', async () => {
      const fee = await service.calculateDeliveryFee(0, 0, 14.5547, 121.0244, 'standard');

      expect(fee).toBe(49);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fall back to static fee when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const fee = await service.calculateDeliveryFee(14.5547, 121.0244, 14.5500, 121.0300, 'standard');

      expect(fee).toBe(49);
    });

    it('should fall back to static fee when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const fee = await service.calculateDeliveryFee(14.5547, 121.0244, 14.5500, 121.0300, 'instant');

      expect(fee).toBe(99);
    });

    it('should return correct static fee for each delivery type', () => {
      expect(service.getStaticFee('standard')).toBe(49);
      expect(service.getStaticFee('express')).toBe(79);
      expect(service.getStaticFee('scheduled')).toBe(39);
      expect(service.getStaticFee('instant')).toBe(99);
      expect(service.getStaticFee('unknown')).toBe(49);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after 3 consecutive failures', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      expect(service.isCircuitOpen()).toBe(false);

      // 3 failures
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');

      expect(service.isCircuitOpen()).toBe(true);
    });

    it('should use static fee while circuit is open', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      // Open the circuit
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');

      expect(service.isCircuitOpen()).toBe(true);

      // Next call should not attempt fetch
      mockFetch.mockClear();
      const fee = await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'express');

      expect(fee).toBe(79);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reset circuit breaker on successful call', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockZoneFeeResponse,
        });

      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');
      // Circuit not yet open (only 2 failures)
      expect(service.isCircuitOpen()).toBe(false);

      // Successful call resets
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');
      expect(service.isCircuitOpen()).toBe(false);
    });

    it('should reset via resetCircuitBreaker()', async () => {
      mockFetch.mockRejectedValue(new Error('fail'));
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');
      await service.calculateDeliveryFee(14.5, 121.0, 14.55, 121.03, 'standard');

      expect(service.isCircuitOpen()).toBe(true);

      service.resetCircuitBreaker();
      expect(service.isCircuitOpen()).toBe(false);
    });
  });
});
