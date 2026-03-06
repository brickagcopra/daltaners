import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LoyaltyService } from '../loyalty.service';
import { LoyaltyRepository } from '../loyalty.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { LoyaltyAccountEntity } from '../entities/loyalty-account.entity';
import { LoyaltyTransactionEntity } from '../entities/loyalty-transaction.entity';

describe('LoyaltyService', () => {
  let service: LoyaltyService;
  let loyaltyRepo: jest.Mocked<LoyaltyRepository>;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockAccount: Partial<LoyaltyAccountEntity> = {
    id: 'account-uuid-1',
    user_id: 'user-uuid-1',
    account_type: 'standard',
    points_balance: 5000,
    lifetime_points: 8000,
    tier: 'gold',
    tier_expires_at: new Date('2027-01-01'),
    is_active: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-02-01'),
  };

  const mockBronzeAccount: Partial<LoyaltyAccountEntity> = {
    id: 'account-uuid-2',
    user_id: 'user-uuid-2',
    account_type: 'standard',
    points_balance: 200,
    lifetime_points: 500,
    tier: 'bronze',
    tier_expires_at: null,
    is_active: true,
    created_at: new Date('2025-01-15'),
    updated_at: new Date('2025-02-01'),
  };

  const mockInactiveAccount: Partial<LoyaltyAccountEntity> = {
    id: 'account-uuid-3',
    user_id: 'user-uuid-3',
    account_type: 'standard',
    points_balance: 1000,
    lifetime_points: 3000,
    tier: 'silver',
    tier_expires_at: null,
    is_active: false,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-02-01'),
  };

  const mockTransaction: Partial<LoyaltyTransactionEntity> = {
    id: 'txn-uuid-1',
    account_id: 'account-uuid-1',
    type: 'earn',
    points: 1000,
    balance_after: 6000,
    reference_type: 'order',
    reference_id: 'order-uuid-1',
    description: 'Earned 1000 points from order',
    created_at: new Date('2025-02-01'),
  };

  beforeEach(async () => {
    const mockLoyaltyRepo = {
      findAccountByUserId: jest.fn(),
      findAccountById: jest.fn(),
      createAccount: jest.fn(),
      updateAccount: jest.fn(),
      addPoints: jest.fn(),
      deductPoints: jest.fn(),
      findTransactionsByAccountId: jest.fn(),
      findTransactionByReference: jest.fn(),
      findAllAccounts: jest.fn(),
      getStats: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockKafkaProducer = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: LoyaltyRepository, useValue: mockLoyaltyRepo },
        { provide: RedisService, useValue: mockRedisService },
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    loyaltyRepo = module.get(LoyaltyRepository);
    redisService = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  // ── getMyAccount ─────────────────────────────────────────────────────

  describe('getMyAccount', () => {
    it('should return cached account when available', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockAccount));

      const result = await service.getMyAccount('user-uuid-1');

      expect(result.id).toBe('account-uuid-1');
      expect(redisService.get).toHaveBeenCalledWith('loyalty:account:user-uuid-1');
      expect(loyaltyRepo.findAccountByUserId).not.toHaveBeenCalled();
    });

    it('should return existing account from database when not cached', async () => {
      redisService.get.mockResolvedValue(null);
      loyaltyRepo.findAccountByUserId.mockResolvedValue(mockAccount as LoyaltyAccountEntity);

      const result = await service.getMyAccount('user-uuid-1');

      expect(result.id).toBe('account-uuid-1');
      expect(loyaltyRepo.findAccountByUserId).toHaveBeenCalledWith('user-uuid-1');
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should auto-create account when user has none', async () => {
      redisService.get.mockResolvedValue(null);
      loyaltyRepo.findAccountByUserId.mockResolvedValue(null);
      loyaltyRepo.createAccount.mockResolvedValue({
        id: 'new-account-uuid',
        user_id: 'new-user-uuid',
        account_type: 'standard',
        points_balance: 0,
        lifetime_points: 0,
        tier: 'bronze',
        tier_expires_at: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as LoyaltyAccountEntity);

      const result = await service.getMyAccount('new-user-uuid');

      expect(result.id).toBe('new-account-uuid');
      expect(result.tier).toBe('bronze');
      expect(result.points_balance).toBe(0);
      expect(loyaltyRepo.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'new-user-uuid',
          account_type: 'standard',
          tier: 'bronze',
        }),
      );
    });

    it('should cache account after fetching from database', async () => {
      redisService.get.mockResolvedValue(null);
      loyaltyRepo.findAccountByUserId.mockResolvedValue(mockAccount as LoyaltyAccountEntity);

      await service.getMyAccount('user-uuid-1');

      expect(redisService.set).toHaveBeenCalledWith(
        'loyalty:account:user-uuid-1',
        expect.any(String),
        300,
      );
    });
  });

  // ── getMyTransactions ────────────────────────────────────────────────

  describe('getMyTransactions', () => {
    it('should return paginated transactions', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockAccount));
      loyaltyRepo.findTransactionsByAccountId.mockResolvedValue({
        items: [mockTransaction as LoyaltyTransactionEntity],
        total: 1,
      });

      const result = await service.getMyTransactions('user-uuid-1', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should pass type filter to repository', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockAccount));
      loyaltyRepo.findTransactionsByAccountId.mockResolvedValue({
        items: [],
        total: 0,
      });

      await service.getMyTransactions('user-uuid-1', 1, 20, 'earn');

      expect(loyaltyRepo.findTransactionsByAccountId).toHaveBeenCalledWith(
        'account-uuid-1',
        1,
        20,
        'earn',
      );
    });
  });

  // ── earnPointsForOrder ───────────────────────────────────────────────

  describe('earnPointsForOrder', () => {
    it('should earn base points from order amount (1 point per P1)', async () => {
      redisService.get.mockResolvedValue(null);
      loyaltyRepo.findAccountByUserId.mockResolvedValue(mockBronzeAccount as LoyaltyAccountEntity);
      loyaltyRepo.findTransactionByReference.mockResolvedValue(null);
      loyaltyRepo.addPoints.mockResolvedValue({
        account: { ...mockBronzeAccount, points_balance: 1200, lifetime_points: 1500 } as LoyaltyAccountEntity,
        transaction: mockTransaction as LoyaltyTransactionEntity,
      });

      await service.earnPointsForOrder('order-uuid-1', 'user-uuid-2', 1000);

      // Bronze has 0% bonus, so base 1000 points for P1000
      expect(loyaltyRepo.addPoints).toHaveBeenCalledWith(
        'account-uuid-2',
        1000, // 1000 base + 0% bonus
        'earn',
        expect.stringContaining('1000'),
        'order',
        'order-uuid-1',
      );
    });

    it('should apply tier bonus rate for gold tier', async () => {
      redisService.get.mockResolvedValue(null);
      loyaltyRepo.findAccountByUserId.mockResolvedValue(mockAccount as LoyaltyAccountEntity);
      loyaltyRepo.findTransactionByReference.mockResolvedValue(null);
      loyaltyRepo.addPoints.mockResolvedValue({
        account: { ...mockAccount, points_balance: 6100, lifetime_points: 9100 } as LoyaltyAccountEntity,
        transaction: mockTransaction as LoyaltyTransactionEntity,
      });

      await service.earnPointsForOrder('order-uuid-2', 'user-uuid-1', 1000);

      // Gold has 10% bonus: 1000 base + 100 bonus = 1100
      expect(loyaltyRepo.addPoints).toHaveBeenCalledWith(
        'account-uuid-1',
        1100,
        'earn',
        expect.stringContaining('bonus'),
        'order',
        'order-uuid-2',
      );
    });

    it('should be idempotent — skip if points already earned for order', async () => {
      loyaltyRepo.findTransactionByReference.mockResolvedValue(
        mockTransaction as LoyaltyTransactionEntity,
      );

      await service.earnPointsForOrder('order-uuid-1', 'user-uuid-1', 1000);

      expect(loyaltyRepo.addPoints).not.toHaveBeenCalled();
    });

    it('should skip earning for inactive accounts', async () => {
      redisService.get.mockResolvedValue(null);
      loyaltyRepo.findAccountByUserId.mockResolvedValue(mockInactiveAccount as LoyaltyAccountEntity);
      loyaltyRepo.findTransactionByReference.mockResolvedValue(null);

      await service.earnPointsForOrder('order-uuid-1', 'user-uuid-3', 1000);

      expect(loyaltyRepo.addPoints).not.toHaveBeenCalled();
    });

    it('should skip earning for zero amount orders', async () => {
      redisService.get.mockResolvedValue(null);
      loyaltyRepo.findAccountByUserId.mockResolvedValue(mockBronzeAccount as LoyaltyAccountEntity);
      loyaltyRepo.findTransactionByReference.mockResolvedValue(null);

      await service.earnPointsForOrder('order-uuid-1', 'user-uuid-2', 0);

      expect(loyaltyRepo.addPoints).not.toHaveBeenCalled();
    });

    it('should publish points_earned event to Kafka', async () => {
      redisService.get.mockResolvedValue(null);
      loyaltyRepo.findAccountByUserId.mockResolvedValue(mockBronzeAccount as LoyaltyAccountEntity);
      loyaltyRepo.findTransactionByReference.mockResolvedValue(null);
      loyaltyRepo.addPoints.mockResolvedValue({
        account: { ...mockBronzeAccount, points_balance: 700, lifetime_points: 1000 } as LoyaltyAccountEntity,
        transaction: mockTransaction as LoyaltyTransactionEntity,
      });

      await service.earnPointsForOrder('order-uuid-1', 'user-uuid-2', 500);

      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.loyalty.events',
        'points_earned',
        expect.objectContaining({
          user_id: 'user-uuid-2',
          order_id: 'order-uuid-1',
          base_points: 500,
        }),
        'order-uuid-1',
      );
    });

    it('should invalidate account cache after earning', async () => {
      redisService.get.mockResolvedValue(null);
      loyaltyRepo.findAccountByUserId.mockResolvedValue(mockBronzeAccount as LoyaltyAccountEntity);
      loyaltyRepo.findTransactionByReference.mockResolvedValue(null);
      loyaltyRepo.addPoints.mockResolvedValue({
        account: { ...mockBronzeAccount, points_balance: 700, lifetime_points: 1000 } as LoyaltyAccountEntity,
        transaction: mockTransaction as LoyaltyTransactionEntity,
      });

      await service.earnPointsForOrder('order-uuid-1', 'user-uuid-2', 500);

      expect(redisService.del).toHaveBeenCalledWith('loyalty:account:user-uuid-2');
    });
  });

  // ── redeemPoints ─────────────────────────────────────────────────────

  describe('redeemPoints', () => {
    it('should redeem points and return discount info', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockAccount));
      loyaltyRepo.deductPoints.mockResolvedValue({
        account: { ...mockAccount, points_balance: 4000 } as LoyaltyAccountEntity,
        transaction: { ...mockTransaction, type: 'redeem', points: -1000 } as LoyaltyTransactionEntity,
      });

      const result = await service.redeemPoints('user-uuid-1', 1000, 'order-uuid-1');

      expect(result.points_redeemed).toBe(1000);
      expect(result.php_discount).toBe(500); // 1000 * 0.5
      expect(result.new_balance).toBe(4000);
      expect(loyaltyRepo.deductPoints).toHaveBeenCalledWith(
        'account-uuid-1',
        1000,
        expect.stringContaining('1000'),
        'order',
        'order-uuid-1',
      );
    });

    it('should throw when insufficient points', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockAccount));

      await expect(service.redeemPoints('user-uuid-1', 10000)).rejects.toThrow(
        BadRequestException,
      );
      expect(loyaltyRepo.deductPoints).not.toHaveBeenCalled();
    });

    it('should throw when account is inactive', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockInactiveAccount));

      await expect(service.redeemPoints('user-uuid-3', 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should publish points_redeemed event to Kafka', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockAccount));
      loyaltyRepo.deductPoints.mockResolvedValue({
        account: { ...mockAccount, points_balance: 4500 } as LoyaltyAccountEntity,
        transaction: { ...mockTransaction, id: 'txn-redeem-1', type: 'redeem', points: -500 } as LoyaltyTransactionEntity,
      });

      await service.redeemPoints('user-uuid-1', 500);

      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.loyalty.events',
        'points_redeemed',
        expect.objectContaining({
          user_id: 'user-uuid-1',
          points_redeemed: 500,
          php_discount: 250,
        }),
        'txn-redeem-1',
      );
    });

    it('should redeem without order_id', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockAccount));
      loyaltyRepo.deductPoints.mockResolvedValue({
        account: { ...mockAccount, points_balance: 4900 } as LoyaltyAccountEntity,
        transaction: { ...mockTransaction, type: 'redeem' } as LoyaltyTransactionEntity,
      });

      const result = await service.redeemPoints('user-uuid-1', 100);

      expect(result.points_redeemed).toBe(100);
      expect(loyaltyRepo.deductPoints).toHaveBeenCalledWith(
        'account-uuid-1',
        100,
        expect.any(String),
        undefined,
        undefined,
      );
    });
  });

  // ── recalculateTier ──────────────────────────────────────────────────

  describe('recalculateTier', () => {
    it('should upgrade from bronze to silver at 1000 lifetime points', async () => {
      const account = {
        ...mockBronzeAccount,
        lifetime_points: 1000,
      } as LoyaltyAccountEntity;

      await service.recalculateTier(account);

      expect(loyaltyRepo.updateAccount).toHaveBeenCalledWith(
        'account-uuid-2',
        expect.objectContaining({ tier: 'silver' }),
      );
    });

    it('should upgrade from silver to gold at 5000 lifetime points', async () => {
      const account = {
        ...mockBronzeAccount,
        id: 'account-uuid-4',
        tier: 'silver',
        lifetime_points: 5000,
      } as LoyaltyAccountEntity;

      await service.recalculateTier(account);

      expect(loyaltyRepo.updateAccount).toHaveBeenCalledWith(
        'account-uuid-4',
        expect.objectContaining({ tier: 'gold' }),
      );
    });

    it('should upgrade from gold to platinum at 15000 lifetime points', async () => {
      const account = {
        ...mockAccount,
        lifetime_points: 15000,
      } as LoyaltyAccountEntity;

      await service.recalculateTier(account);

      expect(loyaltyRepo.updateAccount).toHaveBeenCalledWith(
        'account-uuid-1',
        expect.objectContaining({ tier: 'platinum' }),
      );
    });

    it('should not update when tier stays the same', async () => {
      const account = {
        ...mockBronzeAccount,
        lifetime_points: 500,
      } as LoyaltyAccountEntity;

      await service.recalculateTier(account);

      expect(loyaltyRepo.updateAccount).not.toHaveBeenCalled();
    });

    it('should set tier_expires_at to 12 months in the future on upgrade', async () => {
      const account = {
        ...mockBronzeAccount,
        lifetime_points: 1000,
      } as LoyaltyAccountEntity;

      await service.recalculateTier(account);

      const updateCall = loyaltyRepo.updateAccount.mock.calls[0][1];
      const expiresAt = new Date(updateCall.tier_expires_at as Date);
      const now = new Date();
      // Should be approximately 12 months from now
      const monthsDiff = (expiresAt.getFullYear() - now.getFullYear()) * 12 + expiresAt.getMonth() - now.getMonth();
      expect(monthsDiff).toBeGreaterThanOrEqual(11);
      expect(monthsDiff).toBeLessThanOrEqual(13);
    });
  });

  // ── Admin Methods ────────────────────────────────────────────────────

  describe('getAdminAccounts', () => {
    it('should return paginated accounts with filters', async () => {
      loyaltyRepo.findAllAccounts.mockResolvedValue({
        items: [mockAccount as LoyaltyAccountEntity],
        total: 1,
      });

      const result = await service.getAdminAccounts(1, 20, undefined, 'gold');

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(loyaltyRepo.findAllAccounts).toHaveBeenCalledWith(1, 20, undefined, 'gold', undefined);
    });
  });

  describe('getAdminStats', () => {
    it('should return loyalty program statistics', async () => {
      const stats = {
        total_accounts: 100,
        active_accounts: 95,
        by_tier: { bronze: 50, silver: 30, gold: 15, platinum: 5 },
        total_points_outstanding: 500000,
        avg_points_balance: 5000,
      };
      loyaltyRepo.getStats.mockResolvedValue(stats);

      const result = await service.getAdminStats();

      expect(result.total_accounts).toBe(100);
      expect(result.by_tier.gold).toBe(15);
    });
  });

  describe('adjustPoints', () => {
    it('should add positive points to account', async () => {
      loyaltyRepo.findAccountById.mockResolvedValue(mockAccount as LoyaltyAccountEntity);
      loyaltyRepo.addPoints.mockResolvedValue({
        account: { ...mockAccount, points_balance: 5500, lifetime_points: 8500 } as LoyaltyAccountEntity,
        transaction: mockTransaction as LoyaltyTransactionEntity,
      });

      const result = await service.adjustPoints('account-uuid-1', 500, 'Promotion reward', 'admin-uuid-1');

      expect(loyaltyRepo.addPoints).toHaveBeenCalledWith(
        'account-uuid-1',
        500,
        'adjust',
        'Admin adjustment: Promotion reward',
      );
      expect(result.points_balance).toBe(5500);
    });

    it('should deduct negative points from account', async () => {
      loyaltyRepo.findAccountById.mockResolvedValue(mockAccount as LoyaltyAccountEntity);
      loyaltyRepo.deductPoints.mockResolvedValue({
        account: { ...mockAccount, points_balance: 4500 } as LoyaltyAccountEntity,
        transaction: mockTransaction as LoyaltyTransactionEntity,
      });

      const result = await service.adjustPoints('account-uuid-1', -500, 'Fraud correction', 'admin-uuid-1');

      expect(loyaltyRepo.deductPoints).toHaveBeenCalledWith(
        'account-uuid-1',
        500,
        'Admin adjustment: Fraud correction',
      );
      expect(result.points_balance).toBe(4500);
    });

    it('should throw when account not found', async () => {
      loyaltyRepo.findAccountById.mockResolvedValue(null);

      await expect(
        service.adjustPoints('nonexistent-uuid', 100, 'Test', 'admin-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when deducting more points than balance', async () => {
      loyaltyRepo.findAccountById.mockResolvedValue(mockAccount as LoyaltyAccountEntity);

      await expect(
        service.adjustPoints('account-uuid-1', -10000, 'Too much', 'admin-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when adjustment is zero', async () => {
      loyaltyRepo.findAccountById.mockResolvedValue(mockAccount as LoyaltyAccountEntity);

      await expect(
        service.adjustPoints('account-uuid-1', 0, 'Zero adjust', 'admin-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should invalidate cache after adjustment', async () => {
      loyaltyRepo.findAccountById.mockResolvedValue(mockAccount as LoyaltyAccountEntity);
      loyaltyRepo.addPoints.mockResolvedValue({
        account: { ...mockAccount, points_balance: 5100 } as LoyaltyAccountEntity,
        transaction: mockTransaction as LoyaltyTransactionEntity,
      });

      await service.adjustPoints('account-uuid-1', 100, 'Small reward', 'admin-uuid-1');

      expect(redisService.del).toHaveBeenCalledWith('loyalty:account:user-uuid-1');
    });
  });
});
