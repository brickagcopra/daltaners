import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReviewEntity } from './entities/review.entity';
import { ReviewHelpfulEntity } from './entities/review-helpful.entity';
import { ReviewQueryDto, ReviewSortBy, SortOrder } from './dto/review-query.dto';
import { AdminReviewQueryDto } from './dto/review-query.dto';
import { CursorPaginatedResult } from './catalog.repository';

@Injectable()
export class ReviewRepository {
  private readonly logger = new Logger(ReviewRepository.name);

  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
    @InjectRepository(ReviewHelpfulEntity)
    private readonly helpfulRepo: Repository<ReviewHelpfulEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Create ─────────────────────────────────────────────────────────

  async createReview(data: Partial<ReviewEntity>): Promise<ReviewEntity> {
    const review = this.reviewRepo.create(data);
    return this.reviewRepo.save(review);
  }

  // ─── Read ───────────────────────────────────────────────────────────

  async findById(id: string): Promise<ReviewEntity | null> {
    return this.reviewRepo.findOne({ where: { id } });
  }

  async findReviews(query: ReviewQueryDto): Promise<CursorPaginatedResult<ReviewEntity>> {
    const limit = query.limit || 20;
    const sortBy = query.sort_by || ReviewSortBy.CREATED_AT;
    const sortOrder = query.sort_order || SortOrder.DESC;

    const qb = this.reviewRepo.createQueryBuilder('r')
      .where('r.is_approved = :approved', { approved: true });

    if (query.reviewable_type) {
      qb.andWhere('r.reviewable_type = :type', { type: query.reviewable_type });
    }
    if (query.reviewable_id) {
      qb.andWhere('r.reviewable_id = :rid', { rid: query.reviewable_id });
    }
    if (query.rating) {
      qb.andWhere('r.rating = :rating', { rating: query.rating });
    }

    // Cursor-based pagination
    if (query.cursor) {
      const cursorReview = await this.reviewRepo.findOne({
        where: { id: query.cursor },
        select: ['id', 'created_at', 'rating', 'helpful_count'],
      });
      if (cursorReview) {
        if (sortBy === ReviewSortBy.CREATED_AT) {
          if (sortOrder === SortOrder.DESC) {
            qb.andWhere('(r.created_at < :cursorDate OR (r.created_at = :cursorDate AND r.id < :cursorId))',
              { cursorDate: cursorReview.created_at, cursorId: cursorReview.id });
          } else {
            qb.andWhere('(r.created_at > :cursorDate OR (r.created_at = :cursorDate AND r.id > :cursorId))',
              { cursorDate: cursorReview.created_at, cursorId: cursorReview.id });
          }
        } else if (sortBy === ReviewSortBy.RATING) {
          if (sortOrder === SortOrder.DESC) {
            qb.andWhere('(r.rating < :cursorRating OR (r.rating = :cursorRating AND r.id < :cursorId))',
              { cursorRating: cursorReview.rating, cursorId: cursorReview.id });
          } else {
            qb.andWhere('(r.rating > :cursorRating OR (r.rating = :cursorRating AND r.id > :cursorId))',
              { cursorRating: cursorReview.rating, cursorId: cursorReview.id });
          }
        } else if (sortBy === ReviewSortBy.HELPFUL_COUNT) {
          if (sortOrder === SortOrder.DESC) {
            qb.andWhere('(r.helpful_count < :cursorHelpful OR (r.helpful_count = :cursorHelpful AND r.id < :cursorId))',
              { cursorHelpful: cursorReview.helpful_count, cursorId: cursorReview.id });
          } else {
            qb.andWhere('(r.helpful_count > :cursorHelpful OR (r.helpful_count = :cursorHelpful AND r.id > :cursorId))',
              { cursorHelpful: cursorReview.helpful_count, cursorId: cursorReview.id });
          }
        }
      }
    }

    qb.orderBy(`r.${sortBy}`, sortOrder)
      .addOrderBy('r.id', sortOrder)
      .take(limit + 1);

    const items = await qb.getMany();
    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items,
      nextCursor: items.length > 0 ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  async findReviewsAdmin(query: AdminReviewQueryDto): Promise<{ items: ReviewEntity[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.reviewRepo.createQueryBuilder('r');

    if (query.search) {
      qb.andWhere('(r.title ILIKE :search OR r.body ILIKE :search)',
        { search: `%${query.search}%` });
    }
    if (query.reviewable_type) {
      qb.andWhere('r.reviewable_type = :type', { type: query.reviewable_type });
    }
    if (query.is_approved !== undefined) {
      qb.andWhere('r.is_approved = :approved', { approved: query.is_approved });
    }
    if (query.rating) {
      qb.andWhere('r.rating = :rating', { rating: query.rating });
    }

    qb.orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /** Count reviews for a given reviewable entity */
  async countByReviewable(reviewable_type: string, reviewable_id: string): Promise<number> {
    return this.reviewRepo.count({
      where: { reviewable_type: reviewable_type as ReviewEntity['reviewable_type'], reviewable_id, is_approved: true },
    });
  }

  /** Get average rating for a reviewable entity */
  async getAverageRating(reviewable_type: string, reviewable_id: string): Promise<{ avg: number; count: number }> {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.reviewable_type = :type', { type: reviewable_type })
      .andWhere('r.reviewable_id = :rid', { rid: reviewable_id })
      .andWhere('r.is_approved = :approved', { approved: true })
      .getRawOne();

    return {
      avg: result?.avg ? Number(Number(result.avg).toFixed(2)) : 0,
      count: result?.count ? Number(result.count) : 0,
    };
  }

  /** Check if user has already reviewed this entity for this order */
  async findExistingReview(
    user_id: string,
    reviewable_type: string,
    reviewable_id: string,
    order_id?: string,
  ): Promise<ReviewEntity | null> {
    const where: Record<string, unknown> = {
      user_id,
      reviewable_type,
      reviewable_id,
    };
    if (order_id) {
      where.order_id = order_id;
    }
    return this.reviewRepo.findOne({ where: where as any });
  }

  /** Get reviews for a specific vendor's store and products */
  async findReviewsByVendor(
    storeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: ReviewEntity[]; total: number }> {
    // Get product IDs for this store
    const productIds = await this.dataSource.query(
      `SELECT id FROM catalog.products WHERE store_id = $1`,
      [storeId],
    );
    const pIds = productIds.map((p: { id: string }) => p.id);

    const qb = this.reviewRepo.createQueryBuilder('r')
      .where('r.is_approved = :approved', { approved: true });

    if (pIds.length > 0) {
      qb.andWhere(
        '((r.reviewable_type = :storeType AND r.reviewable_id = :storeId) OR (r.reviewable_type = :productType AND r.reviewable_id IN (:...productIds)))',
        { storeType: 'store', storeId, productType: 'product', productIds: pIds },
      );
    } else {
      qb.andWhere('r.reviewable_type = :storeType AND r.reviewable_id = :storeId',
        { storeType: 'store', storeId });
    }

    qb.orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  // ─── Update ─────────────────────────────────────────────────────────

  async updateReview(id: string, data: Partial<ReviewEntity>): Promise<ReviewEntity | null> {
    await this.reviewRepo.update(id, data as any);
    return this.findById(id);
  }

  /** Update rating aggregates on the reviewable entity (product or store) */
  async updateRatingAggregates(reviewable_type: string, reviewable_id: string): Promise<void> {
    const { avg, count } = await this.getAverageRating(reviewable_type, reviewable_id);

    if (reviewable_type === 'product') {
      await this.dataSource.query(
        `UPDATE catalog.products SET rating_average = $1, rating_count = $2, updated_at = NOW() WHERE id = $3`,
        [avg, count, reviewable_id],
      );
    } else if (reviewable_type === 'store') {
      await this.dataSource.query(
        `UPDATE vendors.stores SET rating_average = $1, rating_count = $2, updated_at = NOW() WHERE id = $3`,
        [avg, count, reviewable_id],
      );
    } else if (reviewable_type === 'delivery_personnel') {
      await this.dataSource.query(
        `UPDATE delivery.delivery_personnel SET rating_average = $1 WHERE id = $2`,
        [avg, reviewable_id],
      );
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────

  async deleteReview(id: string): Promise<boolean> {
    const result = await this.reviewRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ─── Helpful Votes ──────────────────────────────────────────────────

  async addHelpfulVote(review_id: string, user_id: string): Promise<boolean> {
    try {
      await this.helpfulRepo.save({ review_id, user_id });
      await this.reviewRepo
        .createQueryBuilder()
        .update()
        .set({ helpful_count: () => 'helpful_count + 1' })
        .where('id = :id', { id: review_id })
        .execute();
      return true;
    } catch (err: any) {
      if (err.code === '23505') {
        // Already voted
        return false;
      }
      throw err;
    }
  }

  async removeHelpfulVote(review_id: string, user_id: string): Promise<boolean> {
    const result = await this.helpfulRepo.delete({ review_id, user_id });
    if ((result.affected ?? 0) > 0) {
      await this.reviewRepo
        .createQueryBuilder()
        .update()
        .set({ helpful_count: () => 'GREATEST(helpful_count - 1, 0)' })
        .where('id = :id', { id: review_id })
        .execute();
      return true;
    }
    return false;
  }

  async hasUserVotedHelpful(review_id: string, user_id: string): Promise<boolean> {
    const count = await this.helpfulRepo.count({ where: { review_id, user_id } });
    return count > 0;
  }

  // ─── Verified Purchase Check ────────────────────────────────────────

  /** Check if user has a delivered order for the given store or containing the given product */
  async isVerifiedPurchase(
    user_id: string,
    reviewable_type: string,
    reviewable_id: string,
    order_id?: string,
  ): Promise<boolean> {
    let query: string;
    const params: any[] = [user_id];

    if (order_id) {
      // Check specific order
      if (reviewable_type === 'store') {
        query = `SELECT 1 FROM orders.orders WHERE id = $2 AND customer_id = $1 AND store_id = $3 AND status = 'delivered' LIMIT 1`;
        params.push(order_id, reviewable_id);
      } else if (reviewable_type === 'product') {
        query = `SELECT 1 FROM orders.orders o JOIN orders.order_items oi ON oi.order_id = o.id WHERE o.id = $2 AND o.customer_id = $1 AND oi.product_id = $3 AND o.status = 'delivered' LIMIT 1`;
        params.push(order_id, reviewable_id);
      } else {
        // delivery_personnel
        query = `SELECT 1 FROM delivery.deliveries d JOIN orders.orders o ON o.id = d.order_id WHERE d.personnel_id = $2 AND o.customer_id = $1 AND d.status = 'delivered' LIMIT 1`;
        params.push(reviewable_id);
      }
    } else {
      // Check any delivered order
      if (reviewable_type === 'store') {
        query = `SELECT 1 FROM orders.orders WHERE customer_id = $1 AND store_id = $2 AND status = 'delivered' LIMIT 1`;
        params.push(reviewable_id);
      } else if (reviewable_type === 'product') {
        query = `SELECT 1 FROM orders.orders o JOIN orders.order_items oi ON oi.order_id = o.id WHERE o.customer_id = $1 AND oi.product_id = $2 AND o.status = 'delivered' LIMIT 1`;
        params.push(reviewable_id);
      } else {
        query = `SELECT 1 FROM delivery.deliveries d JOIN orders.orders o ON o.id = d.order_id WHERE o.customer_id = $1 AND d.personnel_id = $2 AND d.status = 'delivered' LIMIT 1`;
        params.push(reviewable_id);
      }
    }

    const result = await this.dataSource.query(query, params);
    return result.length > 0;
  }

  // ─── Stats ──────────────────────────────────────────────────────────

  async getReviewStats(reviewable_type: string, reviewable_id: string): Promise<{
    average: number;
    count: number;
    distribution: Record<number, number>;
  }> {
    const { avg, count } = await this.getAverageRating(reviewable_type, reviewable_id);

    const distribution = await this.reviewRepo
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.reviewable_type = :type', { type: reviewable_type })
      .andWhere('r.reviewable_id = :rid', { rid: reviewable_id })
      .andWhere('r.is_approved = :approved', { approved: true })
      .groupBy('r.rating')
      .getRawMany();

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distribution) {
      dist[Number(row.rating)] = Number(row.count);
    }

    return { average: avg, count, distribution: dist };
  }
}
