import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PricingRuleEntity, PricingRuleStatus } from './entities/pricing-rule.entity';
import { PriceHistoryEntity } from './entities/price-history.entity';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { PricingRuleQueryDto, AdminPricingRuleQueryDto } from './dto/pricing-rule-query.dto';
import { PriceHistoryQueryDto, AdminPriceHistoryQueryDto } from './dto/price-history-query.dto';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PricingRepository {
  constructor(
    @InjectRepository(PricingRuleEntity)
    private readonly ruleRepo: Repository<PricingRuleEntity>,
    @InjectRepository(PriceHistoryEntity)
    private readonly historyRepo: Repository<PriceHistoryEntity>,
  ) {}

  // ─── Pricing Rules ────────────────────────────────────────────────────

  async createRule(dto: CreatePricingRuleDto, storeId: string, userId: string): Promise<PricingRuleEntity> {
    const rule = this.ruleRepo.create({
      ...dto,
      store_id: storeId,
      start_date: new Date(dto.start_date),
      end_date: dto.end_date ? new Date(dto.end_date) : null,
      created_by: userId,
    });
    return this.ruleRepo.save(rule);
  }

  async findRuleById(id: string): Promise<PricingRuleEntity | null> {
    return this.ruleRepo.findOne({ where: { id } });
  }

  async updateRule(id: string, data: Partial<PricingRuleEntity>): Promise<PricingRuleEntity | null> {
    await this.ruleRepo.update(id, data);
    return this.findRuleById(id);
  }

  async deleteRule(id: string): Promise<void> {
    await this.ruleRepo.delete(id);
  }

  async findRulesByStore(storeId: string, query: PricingRuleQueryDto): Promise<PaginatedResult<PricingRuleEntity>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const qb = this.ruleRepo.createQueryBuilder('r')
      .where('r.store_id = :storeId', { storeId });

    this.applyRuleFilters(qb, query);

    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'DESC';
    qb.orderBy(`r.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    const [items, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllRulesAdmin(query: AdminPricingRuleQueryDto): Promise<PaginatedResult<PricingRuleEntity>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const qb = this.ruleRepo.createQueryBuilder('r');

    if (query.store_id) {
      qb.andWhere('r.store_id = :storeId', { storeId: query.store_id });
    }

    this.applyRuleFilters(qb, query);

    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'DESC';
    qb.orderBy(`r.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    const [items, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findActiveRulesForStore(storeId: string): Promise<PricingRuleEntity[]> {
    return this.ruleRepo.createQueryBuilder('r')
      .where('r.store_id = :storeId', { storeId })
      .andWhere('r.status = :status', { status: PricingRuleStatus.ACTIVE })
      .andWhere('r.is_active = :active', { active: true })
      .andWhere('r.start_date <= NOW()')
      .andWhere('(r.end_date IS NULL OR r.end_date > NOW())')
      .orderBy('r.priority', 'DESC')
      .getMany();
  }

  async findActiveRulesForProduct(storeId: string, productId: string, categoryId: string | null, brandId: string | null): Promise<PricingRuleEntity[]> {
    const qb = this.ruleRepo.createQueryBuilder('r')
      .where('r.store_id = :storeId', { storeId })
      .andWhere('r.status = :status', { status: PricingRuleStatus.ACTIVE })
      .andWhere('r.is_active = :active', { active: true })
      .andWhere('r.start_date <= NOW()')
      .andWhere('(r.end_date IS NULL OR r.end_date > NOW())');

    // Match rules that apply to: all products, or this specific product, or this category, or this brand
    const conditions: string[] = [`r.applies_to = 'all_products'`];
    const params: Record<string, unknown> = { storeId, status: PricingRuleStatus.ACTIVE, active: true };

    conditions.push(`(r.applies_to = 'specific_products' AND :productId = ANY(r.applies_to_ids))`);
    params.productId = productId;

    if (categoryId) {
      conditions.push(`(r.applies_to = 'category' AND :categoryId = ANY(r.applies_to_ids))`);
      params.categoryId = categoryId;
    }

    if (brandId) {
      conditions.push(`(r.applies_to = 'brand' AND :brandId = ANY(r.applies_to_ids))`);
      params.brandId = brandId;
    }

    qb.andWhere(`(${conditions.join(' OR ')})`, params);
    qb.orderBy('r.priority', 'DESC');

    return qb.getMany();
  }

  async findScheduledRulesToActivate(): Promise<PricingRuleEntity[]> {
    return this.ruleRepo.createQueryBuilder('r')
      .where('r.status = :status', { status: PricingRuleStatus.SCHEDULED })
      .andWhere('r.is_active = :active', { active: true })
      .andWhere('r.start_date <= NOW()')
      .getMany();
  }

  async findActiveRulesToExpire(): Promise<PricingRuleEntity[]> {
    return this.ruleRepo.createQueryBuilder('r')
      .where('r.status = :status', { status: PricingRuleStatus.ACTIVE })
      .andWhere('r.end_date IS NOT NULL')
      .andWhere('r.end_date <= NOW()')
      .getMany();
  }

  async findActiveRulesWithMaxUsesReached(): Promise<PricingRuleEntity[]> {
    return this.ruleRepo.createQueryBuilder('r')
      .where('r.status = :status', { status: PricingRuleStatus.ACTIVE })
      .andWhere('r.max_uses IS NOT NULL')
      .andWhere('r.current_uses >= r.max_uses')
      .getMany();
  }

  async incrementRuleUses(id: string): Promise<void> {
    await this.ruleRepo.createQueryBuilder()
      .update(PricingRuleEntity)
      .set({ current_uses: () => 'current_uses + 1' })
      .where('id = :id', { id })
      .execute();
  }

  async getRuleStats(storeId?: string): Promise<Record<string, number>> {
    const qb = this.ruleRepo.createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.status');

    if (storeId) {
      qb.where('r.store_id = :storeId', { storeId });
    }

    const rows = await qb.getRawMany();
    const stats: Record<string, number> = {
      total: 0,
      draft: 0,
      scheduled: 0,
      active: 0,
      paused: 0,
      expired: 0,
      cancelled: 0,
    };

    for (const row of rows) {
      const count = parseInt(row.count, 10);
      stats[row.status] = count;
      stats.total += count;
    }

    return stats;
  }

  // ─── Price History ────────────────────────────────────────────────────

  async createHistoryEntry(data: Partial<PriceHistoryEntity>): Promise<PriceHistoryEntity> {
    const entry = this.historyRepo.create(data);
    return this.historyRepo.save(entry);
  }

  async findHistoryByProduct(productId: string, query: PriceHistoryQueryDto): Promise<PaginatedResult<PriceHistoryEntity>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const qb = this.historyRepo.createQueryBuilder('h')
      .where('h.product_id = :productId', { productId });

    this.applyHistoryFilters(qb, query);

    qb.orderBy('h.created_at', 'DESC');

    const [items, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findHistoryByStore(storeId: string, query: PriceHistoryQueryDto): Promise<PaginatedResult<PriceHistoryEntity>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const qb = this.historyRepo.createQueryBuilder('h')
      .where('h.store_id = :storeId', { storeId });

    if (query.product_id) {
      qb.andWhere('h.product_id = :productId', { productId: query.product_id });
    }

    this.applyHistoryFilters(qb, query);

    qb.orderBy('h.created_at', 'DESC');

    const [items, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllHistoryAdmin(query: AdminPriceHistoryQueryDto): Promise<PaginatedResult<PriceHistoryEntity>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const qb = this.historyRepo.createQueryBuilder('h');

    if (query.store_id) {
      qb.andWhere('h.store_id = :storeId', { storeId: query.store_id });
    }

    if (query.product_id) {
      qb.andWhere('h.product_id = :productId', { productId: query.product_id });
    }

    this.applyHistoryFilters(qb, query);

    qb.orderBy('h.created_at', 'DESC');

    const [items, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private applyRuleFilters(qb: SelectQueryBuilder<PricingRuleEntity>, query: PricingRuleQueryDto): void {
    if (query.search) {
      qb.andWhere('(r.name ILIKE :search OR r.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.rule_type) {
      qb.andWhere('r.rule_type = :ruleType', { ruleType: query.rule_type });
    }

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }
  }

  private applyHistoryFilters(qb: SelectQueryBuilder<PriceHistoryEntity>, query: PriceHistoryQueryDto): void {
    if (query.change_type) {
      qb.andWhere('h.change_type = :changeType', { changeType: query.change_type });
    }

    if (query.date_from) {
      qb.andWhere('h.created_at >= :dateFrom', { dateFrom: query.date_from });
    }

    if (query.date_to) {
      qb.andWhere('h.created_at <= :dateTo', { dateTo: query.date_to });
    }
  }
}
