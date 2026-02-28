import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class StockCacheService {
  private readonly logger = new Logger(StockCacheService.name);
  private static readonly STOCK_TTL_SECONDS = 300; // 5 minutes

  constructor(private readonly redis: RedisService) {}

  private getKey(productId: string, locationId: string): string {
    return `stock:${productId}:${locationId}`;
  }

  async getStockLevel(productId: string, locationId: string): Promise<number | null> {
    try {
      const val = await this.redis.get(this.getKey(productId, locationId));
      return val !== null ? parseInt(val, 10) : null;
    } catch (error) {
      this.logger.warn(
        `Failed to get cached stock level for product ${productId} at ${locationId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async setStockLevel(productId: string, locationId: string, quantity: number): Promise<void> {
    try {
      await this.redis.set(
        this.getKey(productId, locationId),
        quantity.toString(),
        StockCacheService.STOCK_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache stock level for product ${productId} at ${locationId}: ${(error as Error).message}`,
      );
    }
  }

  async invalidate(productId: string, locationId: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(productId, locationId));
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate stock cache for product ${productId} at ${locationId}: ${(error as Error).message}`,
      );
    }
  }

  async atomicReserve(
    productId: string,
    locationId: string,
    quantity: number,
  ): Promise<boolean> {
    const key = this.getKey(productId, locationId);
    const script = `
      local current = tonumber(redis.call('GET', KEYS[1]))
      if current == nil then return -1 end
      if current >= tonumber(ARGV[1]) then
        redis.call('DECRBY', KEYS[1], ARGV[1])
        return 1
      end
      return 0
    `;
    try {
      const result = await this.redis.getClient().eval(
        script,
        1,
        key,
        quantity.toString(),
      );
      if (result === -1) {
        this.logger.debug(
          `Cache miss during atomic reserve for product ${productId} at ${locationId}`,
        );
        return false;
      }
      return result === 1;
    } catch (error) {
      this.logger.warn(
        `Failed atomic reserve in cache for product ${productId} at ${locationId}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  async atomicRelease(
    productId: string,
    locationId: string,
    quantity: number,
  ): Promise<void> {
    const key = this.getKey(productId, locationId);
    try {
      const exists = await this.redis.exists(key);
      if (exists) {
        await this.redis.getClient().incrby(key, quantity);
      }
    } catch (error) {
      this.logger.warn(
        `Failed atomic release in cache for product ${productId} at ${locationId}: ${(error as Error).message}`,
      );
    }
  }
}
