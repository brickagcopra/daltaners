import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdvertisingService } from '../advertising.service';
import { AdvertisingRepository } from '../advertising.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import {
  CampaignEntity,
  CampaignStatus,
  CampaignType,
  BudgetType,
  BidType,
  Placement,
} from '../entities';

describe('AdvertisingService', () => {
  let service: AdvertisingService;
  let repo: jest.Mocked<AdvertisingRepository>;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  const mockCampaign = (overrides: Partial<CampaignEntity> = {}): CampaignEntity => ({
    id: 'campaign-1',
    store_id: 'store-1',
    name: 'Summer Sale',
    description: 'Summer promotional campaign',
    campaign_type: CampaignType.SPONSORED_LISTING,
    status: CampaignStatus.DRAFT,
    budget_type: BudgetType.TOTAL,
    budget_amount: 5000,
    spent_amount: 0,
    daily_budget: null,
    daily_spent: 0,
    daily_spent_date: null,
    bid_type: BidType.CPC,
    bid_amount: 5,
    targeting: {},
    placement: Placement.SEARCH_RESULTS,
    banner_image_url: null,
    banner_link_url: null,
    start_date: new Date('2026-04-01'),
    end_date: new Date('2026-04-30'),
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    conversion_revenue: 0,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: null,
    approved_at: null,
    created_by: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    products: [],
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvertisingService,
        {
          provide: AdvertisingRepository,
          useValue: {
            createCampaign: jest.fn(),
            findCampaignById: jest.fn(),
            updateCampaign: jest.fn(),
            deleteCampaign: jest.fn(),
            findCampaignsByStore: jest.fn(),
            findAllCampaigns: jest.fn(),
            getCampaignStats: jest.fn(),
            findActiveCampaignsForPlacement: jest.fn(),
            findActiveSponsoredProducts: jest.fn(),
            findApprovedCampaignsToActivate: jest.fn(),
            findActiveCampaignsToComplete: jest.fn(),
            findActiveCampaignsExhaustedBudget: jest.fn(),
            addCampaignProduct: jest.fn(),
            removeCampaignProduct: jest.fn(),
            findCampaignProducts: jest.fn(),
            createImpression: jest.fn(),
            incrementCampaignImpressions: jest.fn(),
            incrementProductImpressions: jest.fn(),
            createClick: jest.fn(),
            incrementCampaignClicks: jest.fn(),
            incrementProductClicks: jest.fn(),
            findClickById: jest.fn(),
            updateClick: jest.fn(),
            incrementCampaignSpent: jest.fn(),
            incrementDailySpent: jest.fn(),
            incrementProductSpent: jest.fn(),
            incrementCampaignConversions: jest.fn(),
            incrementProductConversions: jest.fn(),
            getCampaignPerformance: jest.fn(),
            getPlatformAdStats: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            publish: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(AdvertisingService);
    repo = module.get(AdvertisingRepository);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  // ── createCampaign ──────────────────────────────────────

  describe('createCampaign', () => {
    it('should create a draft campaign', async () => {
      const campaign = mockCampaign();
      repo.createCampaign.mockResolvedValue(campaign);
      repo.findCampaignById.mockResolvedValue(campaign);

      const result = await service.createCampaign('store-1', 'user-1', {
        name: 'Summer Sale',
        campaign_type: CampaignType.SPONSORED_LISTING,
        budget_amount: 5000,
        bid_amount: 5,
        start_date: '2026-04-01',
      });

      expect(result.id).toBe('campaign-1');
      expect(repo.createCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          store_id: 'store-1',
          status: CampaignStatus.DRAFT,
        }),
      );
      expect(kafka.publish).toHaveBeenCalled();
    });

    it('should add products when product_ids provided', async () => {
      const campaign = mockCampaign();
      repo.createCampaign.mockResolvedValue(campaign);
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.addCampaignProduct.mockResolvedValue({} as any);

      await service.createCampaign('store-1', 'user-1', {
        name: 'Test',
        campaign_type: CampaignType.PRODUCT_PROMOTION,
        budget_amount: 1000,
        bid_amount: 3,
        start_date: '2026-04-01',
        product_ids: ['prod-1', 'prod-2'],
      });

      expect(repo.addCampaignProduct).toHaveBeenCalledTimes(2);
    });

    it('should throw on negative budget', async () => {
      await expect(
        service.createCampaign('store-1', 'user-1', {
          name: 'Test',
          campaign_type: CampaignType.SPONSORED_LISTING,
          budget_amount: -100,
          bid_amount: 5,
          start_date: '2026-04-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── updateCampaign ──────────────────────────────────────

  describe('updateCampaign', () => {
    it('should update a draft campaign', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.DRAFT });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, name: 'Updated' });

      const result = await service.updateCampaign('campaign-1', 'store-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
      expect(repo.updateCampaign).toHaveBeenCalled();
    });

    it('should reject update for active campaign', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.ACTIVE }));

      await expect(
        service.updateCampaign('campaign-1', 'store-1', { name: 'X' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if store mismatch', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ store_id: 'other-store' }));

      await expect(
        service.updateCampaign('campaign-1', 'store-1', { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reset rejected campaign to draft on update', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.REJECTED, rejection_reason: 'Bad content' });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, status: CampaignStatus.DRAFT, rejection_reason: null });

      await service.updateCampaign('campaign-1', 'store-1', { name: 'Fixed' });

      expect(repo.updateCampaign).toHaveBeenCalledWith('campaign-1', expect.objectContaining({
        status: CampaignStatus.DRAFT,
        rejection_reason: null,
      }));
    });
  });

  // ── deleteCampaign ──────────────────────────────────────

  describe('deleteCampaign', () => {
    it('should delete a draft campaign', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.DRAFT }));

      await service.deleteCampaign('campaign-1', 'store-1');

      expect(repo.deleteCampaign).toHaveBeenCalledWith('campaign-1');
    });

    it('should reject delete for active campaign', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.ACTIVE }));

      await expect(service.deleteCampaign('campaign-1', 'store-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing campaign', async () => {
      repo.findCampaignById.mockResolvedValue(null);

      await expect(service.deleteCampaign('nope', 'store-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── submitForReview ─────────────────────────────────────

  describe('submitForReview', () => {
    it('should submit a draft campaign for review', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.DRAFT, budget_amount: 1000 });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, status: CampaignStatus.PENDING_REVIEW });

      const result = await service.submitForReview('campaign-1', 'store-1');

      expect(repo.updateCampaign).toHaveBeenCalledWith('campaign-1', { status: CampaignStatus.PENDING_REVIEW });
    });

    it('should reject submit if not draft', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.ACTIVE }));

      await expect(service.submitForReview('campaign-1', 'store-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject submit if budget is 0', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.DRAFT, budget_amount: 0 }));

      await expect(service.submitForReview('campaign-1', 'store-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── pauseCampaign ───────────────────────────────────────

  describe('pauseCampaign', () => {
    it('should pause an active campaign', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.ACTIVE });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, status: CampaignStatus.PAUSED });

      await service.pauseCampaign('campaign-1', 'store-1');

      expect(repo.updateCampaign).toHaveBeenCalledWith('campaign-1', { status: CampaignStatus.PAUSED });
    });

    it('should reject pause if not active', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.DRAFT }));

      await expect(service.pauseCampaign('campaign-1', 'store-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── resumeCampaign ──────────────────────────────────────

  describe('resumeCampaign', () => {
    it('should resume a paused campaign', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.PAUSED, budget_amount: 5000, spent_amount: 1000 });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, status: CampaignStatus.ACTIVE });

      await service.resumeCampaign('campaign-1', 'store-1');

      expect(repo.updateCampaign).toHaveBeenCalledWith('campaign-1', { status: CampaignStatus.ACTIVE });
    });

    it('should reject resume if budget exhausted', async () => {
      repo.findCampaignById.mockResolvedValue(
        mockCampaign({ status: CampaignStatus.PAUSED, budget_amount: 5000, spent_amount: 5000, budget_type: BudgetType.TOTAL }),
      );

      await expect(service.resumeCampaign('campaign-1', 'store-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject resume if not paused', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.ACTIVE }));

      await expect(service.resumeCampaign('campaign-1', 'store-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── cancelCampaign ──────────────────────────────────────

  describe('cancelCampaign', () => {
    it('should cancel an active campaign', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.ACTIVE });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, status: CampaignStatus.CANCELLED });

      await service.cancelCampaign('campaign-1', 'store-1');

      expect(repo.updateCampaign).toHaveBeenCalledWith('campaign-1', { status: CampaignStatus.CANCELLED });
    });

    it('should cancel a draft campaign', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.DRAFT });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, status: CampaignStatus.CANCELLED });

      await service.cancelCampaign('campaign-1', 'store-1');
      expect(repo.updateCampaign).toHaveBeenCalled();
    });

    it('should reject cancel for completed campaign', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.COMPLETED }));

      await expect(service.cancelCampaign('campaign-1', 'store-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── Admin: approveCampaign ──────────────────────────────

  describe('approveCampaign', () => {
    it('should approve a pending_review campaign', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.PENDING_REVIEW, start_date: new Date('2030-01-01') });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, status: CampaignStatus.APPROVED });

      await service.approveCampaign('campaign-1', 'admin-1');

      expect(repo.updateCampaign).toHaveBeenCalledWith('campaign-1', expect.objectContaining({
        status: CampaignStatus.APPROVED,
        approved_by: 'admin-1',
      }));
    });

    it('should directly activate if start_date is past', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.PENDING_REVIEW, start_date: new Date('2020-01-01') });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, status: CampaignStatus.ACTIVE });

      await service.approveCampaign('campaign-1', 'admin-1');

      expect(repo.updateCampaign).toHaveBeenCalledWith('campaign-1', expect.objectContaining({
        status: CampaignStatus.ACTIVE,
      }));
    });

    it('should reject approve if not pending_review', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.DRAFT }));

      await expect(service.approveCampaign('campaign-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── Admin: rejectCampaign ───────────────────────────────

  describe('rejectCampaign', () => {
    it('should reject a pending_review campaign with reason', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.PENDING_REVIEW });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, status: CampaignStatus.REJECTED });

      await service.rejectCampaign('campaign-1', 'admin-1', 'Inappropriate content');

      expect(repo.updateCampaign).toHaveBeenCalledWith('campaign-1', expect.objectContaining({
        status: CampaignStatus.REJECTED,
        rejection_reason: 'Inappropriate content',
      }));
    });

    it('should reject if not pending_review', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.ACTIVE }));

      await expect(service.rejectCampaign('campaign-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── Admin: suspendCampaign ──────────────────────────────

  describe('suspendCampaign', () => {
    it('should suspend an active campaign', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.ACTIVE });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.updateCampaign.mockResolvedValue({ ...campaign, status: CampaignStatus.SUSPENDED });

      await service.suspendCampaign('campaign-1', 'admin-1', 'Policy violation');

      expect(repo.updateCampaign).toHaveBeenCalledWith('campaign-1', expect.objectContaining({
        status: CampaignStatus.SUSPENDED,
        suspension_reason: 'Policy violation',
      }));
    });

    it('should reject suspend if not active', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.PAUSED }));

      await expect(service.suspendCampaign('campaign-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── Impressions & Clicks ────────────────────────────────

  describe('recordImpression', () => {
    it('should record impression for active campaign', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.ACTIVE, bid_type: BidType.CPC });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.createImpression.mockResolvedValue({ id: 'imp-1' } as any);

      const result = await service.recordImpression('campaign-1', {
        product_id: 'prod-1',
        placement: 'search_results',
      });

      expect(result).toBeDefined();
      expect(repo.createImpression).toHaveBeenCalled();
      expect(repo.incrementCampaignImpressions).toHaveBeenCalledWith('campaign-1');
    });

    it('should calculate CPM cost for impression', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.ACTIVE, bid_type: BidType.CPM, bid_amount: 50 });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.createImpression.mockResolvedValue({ id: 'imp-1' } as any);

      await service.recordImpression('campaign-1', {});

      expect(repo.createImpression).toHaveBeenCalledWith(
        expect.objectContaining({ cost: 0.05 }),
      );
    });

    it('should silently ignore non-active campaigns', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.PAUSED }));

      const result = await service.recordImpression('campaign-1', {});

      expect(result).toBeNull();
      expect(repo.createImpression).not.toHaveBeenCalled();
    });
  });

  describe('recordClick', () => {
    it('should record click for active CPC campaign', async () => {
      const campaign = mockCampaign({ status: CampaignStatus.ACTIVE, bid_type: BidType.CPC, bid_amount: 5 });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.createClick.mockResolvedValue({ id: 'click-1' } as any);

      await service.recordClick('campaign-1', { product_id: 'prod-1' });

      expect(repo.createClick).toHaveBeenCalledWith(
        expect.objectContaining({ cost: 5, campaign_id: 'campaign-1' }),
      );
      expect(repo.incrementCampaignClicks).toHaveBeenCalledWith('campaign-1');
    });

    it('should silently ignore non-active campaigns', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.DRAFT }));

      const result = await service.recordClick('campaign-1', {});

      expect(result).toBeNull();
    });
  });

  describe('recordConversion', () => {
    it('should record conversion from click', async () => {
      repo.findClickById.mockResolvedValue({
        id: 'click-1',
        campaign_id: 'campaign-1',
        campaign_product_id: 'cp-1',
      } as any);

      await service.recordConversion({
        click_id: 'click-1',
        order_id: 'order-1',
        order_amount: 999,
      });

      expect(repo.updateClick).toHaveBeenCalledWith('click-1', expect.objectContaining({
        resulted_in_order: true,
        order_id: 'order-1',
      }));
      expect(repo.incrementCampaignConversions).toHaveBeenCalledWith('campaign-1', 999);
      expect(repo.incrementProductConversions).toHaveBeenCalledWith('cp-1');
      expect(kafka.publish).toHaveBeenCalled();
    });

    it('should throw if neither click_id nor campaign_id provided', async () => {
      await expect(service.recordConversion({})).rejects.toThrow(BadRequestException);
    });
  });

  // ── Scheduler ───────────────────────────────────────────

  describe('processScheduledCampaigns', () => {
    it('should activate approved campaigns past start_date', async () => {
      const campaign = mockCampaign({ id: 'c-1', status: CampaignStatus.APPROVED });
      repo.findApprovedCampaignsToActivate.mockResolvedValue([campaign]);
      repo.findActiveCampaignsToComplete.mockResolvedValue([]);
      repo.findActiveCampaignsExhaustedBudget.mockResolvedValue([]);

      await service.processScheduledCampaigns();

      expect(repo.updateCampaign).toHaveBeenCalledWith('c-1', { status: CampaignStatus.ACTIVE });
    });

    it('should complete campaigns past end_date', async () => {
      const campaign = mockCampaign({ id: 'c-2', status: CampaignStatus.ACTIVE });
      repo.findApprovedCampaignsToActivate.mockResolvedValue([]);
      repo.findActiveCampaignsToComplete.mockResolvedValue([campaign]);
      repo.findActiveCampaignsExhaustedBudget.mockResolvedValue([]);

      await service.processScheduledCampaigns();

      expect(repo.updateCampaign).toHaveBeenCalledWith('c-2', { status: CampaignStatus.COMPLETED });
    });

    it('should pause campaigns with exhausted budget', async () => {
      const campaign = mockCampaign({ id: 'c-3', status: CampaignStatus.ACTIVE, budget_amount: 100, spent_amount: 100 });
      repo.findApprovedCampaignsToActivate.mockResolvedValue([]);
      repo.findActiveCampaignsToComplete.mockResolvedValue([]);
      repo.findActiveCampaignsExhaustedBudget.mockResolvedValue([campaign]);

      await service.processScheduledCampaigns();

      expect(repo.updateCampaign).toHaveBeenCalledWith('c-3', { status: CampaignStatus.PAUSED });
    });
  });

  // ── getCampaignStats ────────────────────────────────────

  describe('getCampaignStats', () => {
    it('should return stats from cache', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ total: 10, active: 5 }));

      const result = await service.getCampaignStats('store-1');

      expect(result.total).toBe(10);
      expect(repo.getCampaignStats).not.toHaveBeenCalled();
    });

    it('should query DB and cache on miss', async () => {
      redis.get.mockResolvedValue(null);
      repo.getCampaignStats.mockResolvedValue({ total: 8, active: 3 });

      const result = await service.getCampaignStats('store-1');

      expect(result.total).toBe(8);
      expect(redis.set).toHaveBeenCalled();
    });
  });

  // ── getCampaignPerformance ──────────────────────────────

  describe('getCampaignPerformance', () => {
    it('should return computed metrics', async () => {
      const campaign = mockCampaign({
        total_impressions: 10000,
        total_clicks: 500,
        total_conversions: 50,
        spent_amount: 2500,
        conversion_revenue: 25000,
      });
      repo.findCampaignById.mockResolvedValue(campaign);
      repo.getCampaignPerformance.mockResolvedValue({ daily: [] });

      const result = await service.getCampaignPerformance('campaign-1');

      expect(result.ctr).toBe(5);
      expect(result.conversion_rate).toBe(10);
      expect(result.avg_cpc).toBe(5);
      expect(result.roas).toBe(10);
    });
  });

  // ── Campaign Products ───────────────────────────────────

  describe('addProduct', () => {
    it('should add product to draft campaign', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.DRAFT }));
      repo.addCampaignProduct.mockResolvedValue({ id: 'cp-1' } as any);

      await service.addProduct('campaign-1', 'store-1', { product_id: 'prod-1' });

      expect(repo.addCampaignProduct).toHaveBeenCalled();
    });

    it('should reject adding to completed campaign', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.COMPLETED }));

      await expect(
        service.addProduct('campaign-1', 'store-1', { product_id: 'prod-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeProduct', () => {
    it('should remove product from campaign', async () => {
      repo.findCampaignById.mockResolvedValue(mockCampaign({ status: CampaignStatus.ACTIVE }));

      await service.removeProduct('campaign-1', 'store-1', 'prod-1');

      expect(repo.removeCampaignProduct).toHaveBeenCalledWith('campaign-1', 'prod-1');
    });
  });
});
