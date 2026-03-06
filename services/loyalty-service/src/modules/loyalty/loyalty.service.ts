import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { LoyaltyRepository } from './loyalty.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { LoyaltyAccountEntity } from './entities/loyalty-account.entity';

const KAFKA_TOPIC_LOYALTY = 'daltaners.loyalty.events';
const ACCOUNT_CACHE_TTL = 300; // 5 minutes
const POINTS_PER_PHP = 1; // 1 point per P1 spent
const POINTS_TO_PHP_RATE = 0.5; // 1 point = P0.50

// Tier thresholds based on lifetime points
const TIER_THRESHOLDS = {
  bronze: { min: 0, max: 999 },
  silver: { min: 1000, max: 4999 },
  gold: { min: 5000, max: 14999 },
  platinum: { min: 15000, max: Infinity },
} as const;

// Tier bonus rates for extra points
const TIER_BONUS_RATES: Record<string, number> = {
  bronze: 0,
  silver: 0.05,
  gold: 0.10,
  platinum: 0.15,
};

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly loyaltyRepo: LoyaltyRepository,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ── Customer Methods ─────────────────────────────────────────────────

  async getMyAccount(userId: string): Promise<LoyaltyAccountEntity> {
    // Check cache first
    const cached = await this.redisService.get(`loyalty:account:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    let account = await this.loyaltyRepo.findAccountByUserId(userId);

    // Auto-create account if it doesn't exist
    if (!account) {
      account = await this.loyaltyRepo.createAccount({
        user_id: userId,
        account_type: 'standard',
        points_balance: 0,
        lifetime_points: 0,
        tier: 'bronze',
        tier_expires_at: null,
        is_active: true,
      });
      this.logger.log(`Auto-created loyalty account for user: ${userId}`);
    }

    await this.redisService.set(
      `loyalty:account:${userId}`,
      JSON.stringify(account),
      ACCOUNT_CACHE_TTL,
    );

    return account;
  }

  async getMyTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: string,
  ) {
    const account = await this.getMyAccount(userId);

    const { items, total } = await this.loyaltyRepo.findTransactionsByAccountId(
      account.id,
      page,
      limit,
      type,
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async earnPointsForOrder(
    orderId: string,
    customerId: string,
    orderAmount: number,
  ): Promise<void> {
    // Idempotency check — don't double-award points for the same order
    const existing = await this.loyaltyRepo.findTransactionByReference(
      'order',
      orderId,
      'earn',
    );
    if (existing) {
      this.logger.warn(`Points already earned for order ${orderId}, skipping (idempotent)`);
      return;
    }

    const account = await this.getMyAccount(customerId);

    if (!account.is_active) {
      this.logger.warn(`Loyalty account inactive for user ${customerId}, skipping earn`);
      return;
    }

    // Calculate base points: 1 point per P1
    const basePoints = Math.floor(orderAmount * POINTS_PER_PHP);

    // Calculate tier bonus
    const bonusRate = TIER_BONUS_RATES[account.tier] || 0;
    const bonusPoints = Math.floor(basePoints * bonusRate);
    const totalPoints = basePoints + bonusPoints;

    if (totalPoints <= 0) return;

    // Award base points
    const { account: updatedAccount } = await this.loyaltyRepo.addPoints(
      account.id,
      totalPoints,
      'earn',
      bonusPoints > 0
        ? `Earned ${basePoints} + ${bonusPoints} bonus points from order`
        : `Earned ${basePoints} points from order`,
      'order',
      orderId,
    );

    // Recalculate tier based on new lifetime points
    await this.recalculateTier(updatedAccount);

    // Invalidate cache
    await this.invalidateAccountCache(customerId);

    // Publish event
    await this.kafkaProducer.publish(
      KAFKA_TOPIC_LOYALTY,
      'points_earned',
      {
        user_id: customerId,
        account_id: account.id,
        order_id: orderId,
        base_points: basePoints,
        bonus_points: bonusPoints,
        total_points: totalPoints,
        new_balance: updatedAccount.points_balance,
        tier: updatedAccount.tier,
      },
      orderId,
    );

    this.logger.log(
      `Awarded ${totalPoints} points (${basePoints} base + ${bonusPoints} bonus) to user ${customerId} for order ${orderId}`,
    );
  }

  async redeemPoints(userId: string, points: number, orderId?: string) {
    const account = await this.getMyAccount(userId);

    if (!account.is_active) {
      throw new BadRequestException('Loyalty account is inactive');
    }

    if (account.points_balance < points) {
      throw new BadRequestException(
        `Insufficient points. Available: ${account.points_balance}, Requested: ${points}`,
      );
    }

    const phpDiscount = points * POINTS_TO_PHP_RATE;

    const { account: updatedAccount, transaction } = await this.loyaltyRepo.deductPoints(
      account.id,
      points,
      `Redeemed ${points} points for P${phpDiscount.toFixed(2)} discount`,
      orderId ? 'order' : undefined,
      orderId,
    );

    // Invalidate cache
    await this.invalidateAccountCache(userId);

    // Publish event
    await this.kafkaProducer.publish(
      KAFKA_TOPIC_LOYALTY,
      'points_redeemed',
      {
        user_id: userId,
        account_id: account.id,
        points_redeemed: points,
        php_discount: phpDiscount,
        order_id: orderId || null,
        new_balance: updatedAccount.points_balance,
      },
      transaction.id,
    );

    this.logger.log(
      `User ${userId} redeemed ${points} points for P${phpDiscount.toFixed(2)} discount`,
    );

    return {
      points_redeemed: points,
      php_discount: phpDiscount,
      new_balance: updatedAccount.points_balance,
      transaction_id: transaction.id,
    };
  }

  async recalculateTier(account: LoyaltyAccountEntity): Promise<void> {
    const lifetime = account.lifetime_points;
    let newTier = 'bronze';

    if (lifetime >= TIER_THRESHOLDS.platinum.min) {
      newTier = 'platinum';
    } else if (lifetime >= TIER_THRESHOLDS.gold.min) {
      newTier = 'gold';
    } else if (lifetime >= TIER_THRESHOLDS.silver.min) {
      newTier = 'silver';
    }

    if (newTier !== account.tier) {
      const tierExpiresAt = new Date();
      tierExpiresAt.setMonth(tierExpiresAt.getMonth() + 12);

      await this.loyaltyRepo.updateAccount(account.id, {
        tier: newTier,
        tier_expires_at: tierExpiresAt,
      });

      this.logger.log(
        `Tier upgraded for account ${account.id}: ${account.tier} → ${newTier}`,
      );
    }
  }

  // ── Admin Methods ────────────────────────────────────────────────────

  async getAdminAccounts(
    page: number = 1,
    limit: number = 20,
    search?: string,
    tier?: string,
    accountType?: string,
  ) {
    const { items, total } = await this.loyaltyRepo.findAllAccounts(
      page,
      limit,
      search,
      tier,
      accountType,
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAdminStats() {
    return this.loyaltyRepo.getStats();
  }

  async adjustPoints(accountId: string, points: number, reason: string, adminId: string) {
    const account = await this.loyaltyRepo.findAccountById(accountId);
    if (!account) {
      throw new NotFoundException(`Loyalty account ${accountId} not found`);
    }

    if (points > 0) {
      const { account: updated } = await this.loyaltyRepo.addPoints(
        accountId,
        points,
        'adjust',
        `Admin adjustment: ${reason}`,
      );
      await this.invalidateAccountCache(account.user_id);
      await this.recalculateTier(updated);
      this.logger.log(
        `Admin ${adminId} added ${points} points to account ${accountId}: ${reason}`,
      );
      return updated;
    } else if (points < 0) {
      const absPoints = Math.abs(points);
      if (account.points_balance < absPoints) {
        throw new BadRequestException(
          `Cannot deduct ${absPoints} points. Current balance: ${account.points_balance}`,
        );
      }
      const { account: updated } = await this.loyaltyRepo.deductPoints(
        accountId,
        absPoints,
        `Admin adjustment: ${reason}`,
      );
      await this.invalidateAccountCache(account.user_id);
      this.logger.log(
        `Admin ${adminId} deducted ${absPoints} points from account ${accountId}: ${reason}`,
      );
      return updated;
    }

    throw new BadRequestException('Points adjustment cannot be zero');
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async invalidateAccountCache(userId: string): Promise<void> {
    await this.redisService.del(`loyalty:account:${userId}`);
  }
}
