import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdvertisingRepository } from './advertising.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { ADVERTISING_TOPIC, ADVERTISING_EVENTS } from './events/advertising.events';
import {
  CampaignEntity,
  CampaignStatus,
  CampaignProductEntity,
  BidType,
  BudgetType,
  Placement,
} from './entities';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import {
  CampaignQueryDto,
  AdminCampaignQueryDto,
  RecordImpressionDto,
  RecordClickDto,
  RecordConversionDto,
  AddCampaignProductDto,
} from './dto/campaign-query.dto';

const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class AdvertisingService {
  private readonly logger = new Logger(AdvertisingService.name);

  constructor(
    private readonly repo: AdvertisingRepository,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ── Vendor: Campaign CRUD ────────────────────────────────

  async createCampaign(
    storeId: string,
    userId: string,
    dto: CreateCampaignDto,
  ): Promise<CampaignEntity> {
    this.validateBudget(dto.budget_amount, dto.daily_budget);

    const campaign = await this.repo.createCampaign({
      store_id: storeId,
      created_by: userId,
      name: dto.name,
      description: dto.description || null,
      campaign_type: dto.campaign_type,
      budget_type: dto.budget_type || BudgetType.TOTAL,
      budget_amount: dto.budget_amount,
      daily_budget: dto.daily_budget || null,
      bid_type: dto.bid_type || BidType.CPC,
      bid_amount: dto.bid_amount,
      targeting: dto.targeting || {},
      placement: dto.placement || Placement.SEARCH_RESULTS,
      banner_image_url: dto.banner_image_url || null,
      banner_link_url: dto.banner_link_url || null,
      start_date: new Date(dto.start_date),
      end_date: dto.end_date ? new Date(dto.end_date) : null,
      status: CampaignStatus.DRAFT,
    });

    // Add products if provided
    if (dto.product_ids?.length) {
      for (const productId of dto.product_ids) {
        await this.repo.addCampaignProduct({
          campaign_id: campaign.id,
          product_id: productId,
        });
      }
    }

    await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CAMPAIGN_CREATED, {
      campaign_id: campaign.id,
      store_id: storeId,
      campaign_type: campaign.campaign_type,
    }, campaign.id);

    await this.invalidateStoreCache(storeId);
    return this.repo.findCampaignById(campaign.id) as Promise<CampaignEntity>;
  }

  async updateCampaign(
    campaignId: string,
    storeId: string,
    dto: UpdateCampaignDto,
  ): Promise<CampaignEntity> {
    const campaign = await this.getCampaignOrFail(campaignId);
    this.assertStoreOwnership(campaign, storeId);

    if (![CampaignStatus.DRAFT, CampaignStatus.PAUSED, CampaignStatus.REJECTED].includes(campaign.status)) {
      throw new BadRequestException(
        `Cannot update campaign in ${campaign.status} status. Only draft, paused, or rejected campaigns can be edited.`,
      );
    }

    const updates: Partial<CampaignEntity> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description || null;
    if (dto.budget_amount !== undefined) updates.budget_amount = dto.budget_amount;
    if (dto.daily_budget !== undefined) updates.daily_budget = dto.daily_budget || null;
    if (dto.bid_amount !== undefined) updates.bid_amount = dto.bid_amount;
    if (dto.targeting !== undefined) updates.targeting = dto.targeting;
    if (dto.placement !== undefined) updates.placement = dto.placement;
    if (dto.banner_image_url !== undefined) updates.banner_image_url = dto.banner_image_url || null;
    if (dto.banner_link_url !== undefined) updates.banner_link_url = dto.banner_link_url || null;
    if (dto.start_date !== undefined) updates.start_date = new Date(dto.start_date);
    if (dto.end_date !== undefined) updates.end_date = dto.end_date ? new Date(dto.end_date) : null;

    // If re-submitting a rejected campaign, reset to draft
    if (campaign.status === CampaignStatus.REJECTED) {
      updates.status = CampaignStatus.DRAFT;
      updates.rejection_reason = null;
    }

    const updated = await this.repo.updateCampaign(campaignId, updates);

    await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CAMPAIGN_UPDATED, {
      campaign_id: campaignId,
      store_id: storeId,
    }, campaignId);

    await this.invalidateStoreCache(storeId);
    return updated!;
  }

  async deleteCampaign(campaignId: string, storeId: string): Promise<void> {
    const campaign = await this.getCampaignOrFail(campaignId);
    this.assertStoreOwnership(campaign, storeId);

    if (![CampaignStatus.DRAFT, CampaignStatus.REJECTED, CampaignStatus.CANCELLED].includes(campaign.status)) {
      throw new BadRequestException(
        `Cannot delete campaign in ${campaign.status} status. Only draft, rejected, or cancelled campaigns can be deleted.`,
      );
    }

    await this.repo.deleteCampaign(campaignId);
    await this.invalidateStoreCache(storeId);
  }

  async getCampaignById(campaignId: string): Promise<CampaignEntity> {
    return this.getCampaignOrFail(campaignId);
  }

  async getCampaignsByStore(
    storeId: string,
    query: CampaignQueryDto,
  ): Promise<{ data: CampaignEntity[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { data, total } = await this.repo.findCampaignsByStore(storeId, query);
    const page = query.page || 1;
    const limit = query.limit || 20;
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCampaignStats(storeId?: string): Promise<Record<string, number>> {
    const cacheKey = storeId
      ? `advertising:stats:${storeId}`
      : 'advertising:stats:platform';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const stats = await this.repo.getCampaignStats(storeId);
    await this.redis.set(cacheKey, JSON.stringify(stats), CACHE_TTL);
    return stats;
  }

  // ── Vendor: Campaign Actions ─────────────────────────────

  async submitForReview(campaignId: string, storeId: string): Promise<CampaignEntity> {
    const campaign = await this.getCampaignOrFail(campaignId);
    this.assertStoreOwnership(campaign, storeId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be submitted for review.');
    }

    if (campaign.budget_amount <= 0) {
      throw new BadRequestException('Campaign must have a budget greater than 0.');
    }

    const updated = await this.repo.updateCampaign(campaignId, {
      status: CampaignStatus.PENDING_REVIEW,
    });

    await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CAMPAIGN_SUBMITTED, {
      campaign_id: campaignId,
      store_id: storeId,
      campaign_type: campaign.campaign_type,
    }, campaignId);

    await this.invalidateStoreCache(storeId);
    return updated!;
  }

  async pauseCampaign(campaignId: string, storeId: string): Promise<CampaignEntity> {
    const campaign = await this.getCampaignOrFail(campaignId);
    this.assertStoreOwnership(campaign, storeId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Only active campaigns can be paused.');
    }

    const updated = await this.repo.updateCampaign(campaignId, {
      status: CampaignStatus.PAUSED,
    });

    await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CAMPAIGN_PAUSED, {
      campaign_id: campaignId,
      store_id: storeId,
    }, campaignId);

    await this.invalidateStoreCache(storeId);
    return updated!;
  }

  async resumeCampaign(campaignId: string, storeId: string): Promise<CampaignEntity> {
    const campaign = await this.getCampaignOrFail(campaignId);
    this.assertStoreOwnership(campaign, storeId);

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Only paused campaigns can be resumed.');
    }

    // Check budget hasn't been exhausted
    if (campaign.budget_type === 'total' && Number(campaign.spent_amount) >= Number(campaign.budget_amount)) {
      throw new BadRequestException('Campaign budget is exhausted. Increase budget before resuming.');
    }

    const updated = await this.repo.updateCampaign(campaignId, {
      status: CampaignStatus.ACTIVE,
    });

    await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CAMPAIGN_RESUMED, {
      campaign_id: campaignId,
      store_id: storeId,
    }, campaignId);

    await this.invalidateStoreCache(storeId);
    return updated!;
  }

  async cancelCampaign(campaignId: string, storeId: string): Promise<CampaignEntity> {
    const campaign = await this.getCampaignOrFail(campaignId);
    this.assertStoreOwnership(campaign, storeId);

    const cancellable = [
      CampaignStatus.DRAFT,
      CampaignStatus.PENDING_REVIEW,
      CampaignStatus.APPROVED,
      CampaignStatus.ACTIVE,
      CampaignStatus.PAUSED,
    ];
    if (!cancellable.includes(campaign.status)) {
      throw new BadRequestException(`Cannot cancel campaign in ${campaign.status} status.`);
    }

    const updated = await this.repo.updateCampaign(campaignId, {
      status: CampaignStatus.CANCELLED,
    });

    await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CAMPAIGN_CANCELLED, {
      campaign_id: campaignId,
      store_id: storeId,
    }, campaignId);

    await this.invalidateStoreCache(storeId);
    return updated!;
  }

  // ── Vendor: Campaign Products ────────────────────────────

  async addProduct(campaignId: string, storeId: string, dto: AddCampaignProductDto): Promise<CampaignProductEntity> {
    const campaign = await this.getCampaignOrFail(campaignId);
    this.assertStoreOwnership(campaign, storeId);

    if ([CampaignStatus.COMPLETED, CampaignStatus.CANCELLED].includes(campaign.status)) {
      throw new BadRequestException('Cannot add products to a completed or cancelled campaign.');
    }

    return this.repo.addCampaignProduct({
      campaign_id: campaignId,
      product_id: dto.product_id,
      bid_amount: dto.bid_amount ?? null,
    });
  }

  async removeProduct(campaignId: string, storeId: string, productId: string): Promise<void> {
    const campaign = await this.getCampaignOrFail(campaignId);
    this.assertStoreOwnership(campaign, storeId);

    if ([CampaignStatus.COMPLETED, CampaignStatus.CANCELLED].includes(campaign.status)) {
      throw new BadRequestException('Cannot modify products on a completed or cancelled campaign.');
    }

    await this.repo.removeCampaignProduct(campaignId, productId);
  }

  async getCampaignProducts(campaignId: string): Promise<CampaignProductEntity[]> {
    return this.repo.findCampaignProducts(campaignId);
  }

  async getCampaignPerformance(campaignId: string, days: number = 30) {
    const campaign = await this.getCampaignOrFail(campaignId);
    const performance = await this.repo.getCampaignPerformance(campaignId, days);

    const ctr = Number(campaign.total_impressions) > 0
      ? (Number(campaign.total_clicks) / Number(campaign.total_impressions)) * 100
      : 0;
    const conversionRate = Number(campaign.total_clicks) > 0
      ? (Number(campaign.total_conversions) / Number(campaign.total_clicks)) * 100
      : 0;
    const avgCpc = Number(campaign.total_clicks) > 0
      ? Number(campaign.spent_amount) / Number(campaign.total_clicks)
      : 0;
    const roas = Number(campaign.spent_amount) > 0
      ? Number(campaign.conversion_revenue) / Number(campaign.spent_amount)
      : 0;

    return {
      campaign_id: campaignId,
      total_impressions: Number(campaign.total_impressions),
      total_clicks: Number(campaign.total_clicks),
      total_conversions: Number(campaign.total_conversions),
      total_spent: Number(campaign.spent_amount),
      conversion_revenue: Number(campaign.conversion_revenue),
      ctr: Math.round(ctr * 100) / 100,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      avg_cpc: Math.round(avgCpc * 100) / 100,
      roas: Math.round(roas * 100) / 100,
      daily: performance.daily,
    };
  }

  // ── Admin: Campaign Management ───────────────────────────

  async getAllCampaigns(
    query: AdminCampaignQueryDto,
  ): Promise<{ data: CampaignEntity[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { data, total } = await this.repo.findAllCampaigns(query);
    const page = query.page || 1;
    const limit = query.limit || 20;
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveCampaign(campaignId: string, adminId: string): Promise<CampaignEntity> {
    const campaign = await this.getCampaignOrFail(campaignId);

    if (campaign.status !== CampaignStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only campaigns pending review can be approved.');
    }

    // If start_date is past, directly activate
    const now = new Date();
    const newStatus = campaign.start_date <= now
      ? CampaignStatus.ACTIVE
      : CampaignStatus.APPROVED;

    const updated = await this.repo.updateCampaign(campaignId, {
      status: newStatus,
      approved_by: adminId,
      approved_at: now,
    });

    const eventType = newStatus === CampaignStatus.ACTIVE
      ? ADVERTISING_EVENTS.CAMPAIGN_ACTIVATED
      : ADVERTISING_EVENTS.CAMPAIGN_APPROVED;

    await this.kafka.publish(ADVERTISING_TOPIC, eventType, {
      campaign_id: campaignId,
      store_id: campaign.store_id,
      approved_by: adminId,
    }, campaignId);

    await this.invalidateStoreCache(campaign.store_id);
    return updated!;
  }

  async rejectCampaign(campaignId: string, adminId: string, reason?: string): Promise<CampaignEntity> {
    const campaign = await this.getCampaignOrFail(campaignId);

    if (campaign.status !== CampaignStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only campaigns pending review can be rejected.');
    }

    const updated = await this.repo.updateCampaign(campaignId, {
      status: CampaignStatus.REJECTED,
      rejection_reason: reason || 'Campaign does not meet advertising guidelines.',
    });

    await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CAMPAIGN_REJECTED, {
      campaign_id: campaignId,
      store_id: campaign.store_id,
      reason,
    }, campaignId);

    await this.invalidateStoreCache(campaign.store_id);
    return updated!;
  }

  async suspendCampaign(campaignId: string, adminId: string, reason?: string): Promise<CampaignEntity> {
    const campaign = await this.getCampaignOrFail(campaignId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Only active campaigns can be suspended.');
    }

    const updated = await this.repo.updateCampaign(campaignId, {
      status: CampaignStatus.SUSPENDED,
      suspension_reason: reason || 'Campaign suspended by administrator.',
    });

    await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CAMPAIGN_SUSPENDED, {
      campaign_id: campaignId,
      store_id: campaign.store_id,
      reason,
      suspended_by: adminId,
    }, campaignId);

    await this.invalidateStoreCache(campaign.store_id);
    return updated!;
  }

  async getPlatformStats() {
    const cacheKey = 'advertising:platform-stats';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const stats = await this.repo.getPlatformAdStats();
    const statusStats = await this.repo.getCampaignStats();

    const combined = { ...stats, by_status: statusStats };
    await this.redis.set(cacheKey, JSON.stringify(combined), CACHE_TTL);
    return combined;
  }

  // ── Public: Sponsored Content ────────────────────────────

  async getSponsoredProducts(placement: string, limit: number = 5): Promise<CampaignProductEntity[]> {
    return this.repo.findActiveSponsoredProducts(placement, limit);
  }

  async getActiveBanners(placement: string, limit: number = 5): Promise<CampaignEntity[]> {
    return this.repo.findActiveCampaignsForPlacement(placement, limit);
  }

  // ── Tracking: Impressions, Clicks, Conversions ───────────

  async recordImpression(campaignId: string, dto: RecordImpressionDto) {
    const campaign = await this.getCampaignOrFail(campaignId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      return null; // Silently ignore impressions for non-active campaigns
    }

    // Calculate cost for CPM
    let cost = 0;
    if (campaign.bid_type === BidType.CPM) {
      cost = Number(campaign.bid_amount) / 1000;
    }

    const impression = await this.repo.createImpression({
      campaign_id: campaignId,
      campaign_product_id: dto.campaign_product_id || null,
      product_id: dto.product_id || null,
      user_id: dto.user_id || null,
      placement: dto.placement || campaign.placement,
      device_type: dto.device_type || 'web',
      ip_address: dto.ip_address || null,
      cost,
    });

    await this.repo.incrementCampaignImpressions(campaignId);
    if (dto.campaign_product_id) {
      await this.repo.incrementProductImpressions(dto.campaign_product_id);
    }

    if (cost > 0) {
      await this.trackSpend(campaign, cost);
    }

    return impression;
  }

  async recordClick(campaignId: string, dto: RecordClickDto) {
    const campaign = await this.getCampaignOrFail(campaignId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      return null;
    }

    // Calculate cost for CPC
    let cost = 0;
    if (campaign.bid_type === BidType.CPC) {
      cost = Number(campaign.bid_amount);
    }

    const click = await this.repo.createClick({
      campaign_id: campaignId,
      impression_id: dto.impression_id || null,
      campaign_product_id: dto.campaign_product_id || null,
      product_id: dto.product_id || null,
      user_id: dto.user_id || null,
      cost,
    });

    await this.repo.incrementCampaignClicks(campaignId);
    if (dto.campaign_product_id) {
      await this.repo.incrementProductClicks(dto.campaign_product_id);
    }

    if (cost > 0) {
      await this.trackSpend(campaign, cost);
    }

    return click;
  }

  async recordConversion(dto: RecordConversionDto) {
    if (!dto.click_id && !dto.campaign_id) {
      throw new BadRequestException('Either click_id or campaign_id is required.');
    }

    let campaignId = dto.campaign_id;

    if (dto.click_id) {
      const click = await this.repo.findClickById(dto.click_id);
      if (!click) throw new NotFoundException('Click not found');
      campaignId = click.campaign_id;

      // Mark click as conversion
      await this.repo.updateClick(dto.click_id, {
        resulted_in_order: true,
        order_id: dto.order_id || null,
        order_amount: dto.order_amount ?? null,
      });

      if (click.campaign_product_id) {
        await this.repo.incrementProductConversions(click.campaign_product_id);
      }
    }

    if (campaignId) {
      await this.repo.incrementCampaignConversions(campaignId, dto.order_amount || 0);

      await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CONVERSION_TRACKED, {
        campaign_id: campaignId,
        order_id: dto.order_id,
        order_amount: dto.order_amount,
      }, campaignId);
    }
  }

  // ── Scheduler ────────────────────────────────────────────

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledCampaigns(): Promise<void> {
    this.logger.log('Processing scheduled campaigns...');

    // Activate approved campaigns whose start_date has passed
    const toActivate = await this.repo.findApprovedCampaignsToActivate();
    for (const campaign of toActivate) {
      await this.repo.updateCampaign(campaign.id, { status: CampaignStatus.ACTIVE });
      await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CAMPAIGN_ACTIVATED, {
        campaign_id: campaign.id,
        store_id: campaign.store_id,
      }, campaign.id);
      this.logger.log(`Activated campaign ${campaign.id}`);
    }

    // Complete active campaigns past their end_date
    const toComplete = await this.repo.findActiveCampaignsToComplete();
    for (const campaign of toComplete) {
      await this.repo.updateCampaign(campaign.id, { status: CampaignStatus.COMPLETED });
      await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.CAMPAIGN_COMPLETED, {
        campaign_id: campaign.id,
        store_id: campaign.store_id,
      }, campaign.id);
      this.logger.log(`Completed campaign ${campaign.id} (end_date reached)`);
    }

    // Pause campaigns that have exhausted their total budget
    const exhausted = await this.repo.findActiveCampaignsExhaustedBudget();
    for (const campaign of exhausted) {
      await this.repo.updateCampaign(campaign.id, { status: CampaignStatus.PAUSED });
      await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.BUDGET_EXHAUSTED, {
        campaign_id: campaign.id,
        store_id: campaign.store_id,
        budget: campaign.budget_amount,
        spent: campaign.spent_amount,
      }, campaign.id);
      this.logger.log(`Paused campaign ${campaign.id} (budget exhausted)`);
    }

    if (toActivate.length || toComplete.length || exhausted.length) {
      await this.redis.del('advertising:platform-stats');
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  private async getCampaignOrFail(id: string): Promise<CampaignEntity> {
    const campaign = await this.repo.findCampaignById(id);
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  private assertStoreOwnership(campaign: CampaignEntity, storeId: string): void {
    if (campaign.store_id !== storeId) {
      throw new ForbiddenException('You do not have access to this campaign.');
    }
  }

  private validateBudget(budget: number, dailyBudget?: number): void {
    if (budget < 0) throw new BadRequestException('Budget must be non-negative.');
    if (dailyBudget !== undefined && dailyBudget < 0) {
      throw new BadRequestException('Daily budget must be non-negative.');
    }
  }

  private async trackSpend(campaign: CampaignEntity, cost: number): Promise<void> {
    await this.repo.incrementCampaignSpent(campaign.id, cost);

    // Track daily spend
    const today = new Date().toISOString().slice(0, 10);
    await this.repo.incrementDailySpent(campaign.id, cost, today);

    // Check if budget exhausted (for CPC/CPM campaigns with total budget)
    if (campaign.budget_type === 'total') {
      const newTotal = Number(campaign.spent_amount) + cost;
      if (newTotal >= Number(campaign.budget_amount) && Number(campaign.budget_amount) > 0) {
        await this.repo.updateCampaign(campaign.id, { status: CampaignStatus.PAUSED });
        await this.kafka.publish(ADVERTISING_TOPIC, ADVERTISING_EVENTS.BUDGET_EXHAUSTED, {
          campaign_id: campaign.id,
          store_id: campaign.store_id,
        }, campaign.id);
      }
    }

    // Invalidate cache
    await this.redis.del(`advertising:stats:${campaign.store_id}`);
    await this.redis.del('advertising:platform-stats');
  }

  private async invalidateStoreCache(storeId: string): Promise<void> {
    await this.redis.del(`advertising:stats:${storeId}`);
    await this.redis.del('advertising:stats:platform');
    await this.redis.del('advertising:platform-stats');
  }
}
