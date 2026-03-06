import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationService } from '../recommendation.service';
import { RecommendationRepository, RecommendedProduct } from '../recommendation.repository';
import { RedisService } from '../redis.service';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let repository: jest.Mocked<RecommendationRepository>;
  let redis: jest.Mocked<RedisService>;

  const mockProduct: RecommendedProduct = {
    id: 'prod-uuid-1',
    name: 'Manila Mangoes',
    slug: 'manila-mangoes',
    base_price: 180,
    sale_price: null,
    rating_average: 4.9,
    rating_count: 320,
    total_sold: 2100,
    store_id: 'store-uuid-1',
    category_id: 'cat-uuid-1',
    primary_image_url: null,
  };

  const mockProducts = [mockProduct];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: RecommendationRepository,
          useValue: {
            findPopularProducts: jest.fn(),
            findFrequentlyBoughtTogether: jest.fn(),
            findSimilarProducts: jest.fn(),
            findPersonalizedProducts: jest.fn(),
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
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    repository = module.get(RecommendationRepository);
    redis = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Popular Products ───────────────────────────────────────────────

  describe('getPopularProducts', () => {
    it('should return popular products from repository', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPopularProducts.mockResolvedValue(mockProducts);

      const result = await service.getPopularProducts({ limit: 8 });

      expect(result.data).toEqual(mockProducts);
      expect(repository.findPopularProducts).toHaveBeenCalledWith({
        store_id: undefined,
        category_id: undefined,
        limit: 8,
      });
    });

    it('should return cached popular products when available', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockProducts));

      const result = await service.getPopularProducts({ limit: 8 });

      expect(result.data).toEqual(mockProducts);
      expect(repository.findPopularProducts).not.toHaveBeenCalled();
    });

    it('should cache popular products with 15min TTL', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPopularProducts.mockResolvedValue(mockProducts);

      await service.getPopularProducts({ limit: 8 });

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('catalog:recommendations:popular'),
        JSON.stringify(mockProducts),
        900,
      );
    });

    it('should pass store_id filter to repository', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPopularProducts.mockResolvedValue(mockProducts);

      await service.getPopularProducts({ store_id: 'store-uuid-1', limit: 8 });

      expect(repository.findPopularProducts).toHaveBeenCalledWith(
        expect.objectContaining({ store_id: 'store-uuid-1' }),
      );
    });

    it('should pass category_id filter to repository', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPopularProducts.mockResolvedValue(mockProducts);

      await service.getPopularProducts({ category_id: 'cat-uuid-1', limit: 8 });

      expect(repository.findPopularProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category_id: 'cat-uuid-1' }),
      );
    });

    it('should handle cache read failure gracefully', async () => {
      redis.get.mockRejectedValue(new Error('Redis connection failed'));
      repository.findPopularProducts.mockResolvedValue(mockProducts);

      const result = await service.getPopularProducts({ limit: 8 });

      expect(result.data).toEqual(mockProducts);
    });

    it('should handle cache write failure gracefully', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPopularProducts.mockResolvedValue(mockProducts);
      redis.set.mockRejectedValue(new Error('Redis write failed'));

      const result = await service.getPopularProducts({ limit: 8 });

      expect(result.data).toEqual(mockProducts);
    });
  });

  // ─── Frequently Bought Together ─────────────────────────────────────

  describe('getFrequentlyBoughtTogether', () => {
    it('should return co-purchased products from repository', async () => {
      redis.get.mockResolvedValue(null);
      repository.findFrequentlyBoughtTogether.mockResolvedValue(mockProducts);

      const result = await service.getFrequentlyBoughtTogether('prod-uuid-1', { limit: 8 });

      expect(result.data).toEqual(mockProducts);
      expect(repository.findFrequentlyBoughtTogether).toHaveBeenCalledWith('prod-uuid-1', 8);
    });

    it('should return cached co-purchased products', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockProducts));

      const result = await service.getFrequentlyBoughtTogether('prod-uuid-1', { limit: 8 });

      expect(result.data).toEqual(mockProducts);
      expect(repository.findFrequentlyBoughtTogether).not.toHaveBeenCalled();
    });

    it('should cache with 30min TTL', async () => {
      redis.get.mockResolvedValue(null);
      repository.findFrequentlyBoughtTogether.mockResolvedValue(mockProducts);

      await service.getFrequentlyBoughtTogether('prod-uuid-1', { limit: 8 });

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('catalog:recommendations:together'),
        expect.any(String),
        1800,
      );
    });
  });

  // ─── Similar Products ───────────────────────────────────────────────

  describe('getSimilarProducts', () => {
    it('should return similar products from repository', async () => {
      redis.get.mockResolvedValue(null);
      repository.findSimilarProducts.mockResolvedValue(mockProducts);

      const result = await service.getSimilarProducts('prod-uuid-1', { limit: 8 });

      expect(result.data).toEqual(mockProducts);
      expect(repository.findSimilarProducts).toHaveBeenCalledWith('prod-uuid-1', 8);
    });

    it('should return cached similar products', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockProducts));

      const result = await service.getSimilarProducts('prod-uuid-1', { limit: 8 });

      expect(result.data).toEqual(mockProducts);
      expect(repository.findSimilarProducts).not.toHaveBeenCalled();
    });

    it('should cache with 30min TTL', async () => {
      redis.get.mockResolvedValue(null);
      repository.findSimilarProducts.mockResolvedValue(mockProducts);

      await service.getSimilarProducts('prod-uuid-1', { limit: 8 });

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('catalog:recommendations:similar'),
        expect.any(String),
        1800,
      );
    });
  });

  // ─── Personalized ───────────────────────────────────────────────────

  describe('getPersonalizedProducts', () => {
    it('should return personalized products for user', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPersonalizedProducts.mockResolvedValue(mockProducts);

      const result = await service.getPersonalizedProducts('user-uuid-1', { limit: 8 });

      expect(result.data).toEqual(mockProducts);
      expect(repository.findPersonalizedProducts).toHaveBeenCalledWith('user-uuid-1', 8);
    });

    it('should return cached personalized products', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockProducts));

      const result = await service.getPersonalizedProducts('user-uuid-1', { limit: 8 });

      expect(result.data).toEqual(mockProducts);
      expect(repository.findPersonalizedProducts).not.toHaveBeenCalled();
    });

    it('should cache with 10min TTL', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPersonalizedProducts.mockResolvedValue(mockProducts);

      await service.getPersonalizedProducts('user-uuid-1', { limit: 8 });

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('catalog:recommendations:personalized'),
        expect.any(String),
        600,
      );
    });

    it('should use default limit of 8 when not provided', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPersonalizedProducts.mockResolvedValue(mockProducts);

      await service.getPersonalizedProducts('user-uuid-1', {});

      expect(repository.findPersonalizedProducts).toHaveBeenCalledWith('user-uuid-1', 8);
    });
  });

  // ─── Cache Key Building ─────────────────────────────────────────────

  describe('cache key building', () => {
    it('should generate different cache keys for different parameters', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPopularProducts.mockResolvedValue(mockProducts);

      await service.getPopularProducts({ store_id: 'store-1', limit: 8 });
      await service.getPopularProducts({ store_id: 'store-2', limit: 8 });

      expect(redis.get).toHaveBeenCalledTimes(2);
      const key1 = (redis.get as jest.Mock).mock.calls[0][0];
      const key2 = (redis.get as jest.Mock).mock.calls[1][0];
      expect(key1).not.toBe(key2);
    });

    it('should generate same cache key for same parameters', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPopularProducts.mockResolvedValue(mockProducts);

      await service.getPopularProducts({ store_id: 'store-1', limit: 8 });
      await service.getPopularProducts({ store_id: 'store-1', limit: 8 });

      const key1 = (redis.get as jest.Mock).mock.calls[0][0];
      const key2 = (redis.get as jest.Mock).mock.calls[1][0];
      expect(key1).toBe(key2);
    });

    it('should use "default" suffix when no filter params provided', async () => {
      redis.get.mockResolvedValue(null);
      repository.findPopularProducts.mockResolvedValue(mockProducts);

      await service.getPopularProducts({ limit: 8 });

      expect(redis.get).toHaveBeenCalledWith(
        expect.stringContaining('limit:8'),
      );
    });
  });
});
