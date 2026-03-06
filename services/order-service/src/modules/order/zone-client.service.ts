import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ZoneDeliveryFeeResult {
  zone_id: string;
  zone_name: string;
  distance_km: number;
  base_fee: number;
  distance_fee: number;
  surge_multiplier: number;
  total_fee: number;
  currency: string;
}

const STATIC_DELIVERY_FEE_MAP: Record<string, number> = {
  standard: 49.0,
  express: 79.0,
  scheduled: 39.0,
  instant: 99.0,
};

@Injectable()
export class ZoneClientService {
  private readonly logger = new Logger(ZoneClientService.name);
  private readonly zoneServiceUrl: string;
  private readonly timeoutMs: number;
  private circuitOpen = false;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 3;
  private readonly resetTimeoutMs = 30000; // 30 seconds

  constructor(private readonly configService: ConfigService) {
    this.zoneServiceUrl = this.configService.get<string>(
      'ZONE_SERVICE_URL',
      'http://localhost:3014',
    );
    this.timeoutMs = this.configService.get<number>('ZONE_CLIENT_TIMEOUT', 5000);
  }

  async calculateDeliveryFee(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    deliveryType: string,
  ): Promise<number> {
    // If no destination coords, use static fallback
    if (!destLat || !destLng || !originLat || !originLng) {
      return this.getStaticFee(deliveryType);
    }

    // Circuit breaker: if circuit is open, check if we should try again
    if (this.circuitOpen) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed < this.resetTimeoutMs) {
        this.logger.warn('Circuit breaker open — using static fee fallback');
        return this.getStaticFee(deliveryType);
      }
      // Half-open: try the request
      this.logger.log('Circuit breaker half-open — attempting zone service call');
    }

    try {
      const url = `${this.zoneServiceUrl}/api/v1/zones/delivery-fee?origin_lat=${originLat}&origin_lng=${originLng}&destination_lat=${destLat}&destination_lng=${destLng}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Zone service returned ${response.status}`);
      }

      const data = (await response.json()) as ZoneDeliveryFeeResult;

      // Reset circuit breaker on success
      this.circuitOpen = false;
      this.failureCount = 0;

      this.logger.log(
        `Zone-based fee: ₱${data.total_fee} (zone: ${data.zone_name}, ${data.distance_km}km)`,
      );
      return data.total_fee;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.circuitOpen = true;
        this.logger.error(
          `Circuit breaker opened after ${this.failureCount} failures — falling back to static fees`,
        );
      } else {
        this.logger.warn(
          `Zone service call failed (${this.failureCount}/${this.failureThreshold}): ${(error as Error).message}`,
        );
      }

      return this.getStaticFee(deliveryType);
    }
  }

  getStaticFee(deliveryType: string): number {
    return STATIC_DELIVERY_FEE_MAP[deliveryType] || 49.0;
  }

  isCircuitOpen(): boolean {
    return this.circuitOpen;
  }

  resetCircuitBreaker(): void {
    this.circuitOpen = false;
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}
