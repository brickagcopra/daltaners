import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingService } from '../pricing.service';
import { PricingRepository } from '../pricing.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { ProductEntity } from '../entities/product.entity';
import {
  PricingRuleEntity,
  PricingRuleType,
  PricingDiscountType,
  PricingAppliesTo,
  PricingRuleStatus,
} from '../entities/pricing-rule.entity';
import { PriceChangeType } from '../entities/price-history.entity';

describe('PricingService', () => {
  let service: PricingService;
  let pricingRepository: jest.Mocked<PricingRepository>;
  let productRepo: jest.Mocked<Repository<ProductEntity>>;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const storeId = 'store-uuid-1';
  const userId = 'user-uuid-1';

  const mockRule: PricingRuleEntity = {
    id: 'rule-uuid-1',
    store_id: storeId,
    name: '20% Off All Products',
    description: 'Summer sale',
    rule_type: PricingRuleType.FLASH_SALE,
    discount_type: PricingDiscountType.PERCENTAGE,
    discount_value: 20,
    applies_to: PricingAppliesTo.ALL_PRODUCTS,
    applies_to_ids: null,
    schedule: null,
    conditions: {},
    start_date: new Date('2026-01-01'),
    end_date: new Date('2026-12-31'),
    priority: 10,
    is_active: true,
    max_uses: null,
    current_uses: 0,
    status: PricingRuleStatus.ACTIVE,
    created_by: userId,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const mockProduct: Partial<ProductEntity> = {
    id: 'prod-uuid-1',
    store_id: storeId,
    category_id: 'cat-uuid-1',
    brand_id: 'brand-uuid-1',
    base_price: 100,
    sale_price: null,
    is_active: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PricingRepository,
          useValue: {
            createRule: jest.fn(),
            findRuleById: jest.fn(),
            updateRule: jest.fn(),
            deleteRule: jest.fn(),
            findRulesByStore: jest.fn(),
            findAllRulesAdmin: jest.fn(),
            findActiveRulesForStore: jest.fn(),
            findActiveRulesForProduct: jest.fn(),
            findScheduledRulesToActivate: jest.fn(),
            findActiveRulesToExpire: jest.fn(),
            findActiveRulesWithMaxUsesReached: jest.fn(),
            incrementRuleUses: jest.fn(),
            getRuleStats: jest.fn(),
            createHistoryEntry: jest.fn(),
            findHistoryByProduct: jest.fn(),
            findHistoryByStore: jest.fn(),
            findAllHistoryAdmin: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            delByPattern: jest.fn().mockResolvedValue(undefined),
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

    service = module.get<PricingService>(PricingService);
    pricingRepository = module.get(PricingRepository);
    productRepo = module.get(getRepositoryToken(ProductEntity));
    redisService = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  describe('createRule', () => {
    const createDto = {
      name: '20% Off All Products',
      rule_type: PricingRuleType.FLASH_SALE,
      discount_type: PricingDiscountType.PERCENTAGE,
      discount_value: 20,
      applies_to: PricingAppliesTo.ALL_PRODUCTS,
      start_date: '2026-01-01T00:00:00Z',
      end_date: '2026-12-31T23:59:59Z',
    };

    it('should create a pricing rule with auto-active status', async () => {
      pricingRepository.createRule.mockResolvedValue(mockRule);
      pricingRepository.updateRule.mockResolvedValue(mockRule);

      const result = await service.createRule(storeId, createDto, userId);

      expect(pricingRepository.createRule).toHaveBeenCalledWith(createDto, storeId, userId);
      expect(result).toBeDefined();
      expect(result.name).toBe('20% Off All Products');
    });

    it('should create a scheduled rule when start_date is in the future', async () => {
      const futureDto = {
        ...createDto,
        start_date: '2027-01-01T00:00:00Z',
      };
      const scheduledRule = { ...mockRule, status: PricingRuleStatus.SCHEDULED };
      pricingRepository.createRule.mockResolvedValue(scheduledRule);
      pricingRepository.updateRule.mockResolvedValue(scheduledRule);

      const result = await service.createRule(storeId, futureDto, userId);

      expect(pricingRepository.updateRule).toHaveBeenCalledWith(
        scheduledRule.id,
        expect.objectContaining({ status: PricingRuleStatus.SCHEDULED }),
      );
    });

    it('should reject percentage discount > 100', async () => {
      const invalidDto = { ...createDto, discount_value: 150 };

      await expect(service.createRule(storeId, invalidDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should require applies_to_ids when applies_to is not all_products', async () => {
      const invalidDto = {
        ...createDto,
        applies_to: PricingAppliesTo.SPECIFIC_PRODUCTS,
        applies_to_ids: undefined,
      };

      await expect(service.createRule(storeId, invalidDto as any, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should invalidate cache and publish event on creation', async () => {
      pricingRepository.createRule.mockResolvedValue(mockRule);
      pricingRepository.updateRule.mockResolvedValue(mockRule);

      await service.createRule(storeId, createDto, userId);

      expect(redisService.delByPattern).toHaveBeenCalled();
      expect(kafkaProducer.publish).toHaveBeenCalled();
    });
  });

  describe('updateRule', () => {
    it('should update a pricing rule', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule);
      const updatedRule = { ...mockRule, name: 'Updated Sale' };
      pricingRepository.updateRule.mockResolvedValue(updatedRule);

      const result = await service.updateRule(mockRule.id, storeId, { name: 'Updated Sale' }, userId);

      expect(result.name).toBe('Updated Sale');
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      pricingRepository.findRuleById.mockResolvedValue(null);

      await expect(
        service.updateRule('nonexistent', storeId, { name: 'Test' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for wrong store', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule);

      await expect(
        service.updateRule(mockRule.id, 'other-store', { name: 'Test' }, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject updates to expired rules', async () => {
      const expiredRule = { ...mockRule, status: PricingRuleStatus.EXPIRED };
      pricingRepository.findRuleById.mockResolvedValue(expiredRule);

      await expect(
        service.updateRule(expiredRule.id, storeId, { name: 'Test' }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject updates to cancelled rules', async () => {
      const cancelledRule = { ...mockRule, status: PricingRuleStatus.CANCELLED };
      pricingRepository.findRuleById.mockResolvedValue(cancelledRule);

      await expect(
        service.updateRule(cancelledRule.id, storeId, { name: 'Test' }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteRule', () => {
    it('should delete a draft rule', async () => {
      const draftRule = { ...mockRule, status: PricingRuleStatus.DRAFT };
      pricingRepository.findRuleById.mockResolvedValue(draftRule);

      await service.deleteRule(draftRule.id, storeId, userId);

      expect(pricingRepository.deleteRule).toHaveBeenCalledWith(draftRule.id);
    });

    it('should not allow deletion of active rules', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule); // active

      await expect(
        service.deleteRule(mockRule.id, storeId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for wrong store', async () => {
      const draftRule = { ...mockRule, status: PricingRuleStatus.DRAFT };
      pricingRepository.findRuleById.mockResolvedValue(draftRule);

      await expect(
        service.deleteRule(draftRule.id, 'other-store', userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('activateRule', () => {
    it('should activate a draft rule', async () => {
      const draftRule = { ...mockRule, status: PricingRuleStatus.DRAFT };
      pricingRepository.findRuleById.mockResolvedValue(draftRule);
      const activatedRule = { ...draftRule, status: PricingRuleStatus.ACTIVE };
      pricingRepository.updateRule.mockResolvedValue(activatedRule);

      const result = await service.activateRule(draftRule.id, storeId, userId);

      expect(result.status).toBe(PricingRuleStatus.ACTIVE);
    });

    it('should activate a paused rule', async () => {
      const pausedRule = { ...mockRule, status: PricingRuleStatus.PAUSED };
      pricingRepository.findRuleById.mockResolvedValue(pausedRule);
      const activatedRule = { ...pausedRule, status: PricingRuleStatus.ACTIVE };
      pricingRepository.updateRule.mockResolvedValue(activatedRule);

      const result = await service.activateRule(pausedRule.id, storeId, userId);

      expect(result.status).toBe(PricingRuleStatus.ACTIVE);
    });

    it('should activate a scheduled rule', async () => {
      const scheduledRule = { ...mockRule, status: PricingRuleStatus.SCHEDULED };
      pricingRepository.findRuleById.mockResolvedValue(scheduledRule);
      const activatedRule = { ...scheduledRule, status: PricingRuleStatus.ACTIVE };
      pricingRepository.updateRule.mockResolvedValue(activatedRule);

      const result = await service.activateRule(scheduledRule.id, storeId, userId);

      expect(result.status).toBe(PricingRuleStatus.ACTIVE);
    });

    it('should not activate an already expired rule', async () => {
      const expiredRule = { ...mockRule, status: PricingRuleStatus.EXPIRED };
      pricingRepository.findRuleById.mockResolvedValue(expiredRule);

      await expect(
        service.activateRule(expiredRule.id, storeId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('pauseRule', () => {
    it('should pause an active rule', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule);
      const pausedRule = { ...mockRule, status: PricingRuleStatus.PAUSED };
      pricingRepository.updateRule.mockResolvedValue(pausedRule);

      const result = await service.pauseRule(mockRule.id, storeId, userId);

      expect(result.status).toBe(PricingRuleStatus.PAUSED);
    });

    it('should not pause a non-active rule', async () => {
      const draftRule = { ...mockRule, status: PricingRuleStatus.DRAFT };
      pricingRepository.findRuleById.mockResolvedValue(draftRule);

      await expect(
        service.pauseRule(draftRule.id, storeId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelRule', () => {
    it('should cancel an active rule', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule);
      const cancelledRule = { ...mockRule, status: PricingRuleStatus.CANCELLED, is_active: false };
      pricingRepository.updateRule.mockResolvedValue(cancelledRule);

      const result = await service.cancelRule(mockRule.id, storeId, userId);

      expect(result.status).toBe(PricingRuleStatus.CANCELLED);
    });

    it('should cancel a draft rule', async () => {
      const draftRule = { ...mockRule, status: PricingRuleStatus.DRAFT };
      pricingRepository.findRuleById.mockResolvedValue(draftRule);
      const cancelledRule = { ...draftRule, status: PricingRuleStatus.CANCELLED, is_active: false };
      pricingRepository.updateRule.mockResolvedValue(cancelledRule);

      const result = await service.cancelRule(draftRule.id, storeId, userId);

      expect(result.status).toBe(PricingRuleStatus.CANCELLED);
    });

    it('should not cancel an already expired rule', async () => {
      const expiredRule = { ...mockRule, status: PricingRuleStatus.EXPIRED };
      pricingRepository.findRuleById.mockResolvedValue(expiredRule);

      await expect(
        service.cancelRule(expiredRule.id, storeId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEffectivePrice', () => {
    it('should return base price when no rules match', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct as ProductEntity);
      pricingRepository.findActiveRulesForProduct.mockResolvedValue([]);

      const result = await service.getEffectivePrice('prod-uuid-1');

      expect(result.product_id).toBe('prod-uuid-1');
      expect(result.base_price).toBe(100);
      expect(result.effective_price).toBe(100);
      expect(result.applied_rule).toBeNull();
    });

    it('should apply percentage discount correctly', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct as ProductEntity);
      pricingRepository.findActiveRulesForProduct.mockResolvedValue([mockRule]);

      const result = await service.getEffectivePrice('prod-uuid-1');

      expect(result.effective_price).toBe(80); // 100 - 20%
      expect(result.discount_amount).toBe(20);
      expect(result.applied_rule).toBeDefined();
      expect(result.applied_rule!.id).toBe(mockRule.id);
    });

    it('should apply fixed amount discount correctly', async () => {
      const fixedRule = {
        ...mockRule,
        discount_type: PricingDiscountType.FIXED_AMOUNT,
        discount_value: 25,
      };
      productRepo.findOne.mockResolvedValue(mockProduct as ProductEntity);
      pricingRepository.findActiveRulesForProduct.mockResolvedValue([fixedRule]);

      const result = await service.getEffectivePrice('prod-uuid-1');

      expect(result.effective_price).toBe(75); // 100 - 25
      expect(result.discount_amount).toBe(25);
    });

    it('should apply price override correctly', async () => {
      const overrideRule = {
        ...mockRule,
        discount_type: PricingDiscountType.PRICE_OVERRIDE,
        discount_value: 59.99,
      };
      productRepo.findOne.mockResolvedValue(mockProduct as ProductEntity);
      pricingRepository.findActiveRulesForProduct.mockResolvedValue([overrideRule]);

      const result = await service.getEffectivePrice('prod-uuid-1');

      expect(result.effective_price).toBe(59.99);
      expect(result.discount_amount).toBe(40.01);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.getEffectivePrice('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should use sale_price when no rules match and sale_price exists', async () => {
      const productWithSale = { ...mockProduct, sale_price: 80 } as ProductEntity;
      productRepo.findOne.mockResolvedValue(productWithSale);
      pricingRepository.findActiveRulesForProduct.mockResolvedValue([]);

      const result = await service.getEffectivePrice('prod-uuid-1');

      expect(result.effective_price).toBe(80);
      expect(result.discount_amount).toBe(20);
    });

    it('should filter rules by schedule (day of week)', async () => {
      const scheduledRule = {
        ...mockRule,
        schedule: { days_of_week: [99] }, // no day will match 99
      };
      productRepo.findOne.mockResolvedValue(mockProduct as ProductEntity);
      pricingRepository.findActiveRulesForProduct.mockResolvedValue([scheduledRule]);

      const result = await service.getEffectivePrice('prod-uuid-1');

      expect(result.applied_rule).toBeNull();
    });
  });

  describe('applyRulesToProducts', () => {
    it('should apply rule and update product sale prices', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule);

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProduct]),
      };
      productRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);
      productRepo.update.mockResolvedValue({} as any);
      pricingRepository.createHistoryEntry.mockResolvedValue({} as any);
      pricingRepository.incrementRuleUses.mockResolvedValue(undefined);

      const count = await service.applyRulesToProducts(mockRule.id, storeId, userId);

      expect(count).toBe(1);
      expect(productRepo.update).toHaveBeenCalledWith('prod-uuid-1', { sale_price: 80 });
      expect(pricingRepository.createHistoryEntry).toHaveBeenCalled();
    });

    it('should throw for non-active rules', async () => {
      const draftRule = { ...mockRule, status: PricingRuleStatus.DRAFT };
      pricingRepository.findRuleById.mockResolvedValue(draftRule);

      await expect(
        service.applyRulesToProducts(draftRule.id, storeId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for wrong store', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule);

      await expect(
        service.applyRulesToProducts(mockRule.id, 'other-store', userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('revertRuleFromProducts', () => {
    it('should revert product sale prices to null', async () => {
      const productWithSale = { ...mockProduct, sale_price: 80 };
      pricingRepository.findRuleById.mockResolvedValue(mockRule);

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([productWithSale]),
      };
      productRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);
      productRepo.update.mockResolvedValue({} as any);
      pricingRepository.createHistoryEntry.mockResolvedValue({} as any);

      const count = await service.revertRuleFromProducts(mockRule.id, storeId, userId);

      expect(count).toBe(1);
      expect(pricingRepository.createHistoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          change_type: PriceChangeType.RULE_EXPIRED,
          new_sale_price: null,
        }),
      );
    });
  });

  describe('Admin operations', () => {
    it('should force-expire a rule', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule);
      const expiredRule = { ...mockRule, status: PricingRuleStatus.EXPIRED, is_active: false };
      pricingRepository.updateRule.mockResolvedValue(expiredRule);

      const result = await service.forceExpireRule(mockRule.id, userId);

      expect(result.status).toBe(PricingRuleStatus.EXPIRED);
      expect(pricingRepository.updateRule).toHaveBeenCalledWith(mockRule.id, expect.objectContaining({
        status: PricingRuleStatus.EXPIRED,
        is_active: false,
      }));
    });

    it('should force-cancel a rule', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule);
      const cancelledRule = { ...mockRule, status: PricingRuleStatus.CANCELLED, is_active: false };
      pricingRepository.updateRule.mockResolvedValue(cancelledRule);

      const result = await service.forceCancelRule(mockRule.id, userId);

      expect(result.status).toBe(PricingRuleStatus.CANCELLED);
    });

    it('should get all rule stats', async () => {
      const stats = { total: 10, draft: 2, scheduled: 1, active: 4, paused: 1, expired: 1, cancelled: 1 };
      pricingRepository.getRuleStats.mockResolvedValue(stats);

      const result = await service.getAllRuleStats();

      expect(result.total).toBe(10);
      expect(result.active).toBe(4);
    });

    it('should use Redis cache for stats', async () => {
      const cachedStats = JSON.stringify({ total: 5, active: 2, draft: 1, scheduled: 0, paused: 1, expired: 1, cancelled: 0 });
      redisService.get.mockResolvedValue(cachedStats);

      const result = await service.getAllRuleStats();

      expect(result.total).toBe(5);
      expect(pricingRepository.getRuleStats).not.toHaveBeenCalled();
    });
  });

  describe('processScheduledRules (scheduler)', () => {
    it('should activate scheduled rules that have reached start date', async () => {
      const scheduledRule = { ...mockRule, status: PricingRuleStatus.SCHEDULED };
      pricingRepository.findScheduledRulesToActivate.mockResolvedValue([scheduledRule]);
      pricingRepository.findActiveRulesToExpire.mockResolvedValue([]);
      pricingRepository.findActiveRulesWithMaxUsesReached.mockResolvedValue([]);
      pricingRepository.updateRule.mockResolvedValue({ ...scheduledRule, status: PricingRuleStatus.ACTIVE });

      await service.processScheduledRules();

      expect(pricingRepository.updateRule).toHaveBeenCalledWith(scheduledRule.id, {
        status: PricingRuleStatus.ACTIVE,
      });
    });

    it('should expire active rules past their end date', async () => {
      const expiredRule = { ...mockRule, end_date: new Date('2025-01-01') };
      pricingRepository.findScheduledRulesToActivate.mockResolvedValue([]);
      pricingRepository.findActiveRulesToExpire.mockResolvedValue([expiredRule]);
      pricingRepository.findActiveRulesWithMaxUsesReached.mockResolvedValue([]);
      pricingRepository.updateRule.mockResolvedValue({ ...expiredRule, status: PricingRuleStatus.EXPIRED });

      await service.processScheduledRules();

      expect(pricingRepository.updateRule).toHaveBeenCalledWith(expiredRule.id, {
        status: PricingRuleStatus.EXPIRED,
        is_active: false,
      });
    });

    it('should expire rules that reached max uses', async () => {
      const maxUsesRule = { ...mockRule, max_uses: 10, current_uses: 10 };
      pricingRepository.findScheduledRulesToActivate.mockResolvedValue([]);
      pricingRepository.findActiveRulesToExpire.mockResolvedValue([]);
      pricingRepository.findActiveRulesWithMaxUsesReached.mockResolvedValue([maxUsesRule]);
      pricingRepository.updateRule.mockResolvedValue({ ...maxUsesRule, status: PricingRuleStatus.EXPIRED });

      await service.processScheduledRules();

      expect(pricingRepository.updateRule).toHaveBeenCalledWith(maxUsesRule.id, {
        status: PricingRuleStatus.EXPIRED,
        is_active: false,
      });
    });
  });

  describe('getRulesByStore', () => {
    it('should return paginated results', async () => {
      const result = {
        items: [mockRule],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      pricingRepository.findRulesByStore.mockResolvedValue(result);

      const response = await service.getRulesByStore(storeId, {});

      expect(response.items).toHaveLength(1);
      expect(response.total).toBe(1);
    });
  });

  describe('getRuleById', () => {
    it('should return rule when found and belongs to store', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule);

      const result = await service.getRuleById(mockRule.id, storeId);

      expect(result.id).toBe(mockRule.id);
    });

    it('should throw NotFoundException when rule not found', async () => {
      pricingRepository.findRuleById.mockResolvedValue(null);

      await expect(service.getRuleById('nonexistent', storeId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for wrong store', async () => {
      pricingRepository.findRuleById.mockResolvedValue(mockRule);

      await expect(service.getRuleById(mockRule.id, 'other-store')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRuleStats', () => {
    it('should return cached stats when available', async () => {
      const cachedStats = JSON.stringify({ total: 5, active: 3 });
      redisService.get.mockResolvedValue(cachedStats);

      const result = await service.getRuleStats(storeId);

      expect(result.total).toBe(5);
      expect(pricingRepository.getRuleStats).not.toHaveBeenCalled();
    });

    it('should fetch from repo and cache when not cached', async () => {
      redisService.get.mockResolvedValue(null);
      pricingRepository.getRuleStats.mockResolvedValue({ total: 3, active: 1, draft: 1, scheduled: 0, paused: 0, expired: 1, cancelled: 0 });

      const result = await service.getRuleStats(storeId);

      expect(result.total).toBe(3);
      expect(redisService.set).toHaveBeenCalled();
    });
  });
});
