import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CouponEntity } from './entities/coupon.entity';
import { CouponUsageEntity } from './entities/coupon-usage.entity';
import { CouponQueryDto } from './dto/coupon-query.dto';

export interface PaginatedCoupons {
  items: CouponEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CouponRepository {
  private readonly logger = new Logger(CouponRepository.name);

  constructor(
    @InjectRepository(CouponEntity)
    private readonly couponRepo: Repository<CouponEntity>,
    @InjectRepository(CouponUsageEntity)
    private readonly usageRepo: Repository<CouponUsageEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createCoupon(data: Partial<CouponEntity>): Promise<CouponEntity> {
    const coupon = this.couponRepo.create(data);
    return this.couponRepo.save(coupon);
  }

  async findById(id: string): Promise<CouponEntity | null> {
    return this.couponRepo.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<CouponEntity | null> {
    return this.couponRepo.findOne({ where: { code: code.toUpperCase() } });
  }

  async findCoupons(query: CouponQueryDto): Promise<PaginatedCoupons> {
    const { page = 1, limit = 20, search, discount_type, is_active, is_expired } = query;

    const qb = this.couponRepo
      .createQueryBuilder('coupon')
      .select([
        'coupon.id',
        'coupon.code',
        'coupon.name',
        'coupon.description',
        'coupon.discount_type',
        'coupon.discount_value',
        'coupon.minimum_order_value',
        'coupon.maximum_discount',
        'coupon.applicable_categories',
        'coupon.applicable_stores',
        'coupon.usage_limit',
        'coupon.usage_count',
        'coupon.per_user_limit',
        'coupon.is_first_order_only',
        'coupon.valid_from',
        'coupon.valid_until',
        'coupon.is_active',
        'coupon.created_by',
        'coupon.created_at',
        'coupon.updated_at',
      ]);

    if (search) {
      qb.andWhere(
        '(coupon.code ILIKE :search OR coupon.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (discount_type) {
      qb.andWhere('coupon.discount_type = :discount_type', { discount_type });
    }

    if (is_active !== undefined) {
      qb.andWhere('coupon.is_active = :is_active', { is_active });
    }

    if (is_expired === true) {
      qb.andWhere('coupon.valid_until < NOW()');
    } else if (is_expired === false) {
      qb.andWhere('coupon.valid_until >= NOW()');
    }

    qb.orderBy('coupon.created_at', 'DESC');

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findCouponsByStoreId(
    storeId: string,
    query: {
      search?: string;
      discount_type?: string;
      is_active?: boolean;
      is_expired?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedCoupons> {
    const { page = 1, limit = 20, search, discount_type, is_active, is_expired } = query;

    const qb = this.couponRepo
      .createQueryBuilder('coupon')
      .where('coupon.applicable_stores @> ARRAY[:storeId]::uuid[]', { storeId })
      .select([
        'coupon.id',
        'coupon.code',
        'coupon.name',
        'coupon.description',
        'coupon.discount_type',
        'coupon.discount_value',
        'coupon.minimum_order_value',
        'coupon.maximum_discount',
        'coupon.applicable_categories',
        'coupon.applicable_stores',
        'coupon.usage_limit',
        'coupon.usage_count',
        'coupon.per_user_limit',
        'coupon.is_first_order_only',
        'coupon.valid_from',
        'coupon.valid_until',
        'coupon.is_active',
        'coupon.created_by',
        'coupon.created_at',
        'coupon.updated_at',
      ]);

    if (search) {
      qb.andWhere(
        '(coupon.code ILIKE :search OR coupon.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (discount_type) {
      qb.andWhere('coupon.discount_type = :discount_type', { discount_type });
    }

    if (is_active !== undefined) {
      qb.andWhere('coupon.is_active = :is_active', { is_active });
    }

    if (is_expired === true) {
      qb.andWhere('coupon.valid_until < NOW()');
    } else if (is_expired === false) {
      qb.andWhere('coupon.valid_until >= NOW()');
    }

    qb.orderBy('coupon.created_at', 'DESC');

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateCoupon(id: string, data: Partial<CouponEntity>): Promise<CouponEntity | null> {
    await this.couponRepo.update(id, data as any);
    return this.findById(id);
  }

  async deleteCoupon(id: string): Promise<void> {
    await this.couponRepo.delete(id);
  }

  async softDeleteCoupon(id: string): Promise<CouponEntity | null> {
    await this.couponRepo.update(id, { is_active: false } as any);
    return this.findById(id);
  }

  async hasUsages(couponId: string): Promise<boolean> {
    const count = await this.usageRepo.count({
      where: { coupon_id: couponId },
    });
    return count > 0;
  }

  async countUserUsages(couponId: string, userId: string): Promise<number> {
    return this.usageRepo.count({
      where: {
        coupon_id: couponId,
        user_id: userId,
        released_at: undefined, // only count active (non-released) usages
      },
    });
  }

  async countUserOrders(userId: string): Promise<number> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('orders.orders', 'o')
      .where('o.customer_id = :userId', { userId })
      .andWhere("o.status NOT IN ('cancelled')")
      .getRawOne();
    return parseInt(result?.count || '0', 10);
  }

  async recordUsage(
    couponId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<CouponUsageEntity> {
    const usage = this.usageRepo.create({
      coupon_id: couponId,
      user_id: userId,
      order_id: orderId,
      discount_amount: discountAmount,
    });
    return this.usageRepo.save(usage);
  }

  async releaseUsage(orderId: string): Promise<void> {
    await this.usageRepo.update(
      { order_id: orderId, released_at: undefined as any },
      { released_at: new Date() } as any,
    );
  }

  async incrementUsageCount(couponId: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update('promotions.coupons')
      .set({ usage_count: () => 'usage_count + 1' })
      .where('id = :couponId', { couponId })
      .execute();
  }

  async decrementUsageCount(couponId: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update('promotions.coupons')
      .set({ usage_count: () => 'GREATEST(usage_count - 1, 0)' })
      .where('id = :couponId', { couponId })
      .execute();
  }

  async findUsageByOrderId(orderId: string): Promise<CouponUsageEntity | null> {
    return this.usageRepo.findOne({
      where: { order_id: orderId, released_at: undefined as any },
    });
  }
}
