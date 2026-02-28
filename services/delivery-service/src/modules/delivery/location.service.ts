import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../config/redis.service';

const RIDERS_GEO_KEY = 'riders:locations';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly redis: RedisService) {}

  async updateRiderLocation(personnelId: string, lat: number, lng: number): Promise<void> {
    await this.redis.getClient().geoadd(RIDERS_GEO_KEY, lng, lat, personnelId);
    this.logger.debug(`Updated location for rider ${personnelId}: lat=${lat}, lng=${lng}`);
  }

  async removeRiderLocation(personnelId: string): Promise<void> {
    await this.redis.getClient().zrem(RIDERS_GEO_KEY, personnelId);
    this.logger.debug(`Removed location for rider ${personnelId}`);
  }

  async findNearbyRiders(lat: number, lng: number, radiusKm: number): Promise<string[]> {
    const results = await this.redis.getClient().geosearch(
      RIDERS_GEO_KEY,
      'FROMLONLAT',
      lng,
      lat,
      'BYRADIUS',
      radiusKm,
      'km',
      'ASC',
      'COUNT',
      20,
    );
    return results as string[];
  }

  async getRiderLocation(personnelId: string): Promise<{ lat: number; lng: number } | null> {
    const positions = await this.redis.getClient().geopos(RIDERS_GEO_KEY, personnelId);
    if (positions && positions[0]) {
      return {
        lng: parseFloat(positions[0][0] as string),
        lat: parseFloat(positions[0][1] as string),
      };
    }
    return null;
  }

  async getDistanceBetween(
    personnelId: string,
    lat: number,
    lng: number,
  ): Promise<number | null> {
    const tempKey = `temp:geo:${Date.now()}`;
    try {
      await this.redis.getClient().geoadd(tempKey, lng, lat, 'target');
      const riderPos = await this.getRiderLocation(personnelId);
      if (!riderPos) return null;

      await this.redis.getClient().geoadd(tempKey, riderPos.lng, riderPos.lat, 'rider');
      const dist = await (this.redis.getClient() as any).geodist(tempKey, 'rider', 'target', 'km');
      return dist ? parseFloat(dist) : null;
    } finally {
      await this.redis.getClient().del(tempKey);
    }
  }

  async setRiderOnlineStatus(personnelId: string, isOnline: boolean): Promise<void> {
    const statusKey = `delivery:rider:status:${personnelId}`;
    if (isOnline) {
      await this.redis.set(statusKey, 'online', 86400);
    } else {
      await this.redis.del(statusKey);
      await this.removeRiderLocation(personnelId);
    }
  }
}
