import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { TerminalEntity } from './entities/terminal.entity';
import { ShiftEntity } from './entities/shift.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionItemEntity } from './entities/transaction-item.entity';
import { CashMovementEntity } from './entities/cash-movement.entity';
import { ReceiptEntity } from './entities/receipt.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PosRepository {
  private readonly logger = new Logger(PosRepository.name);

  constructor(
    @InjectRepository(TerminalEntity)
    private readonly terminalRepo: Repository<TerminalEntity>,
    @InjectRepository(ShiftEntity)
    private readonly shiftRepo: Repository<ShiftEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(TransactionItemEntity)
    private readonly transactionItemRepo: Repository<TransactionItemEntity>,
    @InjectRepository(CashMovementEntity)
    private readonly cashMovementRepo: Repository<CashMovementEntity>,
    @InjectRepository(ReceiptEntity)
    private readonly receiptRepo: Repository<ReceiptEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Terminal CRUD ──

  async createTerminal(data: Partial<TerminalEntity>): Promise<TerminalEntity> {
    const terminal = this.terminalRepo.create(data);
    return this.terminalRepo.save(terminal);
  }

  async findTerminalById(id: string): Promise<TerminalEntity | null> {
    return this.terminalRepo.findOne({ where: { id } });
  }

  async findTerminalByCode(code: string): Promise<TerminalEntity | null> {
    return this.terminalRepo.findOne({ where: { terminal_code: code } });
  }

  async findTerminalsByStoreId(
    storeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<TerminalEntity>> {
    const [items, total] = await this.terminalRepo.findAndCount({
      where: { store_id: storeId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateTerminal(id: string, data: Partial<TerminalEntity>): Promise<TerminalEntity | null> {
    await this.terminalRepo.update(id, data as Record<string, unknown>);
    return this.terminalRepo.findOne({ where: { id } });
  }

  async deleteTerminal(id: string): Promise<void> {
    await this.terminalRepo.delete(id);
  }

  async updateTerminalHeartbeat(id: string, ipAddress?: string): Promise<void> {
    await this.terminalRepo.update(id, {
      last_heartbeat_at: new Date(),
      ip_address: ipAddress || undefined,
    });
  }

  // ── Shift CRUD ──

  async createShift(data: Partial<ShiftEntity>): Promise<ShiftEntity> {
    const shift = this.shiftRepo.create(data);
    return this.shiftRepo.save(shift);
  }

  async findShiftById(id: string): Promise<ShiftEntity | null> {
    return this.shiftRepo.findOne({
      where: { id },
      relations: ['terminal', 'cash_movements'],
    });
  }

  async findOpenShiftByTerminalId(terminalId: string): Promise<ShiftEntity | null> {
    return this.shiftRepo.findOne({
      where: { terminal_id: terminalId, status: 'open' },
      relations: ['terminal'],
    });
  }

  async findShiftsByTerminalId(
    terminalId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<PaginatedResult<ShiftEntity>> {
    const qb = this.shiftRepo.createQueryBuilder('shift')
      .where('shift.terminal_id = :terminalId', { terminalId })
      .orderBy('shift.opened_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('shift.status = :status', { status });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findShiftsByStoreId(
    storeId: string,
    page: number = 1,
    limit: number = 20,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PaginatedResult<ShiftEntity>> {
    const qb = this.shiftRepo.createQueryBuilder('shift')
      .innerJoin('shift.terminal', 'terminal')
      .where('terminal.store_id = :storeId', { storeId })
      .orderBy('shift.opened_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (dateFrom) {
      qb.andWhere('shift.opened_at >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('shift.opened_at <= :dateTo', { dateTo });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateShift(id: string, data: Partial<ShiftEntity>): Promise<ShiftEntity | null> {
    await this.shiftRepo.update(id, data as Record<string, unknown>);
    return this.shiftRepo.findOne({ where: { id }, relations: ['terminal', 'cash_movements'] });
  }

  // ── Transaction CRUD ──

  async createTransactionWithItems(
    transactionData: Partial<TransactionEntity>,
    items: Partial<TransactionItemEntity>[],
    receiptData?: Partial<ReceiptEntity>,
  ): Promise<TransactionEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = queryRunner.manager.create(TransactionEntity, transactionData);
      const savedTx = await queryRunner.manager.save(transaction);

      const txItems = items.map((item) =>
        queryRunner.manager.create(TransactionItemEntity, {
          ...item,
          transaction_id: savedTx.id,
        }),
      );
      await queryRunner.manager.save(txItems);

      if (receiptData) {
        const receipt = queryRunner.manager.create(ReceiptEntity, {
          ...receiptData,
          transaction_id: savedTx.id,
        });
        await queryRunner.manager.save(receipt);
      }

      await queryRunner.commitTransaction();

      return this.transactionRepo.findOne({
        where: { id: savedTx.id },
        relations: ['items', 'receipt'],
      }) as Promise<TransactionEntity>;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findTransactionById(id: string): Promise<TransactionEntity | null> {
    return this.transactionRepo.findOne({
      where: { id },
      relations: ['items', 'receipt', 'shift'],
    });
  }

  async findTransactionByNumber(txNumber: string): Promise<TransactionEntity | null> {
    return this.transactionRepo.findOne({
      where: { transaction_number: txNumber },
      relations: ['items', 'receipt'],
    });
  }

  async findTransactionByIdempotencyKey(key: string): Promise<TransactionEntity | null> {
    return this.transactionRepo.findOne({
      where: { idempotency_key: key },
      relations: ['items', 'receipt'],
    });
  }

  async findTransactionsByShiftId(
    shiftId: string,
    page: number = 1,
    limit: number = 50,
    type?: string,
    status?: string,
  ): Promise<PaginatedResult<TransactionEntity>> {
    const qb = this.transactionRepo.createQueryBuilder('tx')
      .leftJoinAndSelect('tx.items', 'items')
      .where('tx.shift_id = :shiftId', { shiftId })
      .orderBy('tx.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) qb.andWhere('tx.type = :type', { type });
    if (status) qb.andWhere('tx.status = :status', { status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findTransactionsByStoreId(
    storeId: string,
    page: number = 1,
    limit: number = 20,
    dateFrom?: string,
    dateTo?: string,
    type?: string,
    status?: string,
    paymentMethod?: string,
  ): Promise<PaginatedResult<TransactionEntity>> {
    const qb = this.transactionRepo.createQueryBuilder('tx')
      .leftJoinAndSelect('tx.items', 'items')
      .where('tx.store_id = :storeId', { storeId })
      .orderBy('tx.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (dateFrom) qb.andWhere('tx.created_at >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('tx.created_at <= :dateTo', { dateTo });
    if (type) qb.andWhere('tx.type = :type', { type });
    if (status) qb.andWhere('tx.status = :status', { status });
    if (paymentMethod) qb.andWhere('tx.payment_method = :paymentMethod', { paymentMethod });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateTransaction(id: string, data: Partial<TransactionEntity>): Promise<TransactionEntity | null> {
    await this.transactionRepo.update(id, data as Record<string, unknown>);
    return this.transactionRepo.findOne({
      where: { id },
      relations: ['items', 'receipt'],
    });
  }

  async transactionNumberExists(txNumber: string): Promise<boolean> {
    const count = await this.transactionRepo.count({ where: { transaction_number: txNumber } });
    return count > 0;
  }

  // ── Cash Movement CRUD ──

  async createCashMovement(data: Partial<CashMovementEntity>): Promise<CashMovementEntity> {
    const movement = this.cashMovementRepo.create(data);
    return this.cashMovementRepo.save(movement);
  }

  async findCashMovementsByShiftId(
    shiftId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResult<CashMovementEntity>> {
    const [items, total] = await this.cashMovementRepo.findAndCount({
      where: { shift_id: shiftId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Receipt ──

  async findReceiptByTransactionId(transactionId: string): Promise<ReceiptEntity | null> {
    return this.receiptRepo.findOne({ where: { transaction_id: transactionId } });
  }

  async createReceipt(data: Partial<ReceiptEntity>): Promise<ReceiptEntity> {
    const receipt = this.receiptRepo.create(data);
    return this.receiptRepo.save(receipt);
  }

  // ── Reports ──

  async getShiftSummary(shiftId: string): Promise<Record<string, unknown>> {
    const result = await this.transactionRepo.createQueryBuilder('tx')
      .select([
        'COUNT(*)::int AS total_transactions',
        'COUNT(*) FILTER (WHERE tx.type = \'sale\' AND tx.status = \'completed\')::int AS total_sales_count',
        'COALESCE(SUM(tx.total) FILTER (WHERE tx.type = \'sale\' AND tx.status = \'completed\'), 0)::decimal AS total_sales_amount',
        'COUNT(*) FILTER (WHERE tx.type = \'refund\')::int AS total_refunds_count',
        'COALESCE(SUM(tx.total) FILTER (WHERE tx.type = \'refund\'), 0)::decimal AS total_refunds_amount',
        'COUNT(*) FILTER (WHERE tx.status = \'voided\')::int AS total_voids_count',
        'COALESCE(SUM(tx.total) FILTER (WHERE tx.status = \'voided\'), 0)::decimal AS total_voids_amount',
      ])
      .where('tx.shift_id = :shiftId', { shiftId })
      .getRawOne();

    // Payment method breakdown
    const paymentBreakdown = await this.transactionRepo.createQueryBuilder('tx')
      .select([
        'tx.payment_method AS method',
        'COUNT(*)::int AS count',
        'COALESCE(SUM(tx.total), 0)::decimal AS amount',
      ])
      .where('tx.shift_id = :shiftId', { shiftId })
      .andWhere('tx.type = :type', { type: 'sale' })
      .andWhere('tx.status = :status', { status: 'completed' })
      .groupBy('tx.payment_method')
      .getRawMany();

    return { ...result, payment_breakdown: paymentBreakdown };
  }

  async getSalesSummary(
    storeId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<Record<string, unknown>> {
    const result = await this.transactionRepo.createQueryBuilder('tx')
      .select([
        'COUNT(*) FILTER (WHERE tx.type = \'sale\' AND tx.status = \'completed\')::int AS total_sales',
        'COALESCE(SUM(tx.total) FILTER (WHERE tx.type = \'sale\' AND tx.status = \'completed\'), 0)::decimal AS total_revenue',
        'COALESCE(SUM(tx.tax_amount) FILTER (WHERE tx.type = \'sale\' AND tx.status = \'completed\'), 0)::decimal AS total_tax',
        'COALESCE(SUM(tx.discount_amount) FILTER (WHERE tx.type = \'sale\' AND tx.status = \'completed\'), 0)::decimal AS total_discounts',
        'COALESCE(AVG(tx.total) FILTER (WHERE tx.type = \'sale\' AND tx.status = \'completed\'), 0)::decimal AS avg_transaction_value',
        'COUNT(*) FILTER (WHERE tx.type = \'refund\')::int AS total_refunds',
        'COALESCE(SUM(tx.total) FILTER (WHERE tx.type = \'refund\'), 0)::decimal AS total_refund_amount',
        'COUNT(*) FILTER (WHERE tx.status = \'voided\')::int AS total_voids',
      ])
      .where('tx.store_id = :storeId', { storeId })
      .andWhere('tx.created_at >= :dateFrom', { dateFrom })
      .andWhere('tx.created_at <= :dateTo', { dateTo })
      .getRawOne();

    return result;
  }

  async getProductSales(
    storeId: string,
    dateFrom: string,
    dateTo: string,
    limit: number = 20,
  ): Promise<Record<string, unknown>[]> {
    return this.transactionItemRepo.createQueryBuilder('ti')
      .innerJoin('ti.transaction', 'tx')
      .select([
        'ti.product_id AS product_id',
        'ti.product_name AS product_name',
        'SUM(ti.quantity)::int AS total_quantity',
        'SUM(ti.total)::decimal AS total_revenue',
        'COUNT(DISTINCT tx.id)::int AS transaction_count',
      ])
      .where('tx.store_id = :storeId', { storeId })
      .andWhere('tx.type = :type', { type: 'sale' })
      .andWhere('tx.status = :status', { status: 'completed' })
      .andWhere('tx.created_at >= :dateFrom', { dateFrom })
      .andWhere('tx.created_at <= :dateTo', { dateTo })
      .groupBy('ti.product_id')
      .addGroupBy('ti.product_name')
      .orderBy('total_revenue', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getHourlySales(
    storeId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<Record<string, unknown>[]> {
    return this.transactionRepo.createQueryBuilder('tx')
      .select([
        'EXTRACT(HOUR FROM tx.created_at)::int AS hour',
        'COUNT(*)::int AS transaction_count',
        'COALESCE(SUM(tx.total), 0)::decimal AS total_revenue',
      ])
      .where('tx.store_id = :storeId', { storeId })
      .andWhere('tx.type = :type', { type: 'sale' })
      .andWhere('tx.status = :status', { status: 'completed' })
      .andWhere('tx.created_at >= :dateFrom', { dateFrom })
      .andWhere('tx.created_at <= :dateTo', { dateTo })
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany();
  }

  async getCashierPerformance(
    storeId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<Record<string, unknown>[]> {
    return this.transactionRepo.createQueryBuilder('tx')
      .select([
        'tx.cashier_id AS cashier_id',
        'COUNT(*) FILTER (WHERE tx.type = \'sale\' AND tx.status = \'completed\')::int AS total_sales',
        'COALESCE(SUM(tx.total) FILTER (WHERE tx.type = \'sale\' AND tx.status = \'completed\'), 0)::decimal AS total_revenue',
        'COALESCE(AVG(tx.total) FILTER (WHERE tx.type = \'sale\' AND tx.status = \'completed\'), 0)::decimal AS avg_transaction_value',
        'COUNT(*) FILTER (WHERE tx.type = \'refund\')::int AS total_refunds',
        'COUNT(*) FILTER (WHERE tx.status = \'voided\')::int AS total_voids',
      ])
      .where('tx.store_id = :storeId', { storeId })
      .andWhere('tx.created_at >= :dateFrom', { dateFrom })
      .andWhere('tx.created_at <= :dateTo', { dateTo })
      .groupBy('tx.cashier_id')
      .orderBy('total_revenue', 'DESC')
      .getRawMany();
  }

  async getPaymentMethodBreakdown(
    storeId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<Record<string, unknown>[]> {
    return this.transactionRepo.createQueryBuilder('tx')
      .select([
        'tx.payment_method AS method',
        'COUNT(*)::int AS count',
        'COALESCE(SUM(tx.total), 0)::decimal AS amount',
      ])
      .where('tx.store_id = :storeId', { storeId })
      .andWhere('tx.type = :type', { type: 'sale' })
      .andWhere('tx.status = :status', { status: 'completed' })
      .andWhere('tx.created_at >= :dateFrom', { dateFrom })
      .andWhere('tx.created_at <= :dateTo', { dateTo })
      .groupBy('tx.payment_method')
      .getRawMany();
  }

  // ── Batch Sync ──

  async batchCreateTransactions(
    transactions: Array<{
      transaction: Partial<TransactionEntity>;
      items: Partial<TransactionItemEntity>[];
      receipt?: Partial<ReceiptEntity>;
    }>,
  ): Promise<TransactionEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const savedTransactions: TransactionEntity[] = [];

      for (const txData of transactions) {
        const tx = queryRunner.manager.create(TransactionEntity, txData.transaction);
        const savedTx = await queryRunner.manager.save(tx);

        const txItems = txData.items.map((item) =>
          queryRunner.manager.create(TransactionItemEntity, {
            ...item,
            transaction_id: savedTx.id,
          }),
        );
        await queryRunner.manager.save(txItems);

        if (txData.receipt) {
          const receipt = queryRunner.manager.create(ReceiptEntity, {
            ...txData.receipt,
            transaction_id: savedTx.id,
          });
          await queryRunner.manager.save(receipt);
        }

        savedTransactions.push(savedTx);
      }

      await queryRunner.commitTransaction();
      return savedTransactions;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
