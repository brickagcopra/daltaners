import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PerformanceMetrics, PerformanceTier } from './entities/performance-metrics.entity';
import { PerformanceHistory } from './entities/performance-history.entity';
import { AdminPerformanceQueryDto } from './dto/performance-query.dto';

@Injectable()
export class PerformanceRepository {
  private readonly logger = new Logger(PerformanceRepository.name);

  constructor(
    @InjectRepository(PerformanceMetrics)
    private readonly metricsRepo: Repository<PerformanceMetrics>,
    @InjectRepository(PerformanceHistory)
    private readonly historyRepo: Repository<PerformanceHistory>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Metrics Methods ─────────────────────────────────────────────────────────

  async findMetricsByStoreId(storeId: string): Promise<PerformanceMetrics | null> {
    return this.metricsRepo.findOne({
      where: { store_id: storeId },
    });
  }

  async upsertMetrics(data: Partial<PerformanceMetrics> & { store_id: string }): Promise<PerformanceMetrics> {
    const existing = await this.metricsRepo.findOne({
      where: { store_id: data.store_id },
    });

    if (existing) {
      await this.metricsRepo.update(data.store_id, {
        ...data,
        calculated_at: new Date(),
      } as any);
      return this.metricsRepo.findOneOrFail({ where: { store_id: data.store_id } });
    }

    const entity = this.metricsRepo.create({
      ...data,
      calculated_at: new Date(),
    });
    return this.metricsRepo.save(entity);
  }

  async findAllMetricsAdmin(query: AdminPerformanceQueryDto): Promise<{
    items: (PerformanceMetrics & { store_name?: string; store_category?: string; store_status?: string })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      tier,
      category,
      sort_by = 'performance_score',
      sort_order = 'DESC',
      min_score,
      max_score,
    } = query;

    const allowedSortFields = [
      'performance_score',
      'fulfillment_rate',
      'avg_rating',
      'total_orders',
      'total_revenue',
      'return_rate',
      'dispute_rate',
    ];
    const safeSort = allowedSortFields.includes(sort_by) ? sort_by : 'performance_score';
    const safeOrder = sort_order === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.metricsRepo
      .createQueryBuilder('pm')
      .innerJoin('vendors.stores', 's', 's.id = pm.store_id')
      .addSelect('s.name', 'store_name')
      .addSelect('s.category', 'store_category')
      .addSelect('s.status', 'store_status');

    if (search) {
      qb.andWhere('s.name ILIKE :search', { search: `%${search}%` });
    }
    if (tier) {
      qb.andWhere('pm.performance_tier = :tier', { tier });
    }
    if (category) {
      qb.andWhere('s.category = :category', { category });
    }
    if (min_score !== undefined) {
      qb.andWhere('pm.performance_score >= :minScore', { minScore: min_score });
    }
    if (max_score !== undefined) {
      qb.andWhere('pm.performance_score <= :maxScore', { maxScore: max_score });
    }

    // Only show active stores
    qb.andWhere('s.status = :storeStatus', { storeStatus: 'active' });

    const countQb = qb.clone();
    const total = await countQb.getCount();

    qb.orderBy(`pm.${safeSort}`, safeOrder);
    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const raw = await qb.getRawAndEntities();

    const items = raw.entities.map((entity, idx) => ({
      ...entity,
      store_name: raw.raw[idx]?.store_name,
      store_category: raw.raw[idx]?.store_category,
      store_status: raw.raw[idx]?.store_status,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTopPerformers(limit: number = 10): Promise<PerformanceMetrics[]> {
    return this.metricsRepo
      .createQueryBuilder('pm')
      .innerJoin('vendors.stores', 's', 's.id = pm.store_id')
      .where('s.status = :status', { status: 'active' })
      .andWhere('pm.total_orders >= :minOrders', { minOrders: 5 })
      .orderBy('pm.performance_score', 'DESC')
      .take(limit)
      .getMany();
  }

  async getBottomPerformers(limit: number = 10): Promise<PerformanceMetrics[]> {
    return this.metricsRepo
      .createQueryBuilder('pm')
      .innerJoin('vendors.stores', 's', 's.id = pm.store_id')
      .where('s.status = :status', { status: 'active' })
      .andWhere('pm.total_orders >= :minOrders', { minOrders: 5 })
      .andWhere('pm.performance_tier != :unrated', { unrated: PerformanceTier.UNRATED })
      .orderBy('pm.performance_score', 'ASC')
      .take(limit)
      .getMany();
  }

  async getPlatformBenchmarks(): Promise<{
    avg_fulfillment_rate: number;
    avg_cancellation_rate: number;
    avg_return_rate: number;
    avg_dispute_rate: number;
    avg_rating: number;
    avg_performance_score: number;
    avg_preparation_time: number;
    total_stores_rated: number;
    tier_distribution: { tier: string; count: number }[];
  }> {
    const avgResult = await this.metricsRepo
      .createQueryBuilder('pm')
      .innerJoin('vendors.stores', 's', 's.id = pm.store_id')
      .where('s.status = :status', { status: 'active' })
      .andWhere('pm.total_orders >= :minOrders', { minOrders: 1 })
      .select('COALESCE(AVG(pm.fulfillment_rate), 0)', 'avg_fulfillment_rate')
      .addSelect('COALESCE(AVG(pm.cancellation_rate), 0)', 'avg_cancellation_rate')
      .addSelect('COALESCE(AVG(pm.return_rate), 0)', 'avg_return_rate')
      .addSelect('COALESCE(AVG(pm.dispute_rate), 0)', 'avg_dispute_rate')
      .addSelect('COALESCE(AVG(pm.avg_rating), 0)', 'avg_rating')
      .addSelect('COALESCE(AVG(pm.performance_score), 0)', 'avg_performance_score')
      .addSelect('COALESCE(AVG(pm.avg_preparation_time_min), 0)', 'avg_preparation_time')
      .addSelect('COUNT(*)', 'total_stores_rated')
      .getRawOne();

    const tierDistribution = await this.metricsRepo
      .createQueryBuilder('pm')
      .innerJoin('vendors.stores', 's', 's.id = pm.store_id')
      .where('s.status = :status', { status: 'active' })
      .select('pm.performance_tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pm.performance_tier')
      .getRawMany();

    return {
      avg_fulfillment_rate: parseFloat(parseFloat(avgResult?.avg_fulfillment_rate || '0').toFixed(2)),
      avg_cancellation_rate: parseFloat(parseFloat(avgResult?.avg_cancellation_rate || '0').toFixed(2)),
      avg_return_rate: parseFloat(parseFloat(avgResult?.avg_return_rate || '0').toFixed(2)),
      avg_dispute_rate: parseFloat(parseFloat(avgResult?.avg_dispute_rate || '0').toFixed(2)),
      avg_rating: parseFloat(parseFloat(avgResult?.avg_rating || '0').toFixed(2)),
      avg_performance_score: parseFloat(parseFloat(avgResult?.avg_performance_score || '0').toFixed(2)),
      avg_preparation_time: parseFloat(parseFloat(avgResult?.avg_preparation_time || '0').toFixed(1)),
      total_stores_rated: parseInt(avgResult?.total_stores_rated || '0', 10),
      tier_distribution: tierDistribution.map((row) => ({
        tier: row.tier,
        count: parseInt(row.count, 10),
      })),
    };
  }

  async getAllActiveStoreIds(): Promise<string[]> {
    const results = await this.dataSource.query(
      `SELECT id FROM vendors.stores WHERE status = 'active'`,
    );
    return results.map((row: { id: string }) => row.id);
  }

  // ─── History Methods ──────────────────────────────────────────────────────────

  async createHistorySnapshot(data: Partial<PerformanceHistory> & { store_id: string; snapshot_date: string }): Promise<PerformanceHistory> {
    // Upsert: if snapshot for this date already exists, update it
    const existing = await this.historyRepo.findOne({
      where: { store_id: data.store_id, snapshot_date: data.snapshot_date },
    });

    if (existing) {
      await this.historyRepo.update(existing.id, data as any);
      return this.historyRepo.findOneOrFail({ where: { id: existing.id } });
    }

    const entity = this.historyRepo.create(data);
    return this.historyRepo.save(entity);
  }

  async findHistoryByStoreId(
    storeId: string,
    dateFrom?: string,
    dateTo?: string,
    days?: number,
  ): Promise<PerformanceHistory[]> {
    const qb = this.historyRepo
      .createQueryBuilder('ph')
      .where('ph.store_id = :storeId', { storeId });

    if (dateFrom) {
      qb.andWhere('ph.snapshot_date >= :dateFrom', { dateFrom });
    } else if (days) {
      qb.andWhere('ph.snapshot_date >= CURRENT_DATE - :days::integer', { days });
    }

    if (dateTo) {
      qb.andWhere('ph.snapshot_date <= :dateTo', { dateTo });
    }

    qb.orderBy('ph.snapshot_date', 'ASC');

    return qb.getMany();
  }

  // ─── Cross-Schema Aggregation Queries (Raw SQL) ──────────────────────────────

  async getOrderMetricsForStore(storeId: string, periodDays: number = 30): Promise<{
    total_orders: number;
    total_revenue: number;
    fulfilled_orders: number;
    cancelled_orders: number;
    avg_preparation_time_min: number;
    on_time_deliveries: number;
  }> {
    const result = await this.dataSource.query(
      `
      SELECT
        COUNT(*)::integer AS total_orders,
        COALESCE(SUM(CASE WHEN payment_status IN ('captured', 'completed') THEN total_amount ELSE 0 END), 0) AS total_revenue,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END)::integer AS fulfilled_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::integer AS cancelled_orders,
        COALESCE(AVG(
          CASE WHEN prepared_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (prepared_at - created_at)) / 60.0
          END
        ), 0) AS avg_preparation_time_min,
        COUNT(CASE
          WHEN status = 'delivered'
            AND actual_delivery_at IS NOT NULL
            AND estimated_delivery_at IS NOT NULL
            AND actual_delivery_at <= estimated_delivery_at
          THEN 1
        END)::integer AS on_time_deliveries
      FROM orders.orders
      WHERE store_id = $1
        AND created_at >= NOW() - ($2 || ' days')::interval
      `,
      [storeId, periodDays],
    );

    const row = result[0] || {};
    return {
      total_orders: parseInt(row.total_orders || '0', 10),
      total_revenue: parseFloat(row.total_revenue || '0'),
      fulfilled_orders: parseInt(row.fulfilled_orders || '0', 10),
      cancelled_orders: parseInt(row.cancelled_orders || '0', 10),
      avg_preparation_time_min: parseFloat(parseFloat(row.avg_preparation_time_min || '0').toFixed(2)),
      on_time_deliveries: parseInt(row.on_time_deliveries || '0', 10),
    };
  }

  async getReturnMetricsForStore(storeId: string, periodDays: number = 30): Promise<{
    total_returns: number;
  }> {
    const result = await this.dataSource.query(
      `
      SELECT COUNT(*)::integer AS total_returns
      FROM orders.return_requests
      WHERE store_id = $1
        AND created_at >= NOW() - ($2 || ' days')::interval
      `,
      [storeId, periodDays],
    );

    return {
      total_returns: parseInt(result[0]?.total_returns || '0', 10),
    };
  }

  async getDisputeMetricsForStore(storeId: string, periodDays: number = 30): Promise<{
    total_disputes: number;
    escalated_disputes: number;
    avg_response_hours: number;
  }> {
    const result = await this.dataSource.query(
      `
      SELECT
        COUNT(*)::integer AS total_disputes,
        COUNT(CASE WHEN status IN ('escalated', 'under_review') THEN 1 END)::integer AS escalated_disputes,
        COALESCE(AVG(
          CASE WHEN vendor_responded_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (vendor_responded_at - created_at)) / 3600.0
          END
        ), 0) AS avg_response_hours
      FROM orders.disputes
      WHERE store_id = $1
        AND created_at >= NOW() - ($2 || ' days')::interval
      `,
      [storeId, periodDays],
    );

    const row = result[0] || {};
    return {
      total_disputes: parseInt(row.total_disputes || '0', 10),
      escalated_disputes: parseInt(row.escalated_disputes || '0', 10),
      avg_response_hours: parseFloat(parseFloat(row.avg_response_hours || '0').toFixed(2)),
    };
  }

  async getReviewMetricsForStore(storeId: string, periodDays: number = 30): Promise<{
    avg_rating: number;
    review_count: number;
    reviews_with_response: number;
    total_reviews: number;
  }> {
    const result = await this.dataSource.query(
      `
      SELECT
        COALESCE(AVG(rating), 0) AS avg_rating,
        COUNT(*)::integer AS review_count,
        COUNT(CASE WHEN vendor_response IS NOT NULL THEN 1 END)::integer AS reviews_with_response,
        COUNT(*)::integer AS total_reviews
      FROM reviews.reviews
      WHERE reviewable_type = 'store'
        AND reviewable_id = $1
        AND is_approved = true
        AND created_at >= NOW() - ($2 || ' days')::interval
      `,
      [storeId, periodDays],
    );

    const row = result[0] || {};
    return {
      avg_rating: parseFloat(parseFloat(row.avg_rating || '0').toFixed(2)),
      review_count: parseInt(row.review_count || '0', 10),
      reviews_with_response: parseInt(row.reviews_with_response || '0', 10),
      total_reviews: parseInt(row.total_reviews || '0', 10),
    };
  }
}
