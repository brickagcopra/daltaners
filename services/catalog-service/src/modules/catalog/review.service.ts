import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ReviewRepository } from './review.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { ReviewEntity } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto, AdminReviewQueryDto } from './dto/review-query.dto';
import { VendorResponseDto } from './dto/vendor-response.dto';
import { KAFKA_TOPIC } from './events/catalog.events';

const REVIEW_STATS_CACHE_PREFIX = 'catalog:review-stats';
const REVIEW_STATS_TTL = 600; // 10 minutes

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ─── Customer Operations ────────────────────────────────────────────

  async createReview(userId: string, dto: CreateReviewDto): Promise<ReviewEntity> {
    // Check for duplicate review
    const existing = await this.reviewRepository.findExistingReview(
      userId,
      dto.reviewable_type,
      dto.reviewable_id,
      dto.order_id,
    );
    if (existing) {
      throw new ConflictException('You have already reviewed this item');
    }

    // Check verified purchase
    const isVerified = await this.reviewRepository.isVerifiedPurchase(
      userId,
      dto.reviewable_type,
      dto.reviewable_id,
      dto.order_id,
    );

    const review = await this.reviewRepository.createReview({
      user_id: userId,
      order_id: dto.order_id || null,
      reviewable_type: dto.reviewable_type,
      reviewable_id: dto.reviewable_id,
      rating: dto.rating,
      title: dto.title || null,
      body: dto.body || null,
      images: dto.images || [],
      is_verified_purchase: isVerified,
      is_approved: true, // Auto-approve; admin can disapprove later
    });

    // Update rating aggregates on the reviewable entity
    await this.reviewRepository.updateRatingAggregates(dto.reviewable_type, dto.reviewable_id);

    // Invalidate stats cache
    await this.invalidateStatsCache(dto.reviewable_type, dto.reviewable_id);

    // Publish Kafka event
    try {
      await this.kafkaProducer.publish(KAFKA_TOPIC, 'review-created', {
        review_id: review.id,
        user_id: userId,
        reviewable_type: dto.reviewable_type,
        reviewable_id: dto.reviewable_id,
        rating: dto.rating,
        is_verified_purchase: isVerified,
      });
    } catch (err) {
      this.logger.warn(`Failed to publish review event: ${err}`);
    }

    this.logger.log(`Review created: ${review.id} by user ${userId} for ${dto.reviewable_type}/${dto.reviewable_id}`);
    return review;
  }

  async getReviews(query: ReviewQueryDto): Promise<{
    success: boolean;
    data: ReviewEntity[];
    meta: { next_cursor: string | null; has_more: boolean };
    timestamp: string;
  }> {
    const result = await this.reviewRepository.findReviews(query);
    return {
      success: true,
      data: result.items,
      meta: {
        next_cursor: result.nextCursor,
        has_more: result.hasMore,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getReviewById(id: string): Promise<ReviewEntity> {
    const review = await this.reviewRepository.findById(id);
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
    return review;
  }

  async getReviewStats(reviewable_type: string, reviewable_id: string): Promise<{
    success: boolean;
    data: { average: number; count: number; distribution: Record<number, number> };
    timestamp: string;
  }> {
    const cacheKey = `${REVIEW_STATS_CACHE_PREFIX}:${reviewable_type}:${reviewable_id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return { success: true, data: JSON.parse(cached), timestamp: new Date().toISOString() };
    }

    const stats = await this.reviewRepository.getReviewStats(reviewable_type, reviewable_id);
    await this.redisService.set(cacheKey, JSON.stringify(stats), REVIEW_STATS_TTL);

    return { success: true, data: stats, timestamp: new Date().toISOString() };
  }

  async deleteReview(userId: string, reviewId: string): Promise<void> {
    const review = await this.getReviewById(reviewId);
    if (review.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const { reviewable_type, reviewable_id } = review;
    await this.reviewRepository.deleteReview(reviewId);

    // Update aggregates after deletion
    await this.reviewRepository.updateRatingAggregates(reviewable_type, reviewable_id);
    await this.invalidateStatsCache(reviewable_type, reviewable_id);

    this.logger.log(`Review deleted: ${reviewId} by user ${userId}`);
  }

  // ─── Helpful Votes ──────────────────────────────────────────────────

  async toggleHelpful(userId: string, reviewId: string): Promise<{ helpful: boolean }> {
    // Verify review exists
    await this.getReviewById(reviewId);

    const alreadyVoted = await this.reviewRepository.hasUserVotedHelpful(reviewId, userId);
    if (alreadyVoted) {
      await this.reviewRepository.removeHelpfulVote(reviewId, userId);
      return { helpful: false };
    } else {
      await this.reviewRepository.addHelpfulVote(reviewId, userId);
      return { helpful: true };
    }
  }

  // ─── Vendor Operations ──────────────────────────────────────────────

  async getVendorReviews(
    storeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    success: boolean;
    data: ReviewEntity[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    timestamp: string;
  }> {
    const { items, total } = await this.reviewRepository.findReviewsByVendor(storeId, page, limit);
    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }

  async respondToReview(
    reviewId: string,
    storeId: string,
    dto: VendorResponseDto,
  ): Promise<ReviewEntity> {
    const review = await this.getReviewById(reviewId);

    // Verify the review is for this vendor's store or products
    if (review.reviewable_type === 'store') {
      if (review.reviewable_id !== storeId) {
        throw new ForbiddenException('This review is not for your store');
      }
    } else if (review.reviewable_type === 'product') {
      // Check if the product belongs to the vendor's store
      const isVendorProduct = await this.isProductOwnedByStore(review.reviewable_id, storeId);
      if (!isVendorProduct) {
        throw new ForbiddenException('This review is not for your product');
      }
    } else {
      throw new BadRequestException('Vendors can only respond to store and product reviews');
    }

    const updated = await this.reviewRepository.updateReview(reviewId, {
      vendor_response: dto.response,
      vendor_response_at: new Date(),
    });

    this.logger.log(`Vendor responded to review ${reviewId}`);
    return updated!;
  }

  // ─── Admin Operations ───────────────────────────────────────────────

  async adminListReviews(query: AdminReviewQueryDto): Promise<{
    success: boolean;
    data: ReviewEntity[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    timestamp: string;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const { items, total } = await this.reviewRepository.findReviewsAdmin(query);
    return {
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      timestamp: new Date().toISOString(),
    };
  }

  async adminApproveReview(reviewId: string): Promise<ReviewEntity> {
    const review = await this.getReviewById(reviewId);
    if (review.is_approved) {
      throw new ConflictException('Review is already approved');
    }

    const updated = await this.reviewRepository.updateReview(reviewId, { is_approved: true });

    // Update aggregates since an approved review now counts
    await this.reviewRepository.updateRatingAggregates(review.reviewable_type, review.reviewable_id);
    await this.invalidateStatsCache(review.reviewable_type, review.reviewable_id);

    this.logger.log(`Review approved by admin: ${reviewId}`);
    return updated!;
  }

  async adminRejectReview(reviewId: string): Promise<ReviewEntity> {
    const review = await this.getReviewById(reviewId);
    if (!review.is_approved) {
      throw new ConflictException('Review is already rejected');
    }

    const updated = await this.reviewRepository.updateReview(reviewId, { is_approved: false });

    // Update aggregates since a rejected review no longer counts
    await this.reviewRepository.updateRatingAggregates(review.reviewable_type, review.reviewable_id);
    await this.invalidateStatsCache(review.reviewable_type, review.reviewable_id);

    this.logger.log(`Review rejected by admin: ${reviewId}`);
    return updated!;
  }

  async adminDeleteReview(reviewId: string): Promise<void> {
    const review = await this.getReviewById(reviewId);
    const { reviewable_type, reviewable_id } = review;

    await this.reviewRepository.deleteReview(reviewId);

    // Update aggregates
    if (review.is_approved) {
      await this.reviewRepository.updateRatingAggregates(reviewable_type, reviewable_id);
      await this.invalidateStatsCache(reviewable_type, reviewable_id);
    }

    this.logger.log(`Review deleted by admin: ${reviewId}`);
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private async isProductOwnedByStore(productId: string, storeId: string): Promise<boolean> {
    const result = await this.reviewRepository['dataSource'].query(
      `SELECT 1 FROM catalog.products WHERE id = $1 AND store_id = $2 LIMIT 1`,
      [productId, storeId],
    );
    return result.length > 0;
  }

  private async invalidateStatsCache(reviewable_type: string, reviewable_id: string): Promise<void> {
    const cacheKey = `${REVIEW_STATS_CACHE_PREFIX}:${reviewable_type}:${reviewable_id}`;
    await this.redisService.del(cacheKey);
  }
}
