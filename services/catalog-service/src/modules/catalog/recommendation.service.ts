import { Injectable, Logger } from '@nestjs/common';
import { RecommendationRepository, RecommendedProduct } from './recommendation.repository';
import { RedisService } from './redis.service';
import {
  PopularProductsQueryDto,
  SimilarProductsQueryDto,
  FrequentlyBoughtTogetherQueryDto,
  PersonalizedQueryDto,
} from './dto/recommendation-query.dto';

const CACHE_PREFIX = 'catalog:recommendations';
const POPULAR_TTL = 900;      // 15 minutes
const TOGETHER_TTL = 1800;    // 30 minutes
const SIMILAR_TTL = 1800;     // 30 minutes
const PERSONALIZED_TTL = 600; // 10 minutes

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly recommendationRepository: RecommendationRepository,
    private readonly redisService: RedisService,
  ) {}

  async getPopularProducts(query: PopularProductsQueryDto): Promise<{ data: RecommendedProduct[] }> {
    const cacheKey = this.buildCacheKey('popular', {
      store_id: query.store_id,
      category_id: query.category_id,
      zone_id: query.zone_id,
      limit: query.limit,
    });

    const cached = await this.getFromCache<RecommendedProduct[]>(cacheKey);
    if (cached) {
      return { data: cached };
    }

    const products = await this.recommendationRepository.findPopularProducts({
      store_id: query.store_id,
      category_id: query.category_id,
      limit: query.limit ?? 8,
    });

    await this.setCache(cacheKey, products, POPULAR_TTL);
    return { data: products };
  }

  async getFrequentlyBoughtTogether(
    productId: string,
    query: FrequentlyBoughtTogetherQueryDto,
  ): Promise<{ data: RecommendedProduct[] }> {
    const cacheKey = this.buildCacheKey('together', {
      product_id: productId,
      limit: query.limit,
    });

    const cached = await this.getFromCache<RecommendedProduct[]>(cacheKey);
    if (cached) {
      return { data: cached };
    }

    const products = await this.recommendationRepository.findFrequentlyBoughtTogether(
      productId,
      query.limit ?? 8,
    );

    await this.setCache(cacheKey, products, TOGETHER_TTL);
    return { data: products };
  }

  async getSimilarProducts(
    productId: string,
    query: SimilarProductsQueryDto,
  ): Promise<{ data: RecommendedProduct[] }> {
    const cacheKey = this.buildCacheKey('similar', {
      product_id: productId,
      limit: query.limit,
    });

    const cached = await this.getFromCache<RecommendedProduct[]>(cacheKey);
    if (cached) {
      return { data: cached };
    }

    const products = await this.recommendationRepository.findSimilarProducts(
      productId,
      query.limit ?? 8,
    );

    await this.setCache(cacheKey, products, SIMILAR_TTL);
    return { data: products };
  }

  async getPersonalizedProducts(
    userId: string,
    query: PersonalizedQueryDto,
  ): Promise<{ data: RecommendedProduct[] }> {
    const cacheKey = this.buildCacheKey('personalized', {
      user_id: userId,
      limit: query.limit,
    });

    const cached = await this.getFromCache<RecommendedProduct[]>(cacheKey);
    if (cached) {
      return { data: cached };
    }

    const products = await this.recommendationRepository.findPersonalizedProducts(
      userId,
      query.limit ?? 8,
    );

    await this.setCache(cacheKey, products, PERSONALIZED_TTL);
    return { data: products };
  }

  private buildCacheKey(type: string, params: Record<string, unknown>): string {
    const sortedParams = Object.entries(params)
      .filter(([, v]) => v != null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':');

    return `${CACHE_PREFIX}:${type}:${sortedParams || 'default'}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisService.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      this.logger.warn(`Cache read failed for ${key}: ${(error as Error).message}`);
    }
    return null;
  }

  private async setCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await this.redisService.set(key, JSON.stringify(data), ttl);
    } catch (error) {
      this.logger.warn(`Cache write failed for ${key}: ${(error as Error).message}`);
    }
  }
}
