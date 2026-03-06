import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { VendorSettlementEntity } from './entities/vendor-settlement.entity';
import { SettlementItemEntity } from './entities/settlement-item.entity';
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
    @InjectRepository(SettlementItemEntity)
    private readonly settlementItemRepo: Repository<SettlementItemEntity>,
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

  // ── Vendor Settlement Summary ───────────────────────────────────────

  async getVendorSettlementSummary(vendorId: string): Promise<{
    total_earned: number;
    total_paid_out: number;
    total_pending: number;
    total_commission: number;
    settlement_count: number;
  }> {
    const result = await this.settlementRepo
      .createQueryBuilder('s')
      .select([
        'COALESCE(SUM(s.gross_amount), 0)::float AS total_earned',
        "COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.final_amount ELSE 0 END), 0)::float AS total_paid_out",
        "COALESCE(SUM(CASE WHEN s.status IN ('pending', 'processing') THEN s.final_amount ELSE 0 END), 0)::float AS total_pending",
        'COALESCE(SUM(s.commission_amount), 0)::float AS total_commission',
        'COUNT(*)::int AS settlement_count',
      ])
      .where('s.vendor_id = :vendorId', { vendorId })
      .getRawOne();

    return {
      total_earned: result.total_earned || 0,
      total_paid_out: result.total_paid_out || 0,
      total_pending: result.total_pending || 0,
      total_commission: result.total_commission || 0,
      settlement_count: result.settlement_count || 0,
    };
  }

  // ── Admin Methods ────────────────────────────────────────────────────

  async findAllTransactionsAdmin(options: {
    search?: string;
    status?: string;
    method?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: TransactionEntity[]; total: number }> {
    const { search, status, method, type, dateFrom, dateTo, page = 1, limit = 20 } = options;

    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .select([
        't.id',
        't.order_id',
        't.user_id',
        't.type',
        't.method',
        't.status',
        't.amount',
        't.currency',
        't.gateway_transaction_id',
        't.idempotency_key',
        't.metadata',
        't.created_at',
        't.completed_at',
      ]);

    if (search) {
      qb.andWhere('(CAST(t.order_id AS TEXT) ILIKE :search OR CAST(t.user_id AS TEXT) ILIKE :search OR t.gateway_transaction_id ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (status && status !== 'all') {
      qb.andWhere('t.status = :status', { status });
    }

    if (method && method !== 'all') {
      qb.andWhere('t.method = :method', { method });
    }

    if (type && type !== 'all') {
      qb.andWhere('t.type = :type', { type });
    }

    if (dateFrom) {
      qb.andWhere('t.created_at >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('t.created_at <= :dateTo', { dateTo });
    }

    qb.orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getTransactionStats(): Promise<{
    total_transactions: number;
    total_revenue: number;
    total_refunds: number;
    pending_amount: number;
    completed_count: number;
    failed_count: number;
    refund_count: number;
  }> {
    const result = await this.transactionRepo
      .createQueryBuilder('t')
      .select([
        'COUNT(*)::int AS total_transactions',
        "COALESCE(SUM(CASE WHEN t.type = 'charge' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0)::float AS total_revenue",
        "COALESCE(SUM(CASE WHEN t.type = 'refund' THEN t.amount ELSE 0 END), 0)::float AS total_refunds",
        "COALESCE(SUM(CASE WHEN t.status IN ('pending', 'processing') THEN t.amount ELSE 0 END), 0)::float AS pending_amount",
        "COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::int AS completed_count",
        "COUNT(CASE WHEN t.status = 'failed' THEN 1 END)::int AS failed_count",
        "COUNT(CASE WHEN t.type = 'refund' THEN 1 END)::int AS refund_count",
      ])
      .getRawOne();

    return {
      total_transactions: result.total_transactions || 0,
      total_revenue: result.total_revenue || 0,
      total_refunds: result.total_refunds || 0,
      pending_amount: result.pending_amount || 0,
      completed_count: result.completed_count || 0,
      failed_count: result.failed_count || 0,
      refund_count: result.refund_count || 0,
    };
  }

  async findAllSettlementsAdmin(options: {
    vendorId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: VendorSettlementEntity[]; total: number }> {
    const { vendorId, status, dateFrom, dateTo, page = 1, limit = 20 } = options;

    const qb = this.settlementRepo
      .createQueryBuilder('s')
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

    if (vendorId) {
      qb.andWhere('s.vendor_id = :vendorId', { vendorId });
    }

    if (status && status !== 'all') {
      qb.andWhere('s.status = :status', { status });
    }

    if (dateFrom) {
      qb.andWhere('s.created_at >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('s.created_at <= :dateTo', { dateTo });
    }

    qb.orderBy('s.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getSettlementStats(): Promise<{
    total_settlements: number;
    total_gross: number;
    total_commission: number;
    total_net: number;
    pending_count: number;
    completed_count: number;
  }> {
    const result = await this.settlementRepo
      .createQueryBuilder('s')
      .select([
        'COUNT(*)::int AS total_settlements',
        'COALESCE(SUM(s.gross_amount), 0)::float AS total_gross',
        'COALESCE(SUM(s.commission_amount), 0)::float AS total_commission',
        'COALESCE(SUM(s.net_amount), 0)::float AS total_net',
        "COUNT(CASE WHEN s.status = 'pending' THEN 1 END)::int AS pending_count",
        "COUNT(CASE WHEN s.status = 'completed' THEN 1 END)::int AS completed_count",
      ])
      .getRawOne();

    return {
      total_settlements: result.total_settlements || 0,
      total_gross: result.total_gross || 0,
      total_commission: result.total_commission || 0,
      total_net: result.total_net || 0,
      pending_count: result.pending_count || 0,
      completed_count: result.completed_count || 0,
    };
  }

  async findAllWalletsAdmin(options: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: WalletEntity[]; total: number }> {
    const { search, status, page = 1, limit = 20 } = options;

    const qb = this.walletRepo
      .createQueryBuilder('w')
      .select([
        'w.id',
        'w.user_id',
        'w.balance',
        'w.currency',
        'w.is_active',
        'w.daily_limit',
        'w.monthly_limit',
        'w.created_at',
        'w.updated_at',
      ]);

    if (search) {
      qb.andWhere('CAST(w.user_id AS TEXT) ILIKE :search', { search: `%${search}%` });
    }

    if (status === 'active') {
      qb.andWhere('w.is_active = true');
    } else if (status === 'inactive') {
      qb.andWhere('w.is_active = false');
    }

    qb.orderBy('w.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getWalletStats(): Promise<{
    total_wallets: number;
    active_wallets: number;
    total_balance: number;
    average_balance: number;
  }> {
    const result = await this.walletRepo
      .createQueryBuilder('w')
      .select([
        'COUNT(*)::int AS total_wallets',
        "COUNT(CASE WHEN w.is_active = true THEN 1 END)::int AS active_wallets",
        'COALESCE(SUM(w.balance), 0)::float AS total_balance',
        'COALESCE(AVG(w.balance), 0)::float AS average_balance',
      ])
      .getRawOne();

    return {
      total_wallets: result.total_wallets || 0,
      active_wallets: result.active_wallets || 0,
      total_balance: result.total_balance || 0,
      average_balance: Math.round((result.average_balance || 0) * 100) / 100,
    };
  }

  // ── Settlement Generation Methods ──────────────────────────────────

  async getVendorsWithSettleableOrders(
    periodStart: string,
    periodEnd: string,
  ): Promise<Array<{ store_id: string; store_name: string; commission_rate: number }>> {
    const results = await this.dataSource.query(
      `SELECT DISTINCT s.id AS store_id, s.name AS store_name,
              COALESCE(s.commission_rate, 10) AS commission_rate
       FROM orders.orders o
       JOIN vendors.stores s ON s.id = o.store_id
       WHERE o.status = 'delivered'
         AND o.payment_status IN ('captured', 'completed')
         AND o.updated_at >= $1
         AND o.updated_at < $2
         AND o.id NOT IN (SELECT si.order_id FROM payments.settlement_items si)
       ORDER BY s.name`,
      [periodStart, periodEnd],
    );
    return results.map((r: Record<string, unknown>) => ({
      store_id: r.store_id as string,
      store_name: r.store_name as string,
      commission_rate: Number(r.commission_rate),
    }));
  }

  async getUnsettledOrdersForVendor(
    storeId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<Array<{
    order_id: string;
    order_number: string;
    subtotal: number;
  }>> {
    const results = await this.dataSource.query(
      `SELECT o.id AS order_id,
              o.order_number,
              o.subtotal
       FROM orders.orders o
       WHERE o.store_id = $1
         AND o.status = 'delivered'
         AND o.payment_status IN ('captured', 'completed')
         AND o.updated_at >= $2
         AND o.updated_at < $3
         AND o.id NOT IN (SELECT si.order_id FROM payments.settlement_items si)
       ORDER BY o.updated_at ASC`,
      [storeId, periodStart, periodEnd],
    );
    return results.map((r: Record<string, unknown>) => ({
      order_id: r.order_id as string,
      order_number: r.order_number as string,
      subtotal: Number(r.subtotal),
    }));
  }

  async findExistingSettlement(
    vendorId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<VendorSettlementEntity | null> {
    return this.settlementRepo.findOne({
      where: {
        vendor_id: vendorId,
        period_start: new Date(periodStart) as any,
        period_end: new Date(periodEnd) as any,
      },
    });
  }

  async createSettlementWithItems(
    settlementData: Partial<VendorSettlementEntity>,
    items: Array<Partial<SettlementItemEntity>>,
  ): Promise<VendorSettlementEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const settlement = queryRunner.manager.create(VendorSettlementEntity, settlementData);
      const savedSettlement = await queryRunner.manager.save(VendorSettlementEntity, settlement);

      const settlementItems = items.map((item) =>
        queryRunner.manager.create(SettlementItemEntity, {
          ...item,
          settlement_id: savedSettlement.id,
        }),
      );
      await queryRunner.manager.save(SettlementItemEntity, settlementItems);

      await queryRunner.commitTransaction();
      return savedSettlement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findSettlementById(id: string): Promise<VendorSettlementEntity | null> {
    return this.settlementRepo.findOne({ where: { id } });
  }

  async findSettlementItems(
    settlementId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: SettlementItemEntity[]; total: number }> {
    const [items, total] = await this.settlementItemRepo.findAndCount({
      where: { settlement_id: settlementId },
      order: { created_at: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
      select: [
        'id',
        'settlement_id',
        'order_id',
        'order_number',
        'gross_amount',
        'commission_amount',
        'net_amount',
        'created_at',
      ],
    });
    return { items, total };
  }

  async deleteSettlementItems(settlementId: string): Promise<void> {
    await this.settlementItemRepo.delete({ settlement_id: settlementId });
  }
}
