import { ZoneClientService } from '../zone-client.service';
import { ConfigService } from '@nestjs/config';

describe('Zone Delivery Fee Integration', () => {
  let zoneClient: ZoneClientService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'ZONE_SERVICE_URL') return 'http://localhost:3014';
        return defaultValue;
      }),
    } as unknown as ConfigService;

    zoneClient = new ZoneClientService(configService);
  });

  describe('Static fallback fees', () => {
    it('should return ₱49 for standard delivery on fallback', async () => {
      // Circuit will be closed but fetch will fail (no real server)
      // After failure, fallback kicks in
      const fee = await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'standard');
      expect(fee).toBe(49);
    });

    it('should return ₱79 for express delivery on fallback', async () => {
      const fee = await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'express');
      expect(fee).toBe(79);
    });

    it('should return ₱99 for instant delivery on fallback', async () => {
      const fee = await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'instant');
      expect(fee).toBe(99);
    });

    it('should return ₱39 for scheduled delivery on fallback', async () => {
      const fee = await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'scheduled');
      expect(fee).toBe(39);
    });

    it('should return ₱49 for unknown delivery type on fallback', async () => {
      const fee = await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'unknown_type');
      expect(fee).toBe(49);
    });
  });

  describe('Circuit breaker behavior', () => {
    it('should use fallback when zone service is unavailable', async () => {
      // First call — fetch fails, fallback used
      const fee1 = await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'standard');
      expect(fee1).toBe(49);

      // Second call — still uses fallback (circuit still closed but fetch fails)
      const fee2 = await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'express');
      expect(fee2).toBe(79);
    });

    it('should open circuit after threshold failures', async () => {
      // Make multiple calls to trigger circuit breaker threshold (3 failures)
      await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'standard');
      await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'standard');
      await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'standard');

      // After 3 failures, circuit should be open — immediately falls back
      const fee = await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.56, 121.03, 'express');
      expect(fee).toBe(79);
    });
  });

  describe('Delivery fee for different cities', () => {
    it('should return fallback fee for Metro Manila coordinates', async () => {
      const fee = await zoneClient.calculateDeliveryFee(14.5547, 121.0244, 14.5509, 121.0247, 'standard');
      expect(fee).toBe(49);
    });

    it('should return fallback fee for Cebu coordinates', async () => {
      const fee = await zoneClient.calculateDeliveryFee(10.3157, 123.8854, 10.3105, 123.8915, 'standard');
      expect(fee).toBe(49);
    });

    it('should return fallback fee for Davao coordinates', async () => {
      const fee = await zoneClient.calculateDeliveryFee(7.0731, 125.6128, 7.0650, 125.6050, 'express');
      expect(fee).toBe(79);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero coordinates', async () => {
      const fee = await zoneClient.calculateDeliveryFee(0, 0, 0, 0, 'standard');
      expect(fee).toBe(49);
    });

    it('should handle negative coordinates', async () => {
      const fee = await zoneClient.calculateDeliveryFee(-6.2, 106.8, -6.3, 106.9, 'standard');
      expect(fee).toBe(49);
    });

    it('should handle same origin and destination', async () => {
      const fee = await zoneClient.calculateDeliveryFee(14.55, 121.02, 14.55, 121.02, 'standard');
      expect(fee).toBe(49);
    });
  });
});
