import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { VendorSettlementEntity } from './entities/vendor-settlement.entity';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(VendorSettlementEntity)
    private readonly settlementRepo: Repository<VendorSettlementEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly walletTxnRepo: Repository<WalletTransactionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Transaction Methods ──────────────────────────────────────────────

  async createTransaction(data: Partial<TransactionEntity>): Promise<TransactionEntity> {
    const transaction = this.transactionRepo.create(data);
    return this.transactionRepo.save(transaction);
  }

  async findTransactionById(id: string): Promise<TransactionEntity | null> {
    return this.transactionRepo.findOne({ where: { id } });
  }

  async findTransactionByIdempotencyKey(key: string): Promise<TransactionEntity | null> {
    return this.transactionRepo.findOne({ where: { idempotency_key: key } });
  }

  async findTransactionsByOrderId(
    orderId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: TransactionEntity[]; total: number }> {
    const [items, total] = await this.transactionRepo.findAndCount({
      where: { order_id: orderId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: [
        'id',
        'order_id',
        'user_id',
        'type',
        'method',
        'status',
        'amount',
        'currency',
        'gateway_transaction_id',
        'idempotency_key',
        'metadata',
        'created_at',
        'completed_at',
      ],
    });
    return { items, total };
  }

  async findTransactionsByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: TransactionEntity[]; total: number }> {
    const [items, total] = await this.transactionRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: [
        'id',
        'order_id',
        'user_id',
        'type',
        'method',
        'status',
        'amount',
        'currency',
        'gateway_transaction_id',
        'idempotency_key',
        'metadata',
        'created_at',
        'completed_at',
      ],
    });
    return { items, total };
  }

  async findTransactionByGatewayId(gatewayTransactionId: string): Promise<TransactionEntity | null> {
    return this.transactionRepo.findOne({
      where: { gateway_transaction_id: gatewayTransactionId },
    });
  }

  async updateTransaction(id: string, data: Partial<TransactionEntity>): Promise<void> {
    await this.transactionRepo.update(id, data as any);
  }

  // ── Settlement Methods ───────────────────────────────────────────────

  async createSettlement(data: Partial<VendorSettlementEntity>): Promise<VendorSettlementEntity> {
    const settlement = this.settlementRepo.create(data);
    return this.settlementRepo.save(settlement);
  }

  async findSettlementsByVendorId(
    vendorId: string,
    options: {
      status?: string;
      periodStart?: string;
      periodEnd?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ items: VendorSettlementEntity[]; total: number }> {
    const { status, periodStart, periodEnd, page = 1, limit = 20 } = options;

    const qb = this.settlementRepo
      .createQueryBuilder('s')
      .where('s.vendor_id = :vendorId', { vendorId })
      .select([
        's.id',
        's.vendor_id',
        's.period_start',
        's.period_end',
        's.gross_amount',
        's.commission_amount',
        's.net_amount',
        's.withholding_tax',
        's.adjustment_amount',
        's.final_amount',
        's.status',
        's.payment_reference',
        's.settlement_date',
        's.created_at',
      ]);

    if (status) {
      qb.andWhere('s.status = :status', { status });
    }

    if (periodStart) {
      qb.andWhere('s.period_start >= :periodStart', { periodStart });
    }

    if (periodEnd) {
      qb.andWhere('s.period_end <= :periodEnd', { periodEnd });
    }

    qb.orderBy('s.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateSettlement(id: string, data: Partial<VendorSettlementEntity>): Promise<void> {
    await this.settlementRepo.update(id, data);
  }

  // ── Wallet Methods ───────────────────────────────────────────────────

  async createWallet(data: Partial<WalletEntity>): Promise<WalletEntity> {
    const wallet = this.walletRepo.create(data);
    return this.walletRepo.save(wallet);
  }

  async findWalletByUserId(userId: string): Promise<WalletEntity | null> {
    return this.walletRepo.findOne({ where: { user_id: userId } });
  }

  async updateWalletBalance(
    walletId: string,
    amount: number,
    type: 'debit' | 'credit',
  ): Promise<WalletEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // Lock the wallet row for update
      const wallet = await queryRunner.manager
        .createQueryBuilder(WalletEntity, 'w')
        .setLock('pessimistic_write')
        .where('w.id = :walletId', { walletId })
        .getOneOrFail();

      const currentBalance = Number(wallet.balance);
      const newBalance = type === 'credit'
        ? currentBalance + amount
        : currentBalance - amount;

      if (newBalance < 0) {
        throw new Error('Insufficient wallet balance');
      }

      await queryRunner.manager.update(WalletEntity, walletId, {
        balance: newBalance,
      });

      await queryRunner.commitTransaction();

      wallet.balance = newBalance;
      return wallet;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createWalletTransaction(data: Partial<WalletTransactionEntity>): Promise<WalletTransactionEntity> {
    const txn = this.walletTxnRepo.create(data);
    return this.walletTxnRepo.save(txn);
  }

  async getWalletTransactions(
    walletId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: WalletTransactionEntity[]; total: number }> {
    const [items, total] = await this.walletTxnRepo.findAndCount({
      where: { wallet_id: walletId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: [
        'id',
        'wallet_id',
        'type',
        'amount',
        'balance_after',
        'reference_type',
        'reference_id',
        'description',
        'status',
        'created_at',
      ],
    });
    return { items, total };
  }
}
