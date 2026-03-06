import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LoyaltyAccountEntity } from './entities/loyalty-account.entity';
import { LoyaltyTransactionEntity } from './entities/loyalty-transaction.entity';

@Injectable()
export class LoyaltyRepository {
  constructor(
    @InjectRepository(LoyaltyAccountEntity)
    private readonly accountRepo: Repository<LoyaltyAccountEntity>,
    @InjectRepository(LoyaltyTransactionEntity)
    private readonly transactionRepo: Repository<LoyaltyTransactionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Account Methods ──────────────────────────────────────────────────

  async findAccountByUserId(userId: string): Promise<LoyaltyAccountEntity | null> {
    return this.accountRepo.findOne({ where: { user_id: userId } });
  }

  async findAccountById(id: string): Promise<LoyaltyAccountEntity | null> {
    return this.accountRepo.findOne({ where: { id } });
  }

  async createAccount(data: Partial<LoyaltyAccountEntity>): Promise<LoyaltyAccountEntity> {
    const account = this.accountRepo.create(data);
    return this.accountRepo.save(account);
  }

  async updateAccount(id: string, data: Partial<LoyaltyAccountEntity>): Promise<void> {
    await this.accountRepo.update(id, data as any);
  }

  // ── Atomic Points Operations ─────────────────────────────────────────

  async addPoints(
    accountId: string,
    points: number,
    type: string,
    description: string,
    referenceType?: string,
    referenceId?: string,
  ): Promise<{ account: LoyaltyAccountEntity; transaction: LoyaltyTransactionEntity }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // Lock the account row
      const account = await queryRunner.manager
        .createQueryBuilder(LoyaltyAccountEntity, 'a')
        .setLock('pessimistic_write')
        .where('a.id = :accountId', { accountId })
        .getOneOrFail();

      const newBalance = account.points_balance + points;
      const newLifetime = type === 'earn' || type === 'bonus'
        ? account.lifetime_points + points
        : account.lifetime_points;

      await queryRunner.manager.update(LoyaltyAccountEntity, accountId, {
        points_balance: newBalance,
        lifetime_points: newLifetime,
      });

      const transaction = queryRunner.manager.create(LoyaltyTransactionEntity, {
        account_id: accountId,
        type,
        points,
        balance_after: newBalance,
        reference_type: referenceType || null,
        reference_id: referenceId || null,
        description,
      });
      const savedTxn = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      account.points_balance = newBalance;
      account.lifetime_points = newLifetime;
      return { account, transaction: savedTxn };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deductPoints(
    accountId: string,
    points: number,
    description: string,
    referenceType?: string,
    referenceId?: string,
  ): Promise<{ account: LoyaltyAccountEntity; transaction: LoyaltyTransactionEntity }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const account = await queryRunner.manager
        .createQueryBuilder(LoyaltyAccountEntity, 'a')
        .setLock('pessimistic_write')
        .where('a.id = :accountId', { accountId })
        .getOneOrFail();

      const newBalance = account.points_balance - points;
      if (newBalance < 0) {
        throw new Error('Insufficient points balance');
      }

      await queryRunner.manager.update(LoyaltyAccountEntity, accountId, {
        points_balance: newBalance,
      });

      const transaction = queryRunner.manager.create(LoyaltyTransactionEntity, {
        account_id: accountId,
        type: 'redeem',
        points: -points,
        balance_after: newBalance,
        reference_type: referenceType || null,
        reference_id: referenceId || null,
        description,
      });
      const savedTxn = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      account.points_balance = newBalance;
      return { account, transaction: savedTxn };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Transaction Queries ──────────────────────────────────────────────

  async findTransactionsByAccountId(
    accountId: string,
    page: number = 1,
    limit: number = 20,
    type?: string,
  ): Promise<{ items: LoyaltyTransactionEntity[]; total: number }> {
    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .where('t.account_id = :accountId', { accountId })
      .select([
        't.id',
        't.account_id',
        't.type',
        't.points',
        't.balance_after',
        't.reference_type',
        't.reference_id',
        't.description',
        't.created_at',
      ])
      .orderBy('t.created_at', 'DESC');

    if (type) {
      qb.andWhere('t.type = :type', { type });
    }

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { items, total };
  }

  // ── Idempotency Check ────────────────────────────────────────────────

  async findTransactionByReference(
    referenceType: string,
    referenceId: string,
    type: string,
  ): Promise<LoyaltyTransactionEntity | null> {
    return this.transactionRepo.findOne({
      where: {
        reference_type: referenceType,
        reference_id: referenceId,
        type,
      },
    });
  }

  // ── Admin Queries ────────────────────────────────────────────────────

  async findAllAccounts(
    page: number = 1,
    limit: number = 20,
    search?: string,
    tier?: string,
    accountType?: string,
  ): Promise<{ items: LoyaltyAccountEntity[]; total: number }> {
    const qb = this.accountRepo
      .createQueryBuilder('a')
      .select([
        'a.id',
        'a.user_id',
        'a.account_type',
        'a.points_balance',
        'a.lifetime_points',
        'a.tier',
        'a.tier_expires_at',
        'a.is_active',
        'a.created_at',
        'a.updated_at',
      ])
      .orderBy('a.created_at', 'DESC');

    if (search) {
      qb.andWhere('(a.user_id::text ILIKE :search OR a.id::text ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (tier) {
      qb.andWhere('a.tier = :tier', { tier });
    }
    if (accountType) {
      qb.andWhere('a.account_type = :accountType', { accountType });
    }

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { items, total };
  }

  async getStats(): Promise<{
    total_accounts: number;
    active_accounts: number;
    by_tier: Record<string, number>;
    total_points_outstanding: number;
    avg_points_balance: number;
  }> {
    const total = await this.accountRepo.count();
    const active = await this.accountRepo.count({ where: { is_active: true } });

    const tierCounts = await this.accountRepo
      .createQueryBuilder('a')
      .select('a.tier', 'tier')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('a.tier')
      .getRawMany<{ tier: string; count: number }>();

    const by_tier: Record<string, number> = {};
    for (const row of tierCounts) {
      by_tier[row.tier] = row.count;
    }

    const aggResult = await this.accountRepo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.points_balance), 0)::int', 'total_points')
      .addSelect('COALESCE(AVG(a.points_balance), 0)::int', 'avg_points')
      .getRawOne<{ total_points: number; avg_points: number }>();

    return {
      total_accounts: total,
      active_accounts: active,
      by_tier,
      total_points_outstanding: aggResult?.total_points || 0,
      avg_points_balance: aggResult?.avg_points || 0,
    };
  }
}
