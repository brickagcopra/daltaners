import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PerformanceService } from '../performance.service';
import { PerformanceRepository } from '../performance.repository';
import { RedisService } from '../../../config/redis.service';
import { PerformanceMetrics, PerformanceTier } from '../entities/performance-metrics.entity';

describe('PerformanceService', () => {
  let service: PerformanceService;
  let repository: jest.Mocked<PerformanceRepository>;
  let redis: jest.Mocked<RedisService>;

  const storeId = 'store-uuid-1';

  const mockMetrics: Partial<PerformanceMetrics> = {
    store_id: storeId,
    total_orders: 100,
    total_revenue: 50000,
    fulfilled_orders: 90,
    cancelled_orders: 5,
    fulfillment_rate: 90,
    cancellation_rate: 5,
    avg_preparation_time_min: 25,
    on_time_delivery_rate: 88,
    total_returns: 3,
    return_rate: 3,
    total_disputes: 2,
    dispute_rate: 2,
    escalation_rate: 50,
    avg_rating: 4.2,
    review_count: 45,
    review_response_rate: 80,
    avg_dispute_response_hours: 12,
    performance_score: 82.5,
    performance_tier: PerformanceTier.GOOD,
    period_days: 30,
    calculated_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        {
          provide: PerformanceRepository,
          useValue: {
            findMetricsByStoreId: jest.fn(),
            upsertMetrics: jest.fn(),
            findAllMetricsAdmin: jest.fn(),
            getTopPerformers: jest.fn(),
            getBottomPerformers: jest.fn(),
            getPlatformBenchmarks: jest.fn(),
            getAllActiveStoreIds: jest.fn(),
            createHistorySnapshot: jest.fn(),
            findHistoryByStoreId: jest.fn(),
            getOrderMetricsForStore: jest.fn(),
            getReturnMetricsForStore: jest.fn(),
            getDisputeMetricsForStore: jest.fn(),
            getReviewMetricsForStore: jest.fn(),
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

    service = module.get<PerformanceService>(PerformanceService);
    repository = module.get(PerformanceRepository);
    redis = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Score Calculation ───────────────────────────────────────────────────────

  describe('calculatePerformanceScore', () => {
    it('should return UNRATED for stores with fewer than 5 orders', () => {
      const result = service.calculatePerformanceScore({
        fulfillment_rate: 100,
        cancellation_rate: 0,
        on_time_delivery_rate: 100,
        return_rate: 0,
        dispute_rate: 0,
        avg_rating: 5,
        review_response_rate: 100,
        total_orders: 3,
      });

      expect(result.score).toBe(0);
      expect(result.tier).toBe(PerformanceTier.UNRATED);
    });

    it('should calculate EXCELLENT score for perfect metrics', () => {
      const result = service.calculatePerformanceScore({
        fulfillment_rate: 100,
        cancellation_rate: 0,
        on_time_delivery_rate: 100,
        return_rate: 0,
        dispute_rate: 0,
        avg_rating: 5,
        review_response_rate: 100,
        total_orders: 50,
      });

      expect(result.score).toBe(100);
      expect(result.tier).toBe(PerformanceTier.EXCELLENT);
    });

    it('should calculate GOOD score for good metrics', () => {
      const result = service.calculatePerformanceScore({
        fulfillment_rate: 90,
        cancellation_rate: 5,
        on_time_delivery_rate: 85,
        return_rate: 2,
        dispute_rate: 1,
        avg_rating: 4.0,
        review_response_rate: 75,
        total_orders: 100,
      });

      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThan(85);
      expect(result.tier).toBe(PerformanceTier.GOOD);
    });

    it('should calculate POOR score for bad metrics', () => {
      const result = service.calculatePerformanceScore({
        fulfillment_rate: 50,
        cancellation_rate: 20,
        on_time_delivery_rate: 40,
        return_rate: 8,
        dispute_rate: 4,
        avg_rating: 2.0,
        review_response_rate: 10,
        total_orders: 100,
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThan(50);
      expect([PerformanceTier.POOR, PerformanceTier.CRITICAL]).toContain(result.tier);
    });

    it('should clamp score between 0 and 100', () => {
      const result = service.calculatePerformanceScore({
        fulfillment_rate: 100,
        cancellation_rate: 0,
        on_time_delivery_rate: 100,
        return_rate: 0,
        dispute_rate: 0,
        avg_rating: 5,
        review_response_rate: 100,
        total_orders: 100,
      });

      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Tier Assignment ─────────────────────────────────────────────────────────

  describe('assignTier', () => {
    it('should assign EXCELLENT for score >= 85', () => {
      expect(service.assignTier(85)).toBe(PerformanceTier.EXCELLENT);
      expect(service.assignTier(100)).toBe(PerformanceTier.EXCELLENT);
    });

    it('should assign GOOD for score 70-84', () => {
      expect(service.assignTier(70)).toBe(PerformanceTier.GOOD);
      expect(service.assignTier(84)).toBe(PerformanceTier.GOOD);
    });

    it('should assign AVERAGE for score 50-69', () => {
      expect(service.assignTier(50)).toBe(PerformanceTier.AVERAGE);
      expect(service.assignTier(69)).toBe(PerformanceTier.AVERAGE);
    });

    it('should assign POOR for score 30-49', () => {
      expect(service.assignTier(30)).toBe(PerformanceTier.POOR);
      expect(service.assignTier(49)).toBe(PerformanceTier.POOR);
    });

    it('should assign CRITICAL for score < 30', () => {
      expect(service.assignTier(0)).toBe(PerformanceTier.CRITICAL);
      expect(service.assignTier(29)).toBe(PerformanceTier.CRITICAL);
    });
  });

  // ─── Full Recalculation ──────────────────────────────────────────────────────

  describe('recalculateForStore', () => {
    it('should aggregate metrics from all sources and save', async () => {
      repository.getOrderMetricsForStore.mockResolvedValue({
        total_orders: 100,
        total_revenue: 50000,
        fulfilled_orders: 90,
        cancelled_orders: 5,
        avg_preparation_time_min: 25,
        on_time_deliveries: 80,
      });
      repository.getReturnMetricsForStore.mockResolvedValue({
        total_returns: 3,
      });
      repository.getDisputeMetricsForStore.mockResolvedValue({
        total_disputes: 2,
        escalated_disputes: 1,
        avg_response_hours: 12,
      });
      repository.getReviewMetricsForStore.mockResolvedValue({
        avg_rating: 4.2,
        review_count: 45,
        reviews_with_response: 36,
        total_reviews: 45,
      });
      repository.upsertMetrics.mockResolvedValue(mockMetrics as PerformanceMetrics);
      redis.del.mockResolvedValue(undefined);

      const result = await service.recalculateForStore(storeId);

      expect(repository.getOrderMetricsForStore).toHaveBeenCalledWith(storeId, 30);
      expect(repository.getReturnMetricsForStore).toHaveBeenCalledWith(storeId, 30);
      expect(repository.getDisputeMetricsForStore).toHaveBeenCalledWith(storeId, 30);
      expect(repository.getReviewMetricsForStore).toHaveBeenCalledWith(storeId, 30);
      expect(repository.upsertMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          store_id: storeId,
          total_orders: 100,
          fulfilled_orders: 90,
          total_returns: 3,
          total_disputes: 2,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should handle store with zero orders', async () => {
      repository.getOrderMetricsForStore.mockResolvedValue({
        total_orders: 0,
        total_revenue: 0,
        fulfilled_orders: 0,
        cancelled_orders: 0,
        avg_preparation_time_min: 0,
        on_time_deliveries: 0,
      });
      repository.getReturnMetricsForStore.mockResolvedValue({ total_returns: 0 });
      repository.getDisputeMetricsForStore.mockResolvedValue({
        total_disputes: 0,
        escalated_disputes: 0,
        avg_response_hours: 0,
      });
      repository.getReviewMetricsForStore.mockResolvedValue({
        avg_rating: 0,
        review_count: 0,
        reviews_with_response: 0,
        total_reviews: 0,
      });
      repository.upsertMetrics.mockResolvedValue({
        ...mockMetrics,
        total_orders: 0,
        performance_score: 0,
        performance_tier: PerformanceTier.UNRATED,
      } as PerformanceMetrics);
      redis.del.mockResolvedValue(undefined);

      await service.recalculateForStore(storeId);

      expect(repository.upsertMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          store_id: storeId,
          total_orders: 0,
          performance_tier: PerformanceTier.UNRATED,
        }),
      );
    });
  });

  // ─── Vendor Methods ──────────────────────────────────────────────────────────

  describe('getMyPerformance', () => {
    it('should return cached metrics if available', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockMetrics));

      const result = await service.getMyPerformance(storeId);

      expect(redis.get).toHaveBeenCalledWith(`vendor:performance:${storeId}`);
      expect(repository.findMetricsByStoreId).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should fetch from DB and cache when not in cache', async () => {
      redis.get.mockResolvedValue(null);
      repository.findMetricsByStoreId.mockResolvedValue(mockMetrics as PerformanceMetrics);

      const result = await service.getMyPerformance(storeId);

      expect(repository.findMetricsByStoreId).toHaveBeenCalledWith(storeId);
      expect(redis.set).toHaveBeenCalledWith(
        `vendor:performance:${storeId}`,
        expect.any(String),
        300,
      );
      expect(result).toBeDefined();
    });

    it('should recalculate when no metrics exist', async () => {
      redis.get.mockResolvedValue(null);
      repository.findMetricsByStoreId.mockResolvedValue(null);
      repository.getOrderMetricsForStore.mockResolvedValue({
        total_orders: 10,
        total_revenue: 5000,
        fulfilled_orders: 9,
        cancelled_orders: 1,
        avg_preparation_time_min: 20,
        on_time_deliveries: 8,
      });
      repository.getReturnMetricsForStore.mockResolvedValue({ total_returns: 0 });
      repository.getDisputeMetricsForStore.mockResolvedValue({
        total_disputes: 0,
        escalated_disputes: 0,
        avg_response_hours: 0,
      });
      repository.getReviewMetricsForStore.mockResolvedValue({
        avg_rating: 4.5,
        review_count: 5,
        reviews_with_response: 3,
        total_reviews: 5,
      });
      repository.upsertMetrics.mockResolvedValue(mockMetrics as PerformanceMetrics);
      redis.del.mockResolvedValue(undefined);

      const result = await service.getMyPerformance(storeId);

      expect(repository.upsertMetrics).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ─── Admin Methods ───────────────────────────────────────────────────────────

  describe('adminListPerformance', () => {
    it('should delegate to repository with query params', async () => {
      const query = { page: 1, limit: 20, sort_by: 'performance_score', sort_order: 'DESC' as const };
      repository.findAllMetricsAdmin.mockResolvedValue({
        items: [mockMetrics as any],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.adminListPerformance(query);

      expect(repository.findAllMetricsAdmin).toHaveBeenCalledWith(query);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('adminGetStorePerformance', () => {
    it('should return metrics for a specific store', async () => {
      repository.findMetricsByStoreId.mockResolvedValue(mockMetrics as PerformanceMetrics);

      const result = await service.adminGetStorePerformance(storeId);

      expect(result.store_id).toBe(storeId);
    });

    it('should throw NotFoundException when metrics not found', async () => {
      repository.findMetricsByStoreId.mockResolvedValue(null);

      await expect(service.adminGetStorePerformance(storeId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPlatformBenchmarks', () => {
    it('should return cached benchmarks if available', async () => {
      const benchmarks = { avg_rating: 4.0, avg_fulfillment_rate: 85 };
      redis.get.mockResolvedValue(JSON.stringify(benchmarks));

      const result = await service.getPlatformBenchmarks();

      expect(redis.get).toHaveBeenCalledWith('vendor:performance:benchmarks');
      expect(result).toEqual(benchmarks);
    });

    it('should fetch and cache benchmarks when not cached', async () => {
      const benchmarks = {
        avg_fulfillment_rate: 85,
        avg_cancellation_rate: 5,
        avg_return_rate: 3,
        avg_dispute_rate: 2,
        avg_rating: 4.0,
        avg_performance_score: 75,
        avg_preparation_time: 25,
        total_stores_rated: 100,
        tier_distribution: [
          { tier: 'excellent', count: 20 },
          { tier: 'good', count: 40 },
        ],
      };
      redis.get.mockResolvedValue(null);
      repository.getPlatformBenchmarks.mockResolvedValue(benchmarks);

      const result = await service.getPlatformBenchmarks();

      expect(repository.getPlatformBenchmarks).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();
      expect(result).toEqual(benchmarks);
    });
  });

  // ─── Kafka Event Handlers ────────────────────────────────────────────────────

  describe('handleOrderEvent', () => {
    it('should trigger full recalculation when no existing metrics', async () => {
      repository.findMetricsByStoreId.mockResolvedValue(null);
      repository.getOrderMetricsForStore.mockResolvedValue({
        total_orders: 1,
        total_revenue: 500,
        fulfilled_orders: 0,
        cancelled_orders: 0,
        avg_preparation_time_min: 0,
        on_time_deliveries: 0,
      });
      repository.getReturnMetricsForStore.mockResolvedValue({ total_returns: 0 });
      repository.getDisputeMetricsForStore.mockResolvedValue({
        total_disputes: 0,
        escalated_disputes: 0,
        avg_response_hours: 0,
      });
      repository.getReviewMetricsForStore.mockResolvedValue({
        avg_rating: 0,
        review_count: 0,
        reviews_with_response: 0,
        total_reviews: 0,
      });
      repository.upsertMetrics.mockResolvedValue(mockMetrics as PerformanceMetrics);
      redis.del.mockResolvedValue(undefined);

      await service.handleOrderEvent({
        store_id: storeId,
        status: 'confirmed',
        total_amount: 500,
      });

      expect(repository.getOrderMetricsForStore).toHaveBeenCalled();
    });

    it('should incrementally update on order delivered', async () => {
      repository.findMetricsByStoreId.mockResolvedValue(mockMetrics as PerformanceMetrics);
      repository.upsertMetrics.mockResolvedValue(mockMetrics as PerformanceMetrics);
      redis.del.mockResolvedValue(undefined);

      await service.handleOrderEvent({
        store_id: storeId,
        status: 'delivered',
      });

      expect(repository.upsertMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          store_id: storeId,
          fulfilled_orders: 91, // 90 + 1
        }),
      );
    });

    it('should incrementally update on order cancelled', async () => {
      repository.findMetricsByStoreId.mockResolvedValue(mockMetrics as PerformanceMetrics);
      repository.upsertMetrics.mockResolvedValue(mockMetrics as PerformanceMetrics);
      redis.del.mockResolvedValue(undefined);

      await service.handleOrderEvent({
        store_id: storeId,
        status: 'cancelled',
      });

      expect(repository.upsertMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          store_id: storeId,
          cancelled_orders: 6, // 5 + 1
        }),
      );
    });
  });

  describe('handleReturnEvent', () => {
    it('should increment return count and update rate', async () => {
      repository.findMetricsByStoreId.mockResolvedValue(mockMetrics as PerformanceMetrics);
      repository.upsertMetrics.mockResolvedValue(mockMetrics as PerformanceMetrics);
      redis.del.mockResolvedValue(undefined);

      await service.handleReturnEvent({ store_id: storeId });

      expect(repository.upsertMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          store_id: storeId,
          total_returns: 4, // 3 + 1
          return_rate: 4, // 4/100 * 100
        }),
      );
    });
  });

  describe('handleDisputeEvent', () => {
    it('should increment dispute count and update rate', async () => {
      repository.findMetricsByStoreId.mockResolvedValue(mockMetrics as PerformanceMetrics);
      repository.upsertMetrics.mockResolvedValue(mockMetrics as PerformanceMetrics);
      redis.del.mockResolvedValue(undefined);

      await service.handleDisputeEvent({ store_id: storeId });

      expect(repository.upsertMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          store_id: storeId,
          total_disputes: 3, // 2 + 1
          dispute_rate: 3, // 3/100 * 100
        }),
      );
    });
  });

  describe('handleReviewEvent', () => {
    it('should update average rating incrementally', async () => {
      repository.findMetricsByStoreId.mockResolvedValue(mockMetrics as PerformanceMetrics);
      repository.upsertMetrics.mockResolvedValue(mockMetrics as PerformanceMetrics);
      redis.del.mockResolvedValue(undefined);

      await service.handleReviewEvent({ store_id: storeId, rating: 5 });

      expect(repository.upsertMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          store_id: storeId,
          review_count: 46, // 45 + 1
          avg_rating: expect.any(Number),
        }),
      );

      // Verify the new average: (4.2 * 45 + 5) / 46 = 4.22
      const callArgs = repository.upsertMetrics.mock.calls[0][0];
      expect(callArgs.avg_rating).toBeCloseTo(4.22, 1);
    });
  });

  // ─── Scheduled Recalculation ─────────────────────────────────────────────────

  describe('triggerRecalculation', () => {
    it('should recalculate all active stores', async () => {
      repository.getAllActiveStoreIds.mockResolvedValue(['store-1', 'store-2']);
      repository.getOrderMetricsForStore.mockResolvedValue({
        total_orders: 10,
        total_revenue: 5000,
        fulfilled_orders: 9,
        cancelled_orders: 1,
        avg_preparation_time_min: 20,
        on_time_deliveries: 8,
      });
      repository.getReturnMetricsForStore.mockResolvedValue({ total_returns: 0 });
      repository.getDisputeMetricsForStore.mockResolvedValue({
        total_disputes: 0,
        escalated_disputes: 0,
        avg_response_hours: 0,
      });
      repository.getReviewMetricsForStore.mockResolvedValue({
        avg_rating: 4.0,
        review_count: 5,
        reviews_with_response: 3,
        total_reviews: 5,
      });
      repository.upsertMetrics.mockResolvedValue(mockMetrics as PerformanceMetrics);
      redis.del.mockResolvedValue(undefined);

      const result = await service.triggerRecalculation();

      expect(result.stores_processed).toBe(2);
      expect(repository.getAllActiveStoreIds).toHaveBeenCalled();
    });
  });
});
