import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { CouponRepository } from './coupon.repository';
import { RedisService } from './redis.service';
import { CouponEntity } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponQueryDto } from './dto/coupon-query.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

const COUPON_CACHE_TTL = 600; // 10 minutes
const COUPON_CACHE_PREFIX = 'coupon:code:';

export interface CouponValidationResult {
  valid: boolean;
  coupon_id: string;
  code: string;
  discount_type: string;
  discount_amount: number;
  message: string;
}

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly redisService: RedisService,
  ) {}

  // ── Admin CRUD ──

  async createCoupon(dto: CreateCouponDto, adminUserId: string): Promise<CouponEntity> {
    const existing = await this.couponRepository.findByCode(dto.code.toUpperCase());
    if (existing) {
      throw new ConflictException(`Coupon code '${dto.code}' already exists`);
    }

    const coupon = await this.couponRepository.createCoupon({
      code: dto.code.toUpperCase(),
      name: dto.name,
      description: dto.description || null,
      discount_type: dto.discount_type,
      discount_value: dto.discount_value,
      minimum_order_value: dto.minimum_order_value || 0,
      maximum_discount: dto.maximum_discount || null,
      applicable_categories: dto.applicable_categories || null,
      applicable_stores: dto.applicable_stores || null,
      usage_limit: dto.usage_limit || null,
      per_user_limit: dto.per_user_limit || 1,
      is_first_order_only: dto.is_first_order_only || false,
      valid_from: new Date(dto.valid_from),
      valid_until: new Date(dto.valid_until),
      is_active: true,
      created_by: adminUserId,
    });

    this.logger.log(`Coupon created: ${coupon.code} by admin ${adminUserId}`);
    return coupon;
  }

  async getCouponById(id: string): Promise<CouponEntity> {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException(`Coupon with id ${id} not found`);
    }
    return coupon;
  }

  async listCoupons(query: CouponQueryDto) {
    const result = await this.couponRepository.findCoupons(query);
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async updateCoupon(id: string, dto: UpdateCouponDto): Promise<CouponEntity> {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException(`Coupon with id ${id} not found`);
    }

    const updateData: Partial<CouponEntity> = {};

    if (dto.code !== undefined) updateData.code = dto.code.toUpperCase();
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description || null;
    if (dto.discount_type !== undefined) updateData.discount_type = dto.discount_type;
    if (dto.discount_value !== undefined) updateData.discount_value = dto.discount_value;
    if (dto.minimum_order_value !== undefined) updateData.minimum_order_value = dto.minimum_order_value;
    if (dto.maximum_discount !== undefined) updateData.maximum_discount = dto.maximum_discount;
    if (dto.applicable_categories !== undefined) updateData.applicable_categories = dto.applicable_categories || null;
    if (dto.applicable_stores !== undefined) updateData.applicable_stores = dto.applicable_stores || null;
    if (dto.usage_limit !== undefined) updateData.usage_limit = dto.usage_limit;
    if (dto.per_user_limit !== undefined) updateData.per_user_limit = dto.per_user_limit;
    if (dto.is_first_order_only !== undefined) updateData.is_first_order_only = dto.is_first_order_only;
    if (dto.valid_from !== undefined) updateData.valid_from = new Date(dto.valid_from);
    if (dto.valid_until !== undefined) updateData.valid_until = new Date(dto.valid_until);
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    const updated = await this.couponRepository.updateCoupon(id, updateData);
    if (!updated) {
      throw new NotFoundException(`Coupon with id ${id} not found after update`);
    }

    // Invalidate cache
    await this.invalidateCouponCache(coupon.code);
    if (dto.code && dto.code.toUpperCase() !== coupon.code) {
      await this.invalidateCouponCache(dto.code.toUpperCase());
    }

    this.logger.log(`Coupon updated: ${updated.code}`);
    return updated;
  }

  async deleteCoupon(id: string): Promise<void> {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException(`Coupon with id ${id} not found`);
    }

    const hasUsages = await this.couponRepository.hasUsages(id);
    if (hasUsages) {
      // Soft-delete: deactivate instead of hard-deleting
      await this.couponRepository.softDeleteCoupon(id);
      this.logger.log(`Coupon soft-deleted (deactivated): ${coupon.code}`);
    } else {
      await this.couponRepository.deleteCoupon(id);
      this.logger.log(`Coupon hard-deleted: ${coupon.code}`);
    }

    await this.invalidateCouponCache(coupon.code);
  }

  // ── Vendor-Scoped CRUD ──

  async listVendorCoupons(storeId: string, query: CouponQueryDto) {
    const result = await this.couponRepository.findCouponsByStoreId(storeId, query);
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getVendorCoupon(couponId: string, storeId: string): Promise<CouponEntity> {
    const coupon = await this.couponRepository.findById(couponId);
    if (!coupon) {
      throw new NotFoundException(`Coupon with id ${couponId} not found`);
    }
    if (!coupon.applicable_stores || !coupon.applicable_stores.includes(storeId)) {
      throw new NotFoundException(`Coupon not found for this store`);
    }
    return coupon;
  }

  async createVendorCoupon(dto: CreateCouponDto, storeId: string, userId: string): Promise<CouponEntity> {
    const existing = await this.couponRepository.findByCode(dto.code.toUpperCase());
    if (existing) {
      throw new ConflictException(`Coupon code '${dto.code}' already exists`);
    }

    // Ensure the coupon is scoped to the vendor's store
    const applicableStores = dto.applicable_stores
      ? [...new Set([...dto.applicable_stores, storeId])]
      : [storeId];

    const coupon = await this.couponRepository.createCoupon({
      code: dto.code.toUpperCase(),
      name: dto.name,
      description: dto.description || null,
      discount_type: dto.discount_type,
      discount_value: dto.discount_value,
      minimum_order_value: dto.minimum_order_value || 0,
      maximum_discount: dto.maximum_discount || null,
      applicable_categories: dto.applicable_categories || null,
      applicable_stores: applicableStores,
      usage_limit: dto.usage_limit || null,
      per_user_limit: dto.per_user_limit || 1,
      is_first_order_only: dto.is_first_order_only || false,
      valid_from: new Date(dto.valid_from),
      valid_until: new Date(dto.valid_until),
      is_active: true,
      created_by: userId,
    });

    this.logger.log(`Vendor coupon created: ${coupon.code} for store ${storeId}`);
    return coupon;
  }

  async updateVendorCoupon(couponId: string, dto: UpdateCouponDto, storeId: string): Promise<CouponEntity> {
    const coupon = await this.getVendorCoupon(couponId, storeId);

    const updateData: Partial<CouponEntity> = {};
    if (dto.code !== undefined) updateData.code = dto.code.toUpperCase();
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description || null;
    if (dto.discount_type !== undefined) updateData.discount_type = dto.discount_type;
    if (dto.discount_value !== undefined) updateData.discount_value = dto.discount_value;
    if (dto.minimum_order_value !== undefined) updateData.minimum_order_value = dto.minimum_order_value;
    if (dto.maximum_discount !== undefined) updateData.maximum_discount = dto.maximum_discount;
    if (dto.applicable_categories !== undefined) updateData.applicable_categories = dto.applicable_categories || null;
    if (dto.usage_limit !== undefined) updateData.usage_limit = dto.usage_limit;
    if (dto.per_user_limit !== undefined) updateData.per_user_limit = dto.per_user_limit;
    if (dto.is_first_order_only !== undefined) updateData.is_first_order_only = dto.is_first_order_only;
    if (dto.valid_from !== undefined) updateData.valid_from = new Date(dto.valid_from);
    if (dto.valid_until !== undefined) updateData.valid_until = new Date(dto.valid_until);
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    const updated = await this.couponRepository.updateCoupon(couponId, updateData);
    if (!updated) {
      throw new NotFoundException(`Coupon with id ${couponId} not found after update`);
    }

    await this.invalidateCouponCache(coupon.code);
    if (dto.code && dto.code.toUpperCase() !== coupon.code) {
      await this.invalidateCouponCache(dto.code.toUpperCase());
    }

    this.logger.log(`Vendor coupon updated: ${updated.code}`);
    return updated;
  }

  async deleteVendorCoupon(couponId: string, storeId: string): Promise<void> {
    await this.getVendorCoupon(couponId, storeId);

    const hasUsages = await this.couponRepository.hasUsages(couponId);
    if (hasUsages) {
      await this.couponRepository.softDeleteCoupon(couponId);
      this.logger.log(`Vendor coupon soft-deleted: ${couponId}`);
    } else {
      await this.couponRepository.deleteCoupon(couponId);
      this.logger.log(`Vendor coupon hard-deleted: ${couponId}`);
    }

    const coupon = await this.couponRepository.findById(couponId);
    if (coupon) {
      await this.invalidateCouponCache(coupon.code);
    }
  }

  // ── Coupon Validation (Customer) ──

  async validateCoupon(
    dto: ValidateCouponDto,
    userId: string,
  ): Promise<CouponValidationResult> {
    const coupon = await this.getCouponByCode(dto.code);

    // Run the 8 validation checks
    this.assertActive(coupon);
    this.assertWithinDateRange(coupon);
    this.assertUsageLimitNotReached(coupon);
    await this.assertPerUserLimitNotReached(coupon, userId);
    this.assertMinimumOrderValue(coupon, dto.subtotal);
    this.assertApplicableStore(coupon, dto.store_id);
    this.assertApplicableCategory(coupon, dto.category_ids);
    await this.assertFirstOrderIfRequired(coupon, userId);

    const discountAmount = this.calculateDiscount(coupon, dto.subtotal);

    return {
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_amount: discountAmount,
      message: `Coupon '${coupon.code}' applied successfully`,
    };
  }

  // ── Redemption & Release (called by OrderService) ──

  async redeemCoupon(
    couponId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    await this.couponRepository.recordUsage(couponId, userId, orderId, discountAmount);
    await this.couponRepository.incrementUsageCount(couponId);

    const coupon = await this.couponRepository.findById(couponId);
    if (coupon) {
      await this.invalidateCouponCache(coupon.code);
    }

    this.logger.log(`Coupon ${couponId} redeemed for order ${orderId}`);
  }

  async releaseCoupon(orderId: string): Promise<void> {
    const usage = await this.couponRepository.findUsageByOrderId(orderId);
    if (!usage) {
      // No coupon was applied to this order — nothing to release
      return;
    }

    await this.couponRepository.releaseUsage(orderId);
    await this.couponRepository.decrementUsageCount(usage.coupon_id);

    const coupon = await this.couponRepository.findById(usage.coupon_id);
    if (coupon) {
      await this.invalidateCouponCache(coupon.code);
    }

    this.logger.log(`Coupon ${usage.coupon_id} released for cancelled order ${orderId}`);
  }

  // ── Helpers ──

  async getCouponByCode(code: string): Promise<CouponEntity> {
    const cacheKey = `${COUPON_CACHE_PREFIX}${code.toUpperCase()}`;

    // Try cache first
    const cached = await this.redisService.getJson<CouponEntity>(cacheKey);
    if (cached) {
      return cached;
    }

    const coupon = await this.couponRepository.findByCode(code.toUpperCase());
    if (!coupon) {
      throw new NotFoundException(`Coupon with code '${code}' not found`);
    }

    // Cache the coupon
    await this.redisService.setJson(cacheKey, coupon, COUPON_CACHE_TTL);
    return coupon;
  }

  calculateDiscount(coupon: CouponEntity, subtotal: number): number {
    switch (coupon.discount_type) {
      case 'percentage': {
        let discount = parseFloat((subtotal * Number(coupon.discount_value) / 100).toFixed(2));
        if (coupon.maximum_discount) {
          discount = Math.min(discount, Number(coupon.maximum_discount));
        }
        return discount;
      }
      case 'fixed_amount': {
        return Math.min(Number(coupon.discount_value), subtotal);
      }
      case 'free_delivery': {
        // Discount amount is 0 — delivery fee is zeroed in createOrder
        return 0;
      }
      default:
        return 0;
    }
  }

  // ── Validation Checks ──

  private assertActive(coupon: CouponEntity): void {
    if (!coupon.is_active) {
      throw new BadRequestException('This coupon is no longer active');
    }
  }

  private assertWithinDateRange(coupon: CouponEntity): void {
    const now = new Date();
    if (now < new Date(coupon.valid_from)) {
      throw new BadRequestException('This coupon is not yet valid');
    }
    if (now > new Date(coupon.valid_until)) {
      throw new BadRequestException('This coupon has expired');
    }
  }

  private assertUsageLimitNotReached(coupon: CouponEntity): void {
    if (coupon.usage_limit !== null && Number(coupon.usage_count) >= Number(coupon.usage_limit)) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }
  }

  private async assertPerUserLimitNotReached(coupon: CouponEntity, userId: string): Promise<void> {
    const userUsages = await this.couponRepository.countUserUsages(coupon.id, userId);
    if (userUsages >= Number(coupon.per_user_limit)) {
      throw new BadRequestException('You have already used this coupon the maximum number of times');
    }
  }

  private assertMinimumOrderValue(coupon: CouponEntity, subtotal: number): void {
    if (subtotal < Number(coupon.minimum_order_value)) {
      throw new BadRequestException(
        `Minimum order value of PHP ${Number(coupon.minimum_order_value).toFixed(2)} is required to use this coupon`,
      );
    }
  }

  private assertApplicableStore(coupon: CouponEntity, storeId?: string): void {
    if (coupon.applicable_stores && coupon.applicable_stores.length > 0 && storeId) {
      if (!coupon.applicable_stores.includes(storeId)) {
        throw new BadRequestException('This coupon is not valid for this store');
      }
    }
  }

  private assertApplicableCategory(coupon: CouponEntity, categoryIds?: string[]): void {
    if (coupon.applicable_categories && coupon.applicable_categories.length > 0) {
      if (!categoryIds || categoryIds.length === 0) {
        throw new BadRequestException('This coupon is restricted to specific categories');
      }
      const hasMatch = categoryIds.some((id) => coupon.applicable_categories!.includes(id));
      if (!hasMatch) {
        throw new BadRequestException('This coupon is not valid for the items in your cart');
      }
    }
  }

  private async assertFirstOrderIfRequired(coupon: CouponEntity, userId: string): Promise<void> {
    if (!coupon.is_first_order_only) return;

    const orderCount = await this.couponRepository.countUserOrders(userId);
    if (orderCount > 0) {
      throw new BadRequestException('This coupon is only valid for first-time orders');
    }
  }

  private async invalidateCouponCache(code: string): Promise<void> {
    await this.redisService.del(`${COUPON_CACHE_PREFIX}${code.toUpperCase()}`);
  }
}
