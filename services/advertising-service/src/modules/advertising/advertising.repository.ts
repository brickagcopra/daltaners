import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import {
  CampaignEntity,
  CampaignStatus,
  CampaignProductEntity,
  AdImpressionEntity,
  AdClickEntity,
} from './entities';
import { CampaignQueryDto, AdminCampaignQueryDto } from './dto/campaign-query.dto';

@Injectable()
export class AdvertisingRepository {
  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    @InjectRepository(CampaignProductEntity)
    private readonly campaignProductRepo: Repository<CampaignProductEntity>,
    @InjectRepository(AdImpressionEntity)
    private readonly impressionRepo: Repository<AdImpressionEntity>,
    @InjectRepository(AdClickEntity)
    private readonly clickRepo: Repository<AdClickEntity>,
  ) {}

  // ── Campaign CRUD ────────────────────────────────────────

  async createCampaign(data: Partial<CampaignEntity>): Promise<CampaignEntity> {
    const campaign = this.campaignRepo.create(data);
    return this.campaignRepo.save(campaign);
  }

  async findCampaignById(id: string): Promise<CampaignEntity | null> {
    return this.campaignRepo.findOne({
      where: { id },
      relations: ['products'],
    });
  }

  async updateCampaign(id: string, data: Partial<CampaignEntity>): Promise<CampaignEntity | null> {
    await this.campaignRepo.update(id, data);
    return this.findCampaignById(id);
  }

  async deleteCampaign(id: string): Promise<void> {
    await this.campaignRepo.delete(id);
  }

  async findCampaignsByStore(
    storeId: string,
    query: CampaignQueryDto,
  ): Promise<{ data: CampaignEntity[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.campaignRepo.createQueryBuilder('c')
      .where('c.store_id = :storeId', { storeId });

    if (query.search) {
      qb.andWhere('c.name ILIKE :search', { search: `%${query.search}%` });
    }
    if (query.status) {
      qb.andWhere('c.status = :status', { status: query.status });
    }
    if (query.campaign_type) {
      qb.andWhere('c.campaign_type = :type', { type: query.campaign_type });
    }
    if (query.placement) {
      qb.andWhere('c.placement = :placement', { placement: query.placement });
    }

    qb.orderBy('c.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findAllCampaigns(
    query: AdminCampaignQueryDto,
  ): Promise<{ data: CampaignEntity[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.campaignRepo.createQueryBuilder('c');

    if (query.search) {
      qb.andWhere('c.name ILIKE :search', { search: `%${query.search}%` });
    }
    if (query.status) {
      qb.andWhere('c.status = :status', { status: query.status });
    }
    if (query.campaign_type) {
      qb.andWhere('c.campaign_type = :type', { type: query.campaign_type });
    }
    if (query.placement) {
      qb.andWhere('c.placement = :placement', { placement: query.placement });
    }
    if (query.store_id) {
      qb.andWhere('c.store_id = :storeId', { storeId: query.store_id });
    }

    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'DESC';
    qb.orderBy(`c.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getCampaignStats(storeId?: string): Promise<Record<string, number>> {
    const qb = this.campaignRepo.createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.status');

    if (storeId) {
      qb.where('c.store_id = :storeId', { storeId });
    }

    const rows = await qb.getRawMany();
    const stats: Record<string, number> = { total: 0 };
    for (const row of rows) {
      stats[row.status] = Number(row.count);
      stats.total += Number(row.count);
    }
    return stats;
  }

  // ── Active campaign queries ──────────────────────────────

  async findActiveCampaignsForPlacement(
    placement: string,
    limit: number = 10,
  ): Promise<CampaignEntity[]> {
    return this.campaignRepo.createQueryBuilder('c')
      .where('c.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('c.placement = :placement', { placement })
      .andWhere('c.start_date <= NOW()')
      .andWhere('(c.end_date IS NULL OR c.end_date > NOW())')
      .orderBy('c.bid_amount', 'DESC')
      .take(limit)
      .getMany();
  }

  async findActiveSponsoredProducts(
    placement: string,
    limit: number = 10,
  ): Promise<CampaignProductEntity[]> {
    return this.campaignProductRepo.createQueryBuilder('cp')
      .innerJoinAndSelect('cp.campaign', 'c')
      .where('c.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('c.placement = :placement', { placement })
      .andWhere('cp.is_active = true')
      .andWhere('c.start_date <= NOW()')
      .andWhere('(c.end_date IS NULL OR c.end_date > NOW())')
      .orderBy('COALESCE(cp.bid_amount, c.bid_amount)', 'DESC')
      .take(limit)
      .getMany();
  }

  // ── Scheduler queries ────────────────────────────────────

  async findApprovedCampaignsToActivate(): Promise<CampaignEntity[]> {
    return this.campaignRepo.createQueryBuilder('c')
      .where('c.status = :status', { status: CampaignStatus.APPROVED })
      .andWhere('c.start_date <= NOW()')
      .getMany();
  }

  async findActiveCampaignsToComplete(): Promise<CampaignEntity[]> {
    return this.campaignRepo.createQueryBuilder('c')
      .where('c.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('c.end_date IS NOT NULL')
      .andWhere('c.end_date <= NOW()')
      .getMany();
  }

  async findActiveCampaignsExhaustedBudget(): Promise<CampaignEntity[]> {
    return this.campaignRepo.createQueryBuilder('c')
      .where('c.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('c.budget_type = :bt', { bt: 'total' })
      .andWhere('c.spent_amount >= c.budget_amount')
      .andWhere('c.budget_amount > 0')
      .getMany();
  }

  // ── Campaign Products ────────────────────────────────────

  async addCampaignProduct(data: Partial<CampaignProductEntity>): Promise<CampaignProductEntity> {
    const cp = this.campaignProductRepo.create(data);
    return this.campaignProductRepo.save(cp);
  }

  async removeCampaignProduct(campaignId: string, productId: string): Promise<void> {
    await this.campaignProductRepo.delete({ campaign_id: campaignId, product_id: productId });
  }

  async findCampaignProducts(campaignId: string): Promise<CampaignProductEntity[]> {
    return this.campaignProductRepo.find({ where: { campaign_id: campaignId } });
  }

  async findCampaignProductById(id: string): Promise<CampaignProductEntity | null> {
    return this.campaignProductRepo.findOne({ where: { id } });
  }

  // ── Impressions ──────────────────────────────────────────

  async createImpression(data: Partial<AdImpressionEntity>): Promise<AdImpressionEntity> {
    const impression = this.impressionRepo.create(data);
    return this.impressionRepo.save(impression);
  }

  async incrementCampaignImpressions(campaignId: string): Promise<void> {
    await this.campaignRepo.increment({ id: campaignId }, 'total_impressions', 1);
  }

  async incrementProductImpressions(campaignProductId: string): Promise<void> {
    await this.campaignProductRepo.increment({ id: campaignProductId }, 'impressions', 1);
  }

  // ── Clicks ───────────────────────────────────────────────

  async createClick(data: Partial<AdClickEntity>): Promise<AdClickEntity> {
    const click = this.clickRepo.create(data);
    return this.clickRepo.save(click);
  }

  async incrementCampaignClicks(campaignId: string): Promise<void> {
    await this.campaignRepo.increment({ id: campaignId }, 'total_clicks', 1);
  }

  async incrementProductClicks(campaignProductId: string): Promise<void> {
    await this.campaignProductRepo.increment({ id: campaignProductId }, 'clicks', 1);
  }

  async findClickById(id: string): Promise<AdClickEntity | null> {
    return this.clickRepo.findOne({ where: { id } });
  }

  async updateClick(id: string, data: Partial<AdClickEntity>): Promise<void> {
    await this.clickRepo.update(id, data);
  }

  // ── Spend tracking ───────────────────────────────────────

  async incrementCampaignSpent(campaignId: string, amount: number): Promise<void> {
    await this.campaignRepo.createQueryBuilder()
      .update(CampaignEntity)
      .set({
        spent_amount: () => `spent_amount + ${amount}`,
      })
      .where('id = :id', { id: campaignId })
      .execute();
  }

  async incrementDailySpent(campaignId: string, amount: number, today: string): Promise<void> {
    await this.campaignRepo.createQueryBuilder()
      .update(CampaignEntity)
      .set({
        daily_spent: () => `CASE WHEN daily_spent_date = '${today}' THEN daily_spent + ${amount} ELSE ${amount} END`,
        daily_spent_date: today,
      })
      .where('id = :id', { id: campaignId })
      .execute();
  }

  async incrementProductSpent(campaignProductId: string, amount: number): Promise<void> {
    await this.campaignProductRepo.createQueryBuilder()
      .update(CampaignProductEntity)
      .set({
        spent: () => `spent + ${amount}`,
      })
      .where('id = :id', { id: campaignProductId })
      .execute();
  }

  // ── Conversions ──────────────────────────────────────────

  async incrementCampaignConversions(campaignId: string, revenue: number): Promise<void> {
    await this.campaignRepo.createQueryBuilder()
      .update(CampaignEntity)
      .set({
        total_conversions: () => 'total_conversions + 1',
        conversion_revenue: () => `conversion_revenue + ${revenue}`,
      })
      .where('id = :id', { id: campaignId })
      .execute();
  }

  async incrementProductConversions(campaignProductId: string): Promise<void> {
    await this.campaignProductRepo.increment({ id: campaignProductId }, 'conversions', 1);
  }

  // ── Performance queries ──────────────────────────────────

  async getCampaignPerformance(campaignId: string, days: number = 30): Promise<{
    daily: { date: string; impressions: number; clicks: number; cost: number }[];
  }> {
    const impressionsDaily = await this.impressionRepo.createQueryBuilder('i')
      .select("DATE(i.created_at)", 'date')
      .addSelect('COUNT(*)', 'impressions')
      .addSelect('SUM(i.cost)', 'cost')
      .where('i.campaign_id = :campaignId', { campaignId })
      .andWhere('i.created_at >= NOW() - :days * INTERVAL \'1 day\'', { days })
      .groupBy("DATE(i.created_at)")
      .orderBy("DATE(i.created_at)", 'ASC')
      .getRawMany();

    const clicksDaily = await this.clickRepo.createQueryBuilder('c')
      .select("DATE(c.created_at)", 'date')
      .addSelect('COUNT(*)', 'clicks')
      .addSelect('SUM(c.cost)', 'cost')
      .where('c.campaign_id = :campaignId', { campaignId })
      .andWhere('c.created_at >= NOW() - :days * INTERVAL \'1 day\'', { days })
      .groupBy("DATE(c.created_at)")
      .orderBy("DATE(c.created_at)", 'ASC')
      .getRawMany();

    // Merge into daily array
    const map = new Map<string, { date: string; impressions: number; clicks: number; cost: number }>();
    for (const row of impressionsDaily) {
      map.set(row.date, {
        date: row.date,
        impressions: Number(row.impressions),
        clicks: 0,
        cost: Number(row.cost || 0),
      });
    }
    for (const row of clicksDaily) {
      const existing = map.get(row.date);
      if (existing) {
        existing.clicks = Number(row.clicks);
        existing.cost += Number(row.cost || 0);
      } else {
        map.set(row.date, {
          date: row.date,
          impressions: 0,
          clicks: Number(row.clicks),
          cost: Number(row.cost || 0),
        });
      }
    }

    return { daily: Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)) };
  }

  async getPlatformAdStats(): Promise<{
    total_campaigns: number;
    active_campaigns: number;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    total_revenue: number;
  }> {
    const result = await this.campaignRepo.createQueryBuilder('c')
      .select('COUNT(*)', 'total_campaigns')
      .addSelect('SUM(CASE WHEN c.status = \'active\' THEN 1 ELSE 0 END)', 'active_campaigns')
      .addSelect('SUM(c.spent_amount)', 'total_spend')
      .addSelect('SUM(c.total_impressions)', 'total_impressions')
      .addSelect('SUM(c.total_clicks)', 'total_clicks')
      .addSelect('SUM(c.total_conversions)', 'total_conversions')
      .addSelect('SUM(c.conversion_revenue)', 'total_revenue')
      .getRawOne();

    return {
      total_campaigns: Number(result.total_campaigns),
      active_campaigns: Number(result.active_campaigns),
      total_spend: Number(result.total_spend || 0),
      total_impressions: Number(result.total_impressions || 0),
      total_clicks: Number(result.total_clicks || 0),
      total_conversions: Number(result.total_conversions || 0),
      total_revenue: Number(result.total_revenue || 0),
    };
  }
}
