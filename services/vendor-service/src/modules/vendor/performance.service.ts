import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PerformanceRepository } from './performance.repository';
import { PerformanceMetrics, PerformanceTier } from './entities/performance-metrics.entity';
import { PerformanceHistory } from './entities/performance-history.entity';
import { AdminPerformanceQueryDto, PerformanceHistoryQueryDto } from './dto/performance-query.dto';
import { RedisService } from '../../config/redis.service';

// ─── Score Weights ─────────────────────────────────────────────────────────────
const SCORE_WEIGHTS = {
  fulfillment_rate: 0.25,
  avg_rating: 0.20,
  on_time_delivery_rate: 0.15,
  return_rate: 0.15,       // inverted: lower is better
  dispute_rate: 0.10,      // inverted: lower is better
  cancellation_rate: 0.10, // inverted: lower is better
  review_response_rate: 0.05,
};

const MIN_ORDERS_FOR_RATING = 5;
const CACHE_TTL_SECONDS = 300; // 5 minutes
const PERIOD_DAYS = 30;

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  constructor(
    private readonly performanceRepo: PerformanceRepository,
    private readonly redis: RedisService,
  ) {}

  // ─── Score Calculation ───────────────────────────────────────────────────────

  calculatePerformanceScore(metrics: {
    fulfillment_rate: number;
    cancellation_rate: number;
    on_time_delivery_rate: number;
    return_rate: number;
    dispute_rate: number;
    avg_rating: number;
    review_response_rate: number;
    total_orders: number;
  }): { score: number; tier: PerformanceTier } {
    if (metrics.total_orders < MIN_ORDERS_FOR_RATING) {
      return { score: 0, tier: PerformanceTier.UNRATED };
    }

    // Normalize each metric to 0-100 scale
    const fulfillmentScore = metrics.fulfillment_rate; // already 0-100
    const ratingScore = (metrics.avg_rating / 5) * 100; // 0-5 -> 0-100
    const onTimeScore = metrics.on_time_delivery_rate; // already 0-100
    const returnScore = Math.max(0, 100 - metrics.return_rate * 10); // invert: 0% -> 100, 10%+ -> 0
    const disputeScore = Math.max(0, 100 - metrics.dispute_rate * 20); // invert: 0% -> 100, 5%+ -> 0
    const cancellationScore = Math.max(0, 100 - metrics.cancellation_rate * 5); // invert: 0% -> 100, 20%+ -> 0
    const responseScore = metrics.review_response_rate; // already 0-100

    const score =
      fulfillmentScore * SCORE_WEIGHTS.fulfillment_rate +
      ratingScore * SCORE_WEIGHTS.avg_rating +
      onTimeScore * SCORE_WEIGHTS.on_time_delivery_rate +
      returnScore * SCORE_WEIGHTS.return_rate +
      disputeScore * SCORE_WEIGHTS.dispute_rate +
      cancellationScore * SCORE_WEIGHTS.cancellation_rate +
      responseScore * SCORE_WEIGHTS.review_response_rate;

    const clampedScore = parseFloat(Math.min(100, Math.max(0, score)).toFixed(2));
    const tier = this.assignTier(clampedScore);

    return { score: clampedScore, tier };
  }

  assignTier(score: number): PerformanceTier {
    if (score >= 85) return PerformanceTier.EXCELLENT;
    if (score >= 70) return PerformanceTier.GOOD;
    if (score >= 50) return PerformanceTier.AVERAGE;
    if (score >= 30) return PerformanceTier.POOR;
    return PerformanceTier.CRITICAL;
  }

  // ─── Full Recalculation for One Store ────────────────────────────────────────

  async recalculateForStore(storeId: string): Promise<PerformanceMetrics> {
    this.logger.log(`Recalculating performance for store ${storeId}`);

    const [orderMetrics, returnMetrics, disputeMetrics, reviewMetrics] = await Promise.all([
      this.performanceRepo.getOrderMetricsForStore(storeId, PERIOD_DAYS),
      this.performanceRepo.getReturnMetricsForStore(storeId, PERIOD_DAYS),
      this.performanceRepo.getDisputeMetricsForStore(storeId, PERIOD_DAYS),
      this.performanceRepo.getReviewMetricsForStore(storeId, PERIOD_DAYS),
    ]);

    const totalOrders = orderMetrics.total_orders;
    const fulfillmentRate = totalOrders > 0
      ? parseFloat(((orderMetrics.fulfilled_orders / totalOrders) * 100).toFixed(2))
      : 0;
    const cancellationRate = totalOrders > 0
      ? parseFloat(((orderMetrics.cancelled_orders / totalOrders) * 100).toFixed(2))
      : 0;
    const onTimeDeliveryRate = orderMetrics.fulfilled_orders > 0
      ? parseFloat(((orderMetrics.on_time_deliveries / orderMetrics.fulfilled_orders) * 100).toFixed(2))
      : 0;
    const returnRate = totalOrders > 0
      ? parseFloat(((returnMetrics.total_returns / totalOrders) * 100).toFixed(2))
      : 0;
    const disputeRate = totalOrders > 0
      ? parseFloat(((disputeMetrics.total_disputes / totalOrders) * 100).toFixed(2))
      : 0;
    const escalationRate = disputeMetrics.total_disputes > 0
      ? parseFloat(((disputeMetrics.escalated_disputes / disputeMetrics.total_disputes) * 100).toFixed(2))
      : 0;
    const reviewResponseRate = reviewMetrics.total_reviews > 0
      ? parseFloat(((reviewMetrics.reviews_with_response / reviewMetrics.total_reviews) * 100).toFixed(2))
      : 0;

    const { score, tier } = this.calculatePerformanceScore({
      fulfillment_rate: fulfillmentRate,
      cancellation_rate: cancellationRate,
      on_time_delivery_rate: onTimeDeliveryRate,
      return_rate: returnRate,
      dispute_rate: disputeRate,
      avg_rating: reviewMetrics.avg_rating,
      review_response_rate: reviewResponseRate,
      total_orders: totalOrders,
    });

    const metricsData: Partial<PerformanceMetrics> & { store_id: string } = {
      store_id: storeId,
      total_orders: totalOrders,
      total_revenue: orderMetrics.total_revenue,
      fulfilled_orders: orderMetrics.fulfilled_orders,
      cancelled_orders: orderMetrics.cancelled_orders,
      fulfillment_rate: fulfillmentRate,
      cancellation_rate: cancellationRate,
      avg_preparation_time_min: orderMetrics.avg_preparation_time_min,
      on_time_delivery_rate: onTimeDeliveryRate,
      total_returns: returnMetrics.total_returns,
      return_rate: returnRate,
      total_disputes: disputeMetrics.total_disputes,
      dispute_rate: disputeRate,
      escalation_rate: escalationRate,
      avg_rating: reviewMetrics.avg_rating,
      review_count: reviewMetrics.review_count,
      review_response_rate: reviewResponseRate,
      avg_dispute_response_hours: disputeMetrics.avg_response_hours,
      performance_score: score,
      performance_tier: tier,
      period_days: PERIOD_DAYS,
    };

    const result = await this.performanceRepo.upsertMetrics(metricsData);

    // Invalidate cache
    await this.invalidateCache(storeId);

    return result;
  }

  // ─── Vendor-Facing Methods ───────────────────────────────────────────────────

  async getMyPerformance(storeId: string): Promise<PerformanceMetrics> {
    const cacheKey = `vendor:performance:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let metrics = await this.performanceRepo.findMetricsByStoreId(storeId);
    if (!metrics) {
      // Calculate on first request
      metrics = await this.recalculateForStore(storeId);
    }

    await this.redis.set(cacheKey, JSON.stringify(metrics), CACHE_TTL_SECONDS);
    return metrics;
  }

  async getMyPerformanceHistory(
    storeId: string,
    query: PerformanceHistoryQueryDto,
  ): Promise<PerformanceHistory[]> {
    return this.performanceRepo.findHistoryByStoreId(
      storeId,
      query.date_from,
      query.date_to,
      query.days,
    );
  }

  // ─── Admin-Facing Methods ────────────────────────────────────────────────────

  async adminListPerformance(query: AdminPerformanceQueryDto) {
    return this.performanceRepo.findAllMetricsAdmin(query);
  }

  async adminGetStorePerformance(storeId: string): Promise<PerformanceMetrics> {
    const metrics = await this.performanceRepo.findMetricsByStoreId(storeId);
    if (!metrics) {
      throw new NotFoundException(`Performance metrics not found for store ${storeId}`);
    }
    return metrics;
  }

  async adminGetStoreHistory(
    storeId: string,
    query: PerformanceHistoryQueryDto,
  ): Promise<PerformanceHistory[]> {
    return this.performanceRepo.findHistoryByStoreId(
      storeId,
      query.date_from,
      query.date_to,
      query.days,
    );
  }

  async getTopPerformers(limit: number = 10) {
    return this.performanceRepo.getTopPerformers(limit);
  }

  async getBottomPerformers(limit: number = 10) {
    return this.performanceRepo.getBottomPerformers(limit);
  }

  async getPlatformBenchmarks() {
    const cacheKey = 'vendor:performance:benchmarks';
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const benchmarks = await this.performanceRepo.getPlatformBenchmarks();
    await this.redis.set(cacheKey, JSON.stringify(benchmarks), CACHE_TTL_SECONDS);
    return benchmarks;
  }

  // ─── Kafka Event Handlers ────────────────────────────────────────────────────

  async handleOrderEvent(data: {
    store_id: string;
    status: string;
    total_amount?: number;
  }): Promise<void> {
    try {
      const metrics = await this.performanceRepo.findMetricsByStoreId(data.store_id);
      if (!metrics) {
        // First event for this store — trigger full calculation
        await this.recalculateForStore(data.store_id);
        return;
      }

      // Incremental update based on order status
      const updates: Partial<PerformanceMetrics> & { store_id: string } = {
        store_id: data.store_id,
      };

      if (data.status === 'confirmed' || data.status === 'pending') {
        updates.total_orders = metrics.total_orders + 1;
        if (data.total_amount) {
          updates.total_revenue = parseFloat(metrics.total_revenue.toString()) + data.total_amount;
        }
      } else if (data.status === 'delivered') {
        updates.fulfilled_orders = metrics.fulfilled_orders + 1;
      } else if (data.status === 'cancelled') {
        updates.cancelled_orders = metrics.cancelled_orders + 1;
      }

      // Recalculate rates
      const totalOrders = updates.total_orders ?? metrics.total_orders;
      const fulfilledOrders = updates.fulfilled_orders ?? metrics.fulfilled_orders;
      const cancelledOrders = updates.cancelled_orders ?? metrics.cancelled_orders;

      if (totalOrders > 0) {
        updates.fulfillment_rate = parseFloat(((fulfilledOrders / totalOrders) * 100).toFixed(2));
        updates.cancellation_rate = parseFloat(((cancelledOrders / totalOrders) * 100).toFixed(2));
      }

      // Recalculate score
      const { score, tier } = this.calculatePerformanceScore({
        fulfillment_rate: updates.fulfillment_rate ?? metrics.fulfillment_rate,
        cancellation_rate: updates.cancellation_rate ?? metrics.cancellation_rate,
        on_time_delivery_rate: metrics.on_time_delivery_rate,
        return_rate: metrics.return_rate,
        dispute_rate: metrics.dispute_rate,
        avg_rating: metrics.avg_rating,
        review_response_rate: metrics.review_response_rate,
        total_orders: totalOrders,
      });
      updates.performance_score = score;
      updates.performance_tier = tier;

      await this.performanceRepo.upsertMetrics(updates);
      await this.invalidateCache(data.store_id);
    } catch (error) {
      this.logger.error(`Error handling order event for store ${data.store_id}`, (error as Error).stack);
    }
  }

  async handleReturnEvent(data: { store_id: string }): Promise<void> {
    try {
      const metrics = await this.performanceRepo.findMetricsByStoreId(data.store_id);
      if (!metrics) {
        await this.recalculateForStore(data.store_id);
        return;
      }

      const totalReturns = metrics.total_returns + 1;
      const returnRate = metrics.total_orders > 0
        ? parseFloat(((totalReturns / metrics.total_orders) * 100).toFixed(2))
        : 0;

      const { score, tier } = this.calculatePerformanceScore({
        fulfillment_rate: metrics.fulfillment_rate,
        cancellation_rate: metrics.cancellation_rate,
        on_time_delivery_rate: metrics.on_time_delivery_rate,
        return_rate: returnRate,
        dispute_rate: metrics.dispute_rate,
        avg_rating: metrics.avg_rating,
        review_response_rate: metrics.review_response_rate,
        total_orders: metrics.total_orders,
      });

      await this.performanceRepo.upsertMetrics({
        store_id: data.store_id,
        total_returns: totalReturns,
        return_rate: returnRate,
        performance_score: score,
        performance_tier: tier,
      });
      await this.invalidateCache(data.store_id);
    } catch (error) {
      this.logger.error(`Error handling return event for store ${data.store_id}`, (error as Error).stack);
    }
  }

  async handleDisputeEvent(data: { store_id: string }): Promise<void> {
    try {
      const metrics = await this.performanceRepo.findMetricsByStoreId(data.store_id);
      if (!metrics) {
        await this.recalculateForStore(data.store_id);
        return;
      }

      const totalDisputes = metrics.total_disputes + 1;
      const disputeRate = metrics.total_orders > 0
        ? parseFloat(((totalDisputes / metrics.total_orders) * 100).toFixed(2))
        : 0;

      const { score, tier } = this.calculatePerformanceScore({
        fulfillment_rate: metrics.fulfillment_rate,
        cancellation_rate: metrics.cancellation_rate,
        on_time_delivery_rate: metrics.on_time_delivery_rate,
        return_rate: metrics.return_rate,
        dispute_rate: disputeRate,
        avg_rating: metrics.avg_rating,
        review_response_rate: metrics.review_response_rate,
        total_orders: metrics.total_orders,
      });

      await this.performanceRepo.upsertMetrics({
        store_id: data.store_id,
        total_disputes: totalDisputes,
        dispute_rate: disputeRate,
        performance_score: score,
        performance_tier: tier,
      });
      await this.invalidateCache(data.store_id);
    } catch (error) {
      this.logger.error(`Error handling dispute event for store ${data.store_id}`, (error as Error).stack);
    }
  }

  async handleReviewEvent(data: { store_id: string; rating: number }): Promise<void> {
    try {
      const metrics = await this.performanceRepo.findMetricsByStoreId(data.store_id);
      if (!metrics) {
        await this.recalculateForStore(data.store_id);
        return;
      }

      // Incremental average: new_avg = (old_avg * old_count + new_rating) / (old_count + 1)
      const newCount = metrics.review_count + 1;
      const newAvg = parseFloat(
        ((parseFloat(metrics.avg_rating.toString()) * metrics.review_count + data.rating) / newCount).toFixed(2),
      );

      const { score, tier } = this.calculatePerformanceScore({
        fulfillment_rate: metrics.fulfillment_rate,
        cancellation_rate: metrics.cancellation_rate,
        on_time_delivery_rate: metrics.on_time_delivery_rate,
        return_rate: metrics.return_rate,
        dispute_rate: metrics.dispute_rate,
        avg_rating: newAvg,
        review_response_rate: metrics.review_response_rate,
        total_orders: metrics.total_orders,
      });

      await this.performanceRepo.upsertMetrics({
        store_id: data.store_id,
        avg_rating: newAvg,
        review_count: newCount,
        performance_score: score,
        performance_tier: tier,
      });
      await this.invalidateCache(data.store_id);
    } catch (error) {
      this.logger.error(`Error handling review event for store ${data.store_id}`, (error as Error).stack);
    }
  }

  // ─── Scheduled Full Recalculation ────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyRecalculation(): Promise<void> {
    this.logger.log('Starting daily performance recalculation...');
    const startTime = Date.now();

    try {
      const storeIds = await this.performanceRepo.getAllActiveStoreIds();
      this.logger.log(`Recalculating performance for ${storeIds.length} stores`);

      let successCount = 0;
      let errorCount = 0;

      for (const storeId of storeIds) {
        try {
          const metrics = await this.recalculateForStore(storeId);

          // Create daily snapshot
          const today = new Date().toISOString().split('T')[0];
          await this.performanceRepo.createHistorySnapshot({
            store_id: storeId,
            snapshot_date: today,
            total_orders: metrics.total_orders,
            total_revenue: metrics.total_revenue,
            fulfilled_orders: metrics.fulfilled_orders,
            cancelled_orders: metrics.cancelled_orders,
            fulfillment_rate: metrics.fulfillment_rate,
            cancellation_rate: metrics.cancellation_rate,
            avg_preparation_time_min: metrics.avg_preparation_time_min,
            on_time_delivery_rate: metrics.on_time_delivery_rate,
            total_returns: metrics.total_returns,
            return_rate: metrics.return_rate,
            total_disputes: metrics.total_disputes,
            dispute_rate: metrics.dispute_rate,
            escalation_rate: metrics.escalation_rate,
            avg_rating: metrics.avg_rating,
            review_count: metrics.review_count,
            review_response_rate: metrics.review_response_rate,
            performance_score: metrics.performance_score,
            performance_tier: metrics.performance_tier,
            metrics_snapshot: {
              avg_preparation_time_min: metrics.avg_preparation_time_min,
              avg_dispute_response_hours: metrics.avg_dispute_response_hours,
              period_days: metrics.period_days,
            },
          });

          successCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(`Failed to recalculate store ${storeId}`, (error as Error).stack);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Daily recalculation complete: ${successCount} success, ${errorCount} errors, ${duration}ms`,
      );

      // Invalidate platform benchmarks cache
      await this.redis.del('vendor:performance:benchmarks');
    } catch (error) {
      this.logger.error('Daily recalculation failed', (error as Error).stack);
    }
  }

  async triggerRecalculation(): Promise<{ stores_processed: number }> {
    const storeIds = await this.performanceRepo.getAllActiveStoreIds();
    let processed = 0;

    for (const storeId of storeIds) {
      try {
        await this.recalculateForStore(storeId);
        processed++;
      } catch (error) {
        this.logger.error(`Recalculation failed for store ${storeId}`, (error as Error).stack);
      }
    }

    await this.redis.del('vendor:performance:benchmarks');
    return { stores_processed: processed };
  }

  // ─── Cache Helpers ───────────────────────────────────────────────────────────

  private async invalidateCache(storeId: string): Promise<void> {
    await this.redis.del(`vendor:performance:${storeId}`);
  }
}
