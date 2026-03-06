import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingRepository, PaginatedResult } from './pricing.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { PricingRuleEntity, PricingRuleStatus, PricingDiscountType, PricingSchedule } from './entities/pricing-rule.entity';
import { PriceHistoryEntity, PriceChangeType } from './entities/price-history.entity';
import { ProductEntity } from './entities/product.entity';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { PricingRuleQueryDto, AdminPricingRuleQueryDto } from './dto/pricing-rule-query.dto';
import { PriceHistoryQueryDto, AdminPriceHistoryQueryDto } from './dto/price-history-query.dto';
import { KAFKA_TOPIC } from './events/catalog.events';

const PRICING_CACHE_PREFIX = 'catalog:pricing:';
const PRICING_CACHE_TTL = 300; // 5 minutes

const PRICING_EVENTS = {
  RULE_CREATED: 'daltaners.catalog.pricing-rule-created',
  RULE_UPDATED: 'daltaners.catalog.pricing-rule-updated',
  RULE_ACTIVATED: 'daltaners.catalog.pricing-rule-activated',
  RULE_PAUSED: 'daltaners.catalog.pricing-rule-paused',
  RULE_EXPIRED: 'daltaners.catalog.pricing-rule-expired',
  RULE_CANCELLED: 'daltaners.catalog.pricing-rule-cancelled',
  RULE_DELETED: 'daltaners.catalog.pricing-rule-deleted',
  PRICES_APPLIED: 'daltaners.catalog.prices-applied',
  PRICES_REVERTED: 'daltaners.catalog.prices-reverted',
} as const;

export interface EffectivePrice {
  product_id: string;
  base_price: number;
  effective_price: number;
  discount_amount: number;
  applied_rule: {
    id: string;
    name: string;
    rule_type: string;
    discount_type: string;
    discount_value: number;
  } | null;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly pricingRepository: PricingRepository,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ─── Vendor Operations ──────────────────────────────────────────────

  async createRule(storeId: string, dto: CreatePricingRuleDto, userId: string): Promise<PricingRuleEntity> {
    this.validateDiscountValue(dto.discount_type, dto.discount_value);

    if (dto.applies_to !== 'all_products' && (!dto.applies_to_ids || dto.applies_to_ids.length === 0)) {
      throw new BadRequestException(`applies_to_ids is required when applies_to is "${dto.applies_to}"`);
    }

    const rule = await this.pricingRepository.createRule(dto, storeId, userId);

    // Auto-set status based on dates
    const now = new Date();
    const startDate = new Date(dto.start_date);
    if (startDate <= now) {
      await this.pricingRepository.updateRule(rule.id, { status: PricingRuleStatus.ACTIVE });
      rule.status = PricingRuleStatus.ACTIVE;
    } else {
      await this.pricingRepository.updateRule(rule.id, { status: PricingRuleStatus.SCHEDULED });
      rule.status = PricingRuleStatus.SCHEDULED;
    }

    await this.invalidateStorePricingCache(storeId);
    this.publishPricingEvent(PRICING_EVENTS.RULE_CREATED, rule);
    this.logger.log(`Pricing rule created: ${rule.id} for store ${storeId}`);

    return rule;
  }

  async updateRule(ruleId: string, storeId: string, dto: UpdatePricingRuleDto, userId: string): Promise<PricingRuleEntity> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }

    if (rule.store_id !== storeId) {
      throw new ForbiddenException('Cannot update a pricing rule from another store');
    }

    if (rule.status === PricingRuleStatus.EXPIRED || rule.status === PricingRuleStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update a rule in "${rule.status}" status`);
    }

    if (dto.discount_type || dto.discount_value !== undefined) {
      const discountType = dto.discount_type || rule.discount_type;
      const discountValue = dto.discount_value ?? rule.discount_value;
      this.validateDiscountValue(discountType, discountValue);
    }

    const { start_date, end_date, ...rest } = dto;
    const updateData: Partial<PricingRuleEntity> = { ...rest };
    if (start_date) {
      updateData.start_date = new Date(start_date);
    }
    if (end_date) {
      updateData.end_date = new Date(end_date);
    }

    const updated = await this.pricingRepository.updateRule(ruleId, updateData);

    await this.invalidateStorePricingCache(storeId);
    this.publishPricingEvent(PRICING_EVENTS.RULE_UPDATED, updated!);
    this.logger.log(`Pricing rule updated: ${ruleId} by user ${userId}`);

    return updated!;
  }

  async deleteRule(ruleId: string, storeId: string, userId: string): Promise<void> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }

    if (rule.store_id !== storeId) {
      throw new ForbiddenException('Cannot delete a pricing rule from another store');
    }

    if (rule.status === PricingRuleStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete an active rule. Pause or cancel it first.');
    }

    await this.pricingRepository.deleteRule(ruleId);
    await this.invalidateStorePricingCache(storeId);
    this.publishPricingEvent(PRICING_EVENTS.RULE_DELETED, rule);
    this.logger.log(`Pricing rule deleted: ${ruleId} by user ${userId}`);
  }

  async activateRule(ruleId: string, storeId: string, userId: string): Promise<PricingRuleEntity> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }

    if (rule.store_id !== storeId) {
      throw new ForbiddenException('Cannot activate a pricing rule from another store');
    }

    const allowedStatuses = [PricingRuleStatus.DRAFT, PricingRuleStatus.SCHEDULED, PricingRuleStatus.PAUSED];
    if (!allowedStatuses.includes(rule.status)) {
      throw new BadRequestException(
        `Cannot activate a rule in "${rule.status}" status. Allowed: ${allowedStatuses.join(', ')}`,
      );
    }

    const updated = await this.pricingRepository.updateRule(ruleId, {
      status: PricingRuleStatus.ACTIVE,
    });

    await this.invalidateStorePricingCache(storeId);
    this.publishPricingEvent(PRICING_EVENTS.RULE_ACTIVATED, updated!);
    this.logger.log(`Pricing rule activated: ${ruleId} by user ${userId}`);

    return updated!;
  }

  async pauseRule(ruleId: string, storeId: string, userId: string): Promise<PricingRuleEntity> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }

    if (rule.store_id !== storeId) {
      throw new ForbiddenException('Cannot pause a pricing rule from another store');
    }

    if (rule.status !== PricingRuleStatus.ACTIVE) {
      throw new BadRequestException(`Cannot pause a rule in "${rule.status}" status. Only active rules can be paused.`);
    }

    const updated = await this.pricingRepository.updateRule(ruleId, {
      status: PricingRuleStatus.PAUSED,
    });

    await this.invalidateStorePricingCache(storeId);
    this.publishPricingEvent(PRICING_EVENTS.RULE_PAUSED, updated!);
    this.logger.log(`Pricing rule paused: ${ruleId} by user ${userId}`);

    return updated!;
  }

  async cancelRule(ruleId: string, storeId: string, userId: string): Promise<PricingRuleEntity> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }

    if (rule.store_id !== storeId) {
      throw new ForbiddenException('Cannot cancel a pricing rule from another store');
    }

    if (rule.status === PricingRuleStatus.EXPIRED || rule.status === PricingRuleStatus.CANCELLED) {
      throw new BadRequestException(`Rule is already in "${rule.status}" status`);
    }

    const updated = await this.pricingRepository.updateRule(ruleId, {
      status: PricingRuleStatus.CANCELLED,
      is_active: false,
    });

    await this.invalidateStorePricingCache(storeId);
    this.publishPricingEvent(PRICING_EVENTS.RULE_CANCELLED, updated!);
    this.logger.log(`Pricing rule cancelled: ${ruleId} by user ${userId}`);

    return updated!;
  }

  async getRulesByStore(storeId: string, query: PricingRuleQueryDto): Promise<PaginatedResult<PricingRuleEntity>> {
    return this.pricingRepository.findRulesByStore(storeId, query);
  }

  async getRuleById(ruleId: string, storeId: string): Promise<PricingRuleEntity> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }

    if (rule.store_id !== storeId) {
      throw new ForbiddenException('Cannot view a pricing rule from another store');
    }

    return rule;
  }

  async getRuleStats(storeId: string): Promise<Record<string, number>> {
    const cacheKey = `${PRICING_CACHE_PREFIX}stats:${storeId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await this.pricingRepository.getRuleStats(storeId);
    await this.redisService.set(cacheKey, JSON.stringify(stats), PRICING_CACHE_TTL);
    return stats;
  }

  // ─── Effective Price Calculation ──────────────────────────────────────

  async getEffectivePrice(productId: string): Promise<EffectivePrice> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      select: ['id', 'store_id', 'category_id', 'brand_id', 'base_price', 'sale_price'],
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const basePrice = Number(product.base_price);

    // Check for active pricing rules
    const rules = await this.pricingRepository.findActiveRulesForProduct(
      product.store_id,
      product.id,
      product.category_id || null,
      product.brand_id || null,
    );

    // Filter by schedule (time-of-day check)
    const now = new Date();
    const applicableRules = rules.filter((rule) => this.isRuleActiveNow(rule, now));

    if (applicableRules.length === 0) {
      return {
        product_id: productId,
        base_price: basePrice,
        effective_price: product.sale_price ? Number(product.sale_price) : basePrice,
        discount_amount: product.sale_price ? basePrice - Number(product.sale_price) : 0,
        applied_rule: null,
      };
    }

    // Apply highest-priority rule
    const bestRule = applicableRules[0]; // Already sorted by priority DESC
    const effectivePrice = this.calculateDiscountedPrice(basePrice, bestRule);
    const discountAmount = basePrice - effectivePrice;

    return {
      product_id: productId,
      base_price: basePrice,
      effective_price: Math.max(0, effectivePrice),
      discount_amount: Math.max(0, discountAmount),
      applied_rule: {
        id: bestRule.id,
        name: bestRule.name,
        rule_type: bestRule.rule_type,
        discount_type: bestRule.discount_type,
        discount_value: Number(bestRule.discount_value),
      },
    };
  }

  // ─── Apply Rules to Products (batch update sale_price) ──────────────

  async applyRulesToProducts(ruleId: string, storeId: string, userId: string): Promise<number> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }

    if (rule.store_id !== storeId) {
      throw new ForbiddenException('Cannot apply a pricing rule from another store');
    }

    if (rule.status !== PricingRuleStatus.ACTIVE) {
      throw new BadRequestException('Can only apply active rules');
    }

    const products = await this.getProductsForRule(rule);
    let applied = 0;

    for (const product of products) {
      const basePrice = Number(product.base_price);
      const newSalePrice = this.calculateDiscountedPrice(basePrice, rule);
      const oldSalePrice = product.sale_price ? Number(product.sale_price) : null;

      if (newSalePrice !== oldSalePrice) {
        // Record price history
        await this.pricingRepository.createHistoryEntry({
          product_id: product.id,
          store_id: storeId,
          old_base_price: basePrice,
          new_base_price: basePrice,
          old_sale_price: oldSalePrice,
          new_sale_price: newSalePrice,
          change_type: PriceChangeType.RULE_APPLIED,
          rule_id: rule.id,
          changed_by: userId,
          metadata: { rule_name: rule.name },
        });

        // Update product sale_price
        await this.productRepo.update(product.id, { sale_price: newSalePrice });
        applied++;
      }
    }

    if (applied > 0) {
      await this.pricingRepository.incrementRuleUses(ruleId);
    }

    this.publishPricingEvent(PRICING_EVENTS.PRICES_APPLIED, {
      rule_id: ruleId,
      store_id: storeId,
      products_affected: applied,
    });

    this.logger.log(`Applied pricing rule ${ruleId}: ${applied} products updated`);
    return applied;
  }

  async revertRuleFromProducts(ruleId: string, storeId: string, userId: string): Promise<number> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }

    if (rule.store_id !== storeId) {
      throw new ForbiddenException('Cannot revert a pricing rule from another store');
    }

    const products = await this.getProductsForRule(rule);
    let reverted = 0;

    for (const product of products) {
      if (product.sale_price !== null) {
        const oldSalePrice = Number(product.sale_price);

        await this.pricingRepository.createHistoryEntry({
          product_id: product.id,
          store_id: storeId,
          old_base_price: Number(product.base_price),
          new_base_price: Number(product.base_price),
          old_sale_price: oldSalePrice,
          new_sale_price: null,
          change_type: PriceChangeType.RULE_EXPIRED,
          rule_id: rule.id,
          changed_by: userId,
          metadata: { rule_name: rule.name },
        });

        await this.productRepo.update(product.id, { sale_price: null as any });
        reverted++;
      }
    }

    this.publishPricingEvent(PRICING_EVENTS.PRICES_REVERTED, {
      rule_id: ruleId,
      store_id: storeId,
      products_affected: reverted,
    });

    this.logger.log(`Reverted pricing rule ${ruleId}: ${reverted} products reset`);
    return reverted;
  }

  // ─── Price History ──────────────────────────────────────────────────

  async getProductPriceHistory(productId: string, storeId: string, query: PriceHistoryQueryDto): Promise<PaginatedResult<PriceHistoryEntity>> {
    return this.pricingRepository.findHistoryByProduct(productId, query);
  }

  async getStorePriceHistory(storeId: string, query: PriceHistoryQueryDto): Promise<PaginatedResult<PriceHistoryEntity>> {
    return this.pricingRepository.findHistoryByStore(storeId, query);
  }

  // ─── Admin Operations ──────────────────────────────────────────────

  async getAllRulesAdmin(query: AdminPricingRuleQueryDto): Promise<PaginatedResult<PricingRuleEntity>> {
    return this.pricingRepository.findAllRulesAdmin(query);
  }

  async getRuleByIdAdmin(ruleId: string): Promise<PricingRuleEntity> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }
    return rule;
  }

  async forceExpireRule(ruleId: string, adminId: string): Promise<PricingRuleEntity> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }

    const updated = await this.pricingRepository.updateRule(ruleId, {
      status: PricingRuleStatus.EXPIRED,
      is_active: false,
      end_date: new Date(),
    });

    await this.invalidateStorePricingCache(rule.store_id);
    this.publishPricingEvent(PRICING_EVENTS.RULE_EXPIRED, updated!);
    this.logger.log(`Pricing rule force-expired: ${ruleId} by admin ${adminId}`);

    return updated!;
  }

  async forceCancelRule(ruleId: string, adminId: string): Promise<PricingRuleEntity> {
    const rule = await this.pricingRepository.findRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule ${ruleId} not found`);
    }

    const updated = await this.pricingRepository.updateRule(ruleId, {
      status: PricingRuleStatus.CANCELLED,
      is_active: false,
    });

    await this.invalidateStorePricingCache(rule.store_id);
    this.publishPricingEvent(PRICING_EVENTS.RULE_CANCELLED, updated!);
    this.logger.log(`Pricing rule force-cancelled: ${ruleId} by admin ${adminId}`);

    return updated!;
  }

  async getAllRuleStats(): Promise<Record<string, number>> {
    const cacheKey = `${PRICING_CACHE_PREFIX}stats:all`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await this.pricingRepository.getRuleStats();
    await this.redisService.set(cacheKey, JSON.stringify(stats), PRICING_CACHE_TTL);
    return stats;
  }

  async getAllPriceHistoryAdmin(query: AdminPriceHistoryQueryDto): Promise<PaginatedResult<PriceHistoryEntity>> {
    return this.pricingRepository.findAllHistoryAdmin(query);
  }

  // ─── Scheduler ──────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledRules(): Promise<void> {
    try {
      // Activate scheduled rules that have reached their start date
      const toActivate = await this.pricingRepository.findScheduledRulesToActivate();
      for (const rule of toActivate) {
        await this.pricingRepository.updateRule(rule.id, { status: PricingRuleStatus.ACTIVE });
        await this.invalidateStorePricingCache(rule.store_id);
        this.publishPricingEvent(PRICING_EVENTS.RULE_ACTIVATED, { ...rule, status: PricingRuleStatus.ACTIVE });
        this.logger.log(`Scheduler: Activated pricing rule ${rule.id} (${rule.name})`);
      }

      // Expire active rules that have passed their end date
      const toExpire = await this.pricingRepository.findActiveRulesToExpire();
      for (const rule of toExpire) {
        await this.pricingRepository.updateRule(rule.id, {
          status: PricingRuleStatus.EXPIRED,
          is_active: false,
        });
        await this.invalidateStorePricingCache(rule.store_id);
        this.publishPricingEvent(PRICING_EVENTS.RULE_EXPIRED, { ...rule, status: PricingRuleStatus.EXPIRED });
        this.logger.log(`Scheduler: Expired pricing rule ${rule.id} (${rule.name})`);
      }

      // Expire rules that have reached max uses
      const maxUsesReached = await this.pricingRepository.findActiveRulesWithMaxUsesReached();
      for (const rule of maxUsesReached) {
        await this.pricingRepository.updateRule(rule.id, {
          status: PricingRuleStatus.EXPIRED,
          is_active: false,
        });
        await this.invalidateStorePricingCache(rule.store_id);
        this.publishPricingEvent(PRICING_EVENTS.RULE_EXPIRED, { ...rule, status: PricingRuleStatus.EXPIRED });
        this.logger.log(`Scheduler: Expired pricing rule ${rule.id} (max uses reached)`);
      }

      if (toActivate.length || toExpire.length || maxUsesReached.length) {
        this.logger.log(
          `Scheduler: Processed ${toActivate.length} activated, ${toExpire.length} expired, ${maxUsesReached.length} max-uses-reached`,
        );
      }
    } catch (error) {
      this.logger.error(`Scheduler error: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private validateDiscountValue(discountType: string, discountValue: number): void {
    if (discountType === PricingDiscountType.PERCENTAGE && (discountValue < 0 || discountValue > 100)) {
      throw new BadRequestException('Percentage discount must be between 0 and 100');
    }
    if (discountValue < 0) {
      throw new BadRequestException('Discount value must be non-negative');
    }
  }

  private calculateDiscountedPrice(basePrice: number, rule: PricingRuleEntity): number {
    const discountValue = Number(rule.discount_value);

    switch (rule.discount_type) {
      case PricingDiscountType.PERCENTAGE:
        return Math.round((basePrice * (1 - discountValue / 100)) * 100) / 100;
      case PricingDiscountType.FIXED_AMOUNT:
        return Math.round((basePrice - discountValue) * 100) / 100;
      case PricingDiscountType.PRICE_OVERRIDE:
        return discountValue;
      default:
        return basePrice;
    }
  }

  private isRuleActiveNow(rule: PricingRuleEntity, now: Date): boolean {
    if (!rule.schedule) return true;

    const schedule = rule.schedule as PricingSchedule;

    // Check day of week
    if (schedule.days_of_week && schedule.days_of_week.length > 0) {
      const currentDay = now.getDay();
      if (!schedule.days_of_week.includes(currentDay)) {
        return false;
      }
    }

    // Check time window
    if (schedule.start_time && schedule.end_time) {
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentTime < schedule.start_time || currentTime >= schedule.end_time) {
        return false;
      }
    }

    return true;
  }

  private async getProductsForRule(rule: PricingRuleEntity): Promise<ProductEntity[]> {
    const qb = this.productRepo.createQueryBuilder('p')
      .where('p.store_id = :storeId', { storeId: rule.store_id })
      .andWhere('p.is_active = :active', { active: true })
      .select(['p.id', 'p.base_price', 'p.sale_price', 'p.store_id']);

    switch (rule.applies_to) {
      case 'specific_products':
        if (rule.applies_to_ids && rule.applies_to_ids.length > 0) {
          qb.andWhere('p.id IN (:...ids)', { ids: rule.applies_to_ids });
        }
        break;
      case 'category':
        if (rule.applies_to_ids && rule.applies_to_ids.length > 0) {
          qb.andWhere('p.category_id IN (:...ids)', { ids: rule.applies_to_ids });
        }
        break;
      case 'brand':
        if (rule.applies_to_ids && rule.applies_to_ids.length > 0) {
          qb.andWhere('p.brand_id IN (:...ids)', { ids: rule.applies_to_ids });
        }
        break;
      case 'all_products':
      default:
        break;
    }

    return qb.getMany();
  }

  private async invalidateStorePricingCache(storeId: string): Promise<void> {
    await this.redisService.delByPattern(`${PRICING_CACHE_PREFIX}*${storeId}*`);
    await this.redisService.del(`${PRICING_CACHE_PREFIX}stats:${storeId}`);
    await this.redisService.del(`${PRICING_CACHE_PREFIX}stats:all`);
  }

  private publishPricingEvent(eventType: string, data: unknown): void {
    const payload = data instanceof PricingRuleEntity
      ? this.serializeRule(data)
      : data;

    this.kafkaProducer
      .publish(KAFKA_TOPIC, eventType, payload)
      .catch((err) => {
        this.logger.error(`Failed to publish pricing event: ${eventType}`, err.stack);
      });
  }

  private serializeRule(rule: PricingRuleEntity): Record<string, unknown> {
    return {
      id: rule.id,
      store_id: rule.store_id,
      name: rule.name,
      rule_type: rule.rule_type,
      discount_type: rule.discount_type,
      discount_value: Number(rule.discount_value),
      applies_to: rule.applies_to,
      status: rule.status,
      priority: rule.priority,
      is_active: rule.is_active,
    };
  }
}
