import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReturnRequestEntity } from './entities/return-request.entity';
import { ReturnItemEntity } from './entities/return-item.entity';
import { ReturnRequestQueryDto, AdminReturnQueryDto } from './dto/return-request-query.dto';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ReturnRepository {
  private readonly logger = new Logger(ReturnRepository.name);

  constructor(
    @InjectRepository(ReturnRequestEntity)
    private readonly returnRequestRepo: Repository<ReturnRequestEntity>,
    @InjectRepository(ReturnItemEntity)
    private readonly returnItemRepo: Repository<ReturnItemEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createReturnRequest(
    requestData: Partial<ReturnRequestEntity>,
    itemsData: Partial<ReturnItemEntity>[],
  ): Promise<ReturnRequestEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const request = queryRunner.manager.create(ReturnRequestEntity, requestData);
      const savedRequest = await queryRunner.manager.save(ReturnRequestEntity, request);

      const items = itemsData.map((item) =>
        queryRunner.manager.create(ReturnItemEntity, {
          ...item,
          return_request_id: savedRequest.id,
        }),
      );
      const savedItems = await queryRunner.manager.save(ReturnItemEntity, items);

      await queryRunner.commitTransaction();

      savedRequest.items = savedItems;
      return savedRequest;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create return request: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string): Promise<ReturnRequestEntity | null> {
    return this.returnRequestRepo.findOne({
      where: { id },
      relations: ['items', 'order', 'order.items'],
    });
  }

  async findByRequestNumber(requestNumber: string): Promise<ReturnRequestEntity | null> {
    return this.returnRequestRepo.findOne({
      where: { request_number: requestNumber },
      relations: ['items'],
    });
  }

  async findByOrderId(orderId: string): Promise<ReturnRequestEntity[]> {
    return this.returnRequestRepo.find({
      where: { order_id: orderId },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
  }

  async findByCustomerId(customerId: string, query: ReturnRequestQueryDto): Promise<PaginatedResult<ReturnRequestEntity>> {
    const { page = 1, limit = 20, status, reason_category, date_from, date_to } = query;

    const qb = this.returnRequestRepo
      .createQueryBuilder('rr')
      .leftJoinAndSelect('rr.items', 'items')
      .where('rr.customer_id = :customerId', { customerId });

    if (status) {
      qb.andWhere('rr.status = :status', { status });
    }
    if (reason_category) {
      qb.andWhere('rr.reason_category = :reason_category', { reason_category });
    }
    if (date_from) {
      qb.andWhere('rr.created_at >= :date_from', { date_from: new Date(date_from) });
    }
    if (date_to) {
      qb.andWhere('rr.created_at <= :date_to', { date_to: new Date(date_to) });
    }

    qb.orderBy('rr.created_at', 'DESC');

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByStoreId(storeId: string, query: ReturnRequestQueryDto): Promise<PaginatedResult<ReturnRequestEntity>> {
    const { page = 1, limit = 20, status, reason_category, date_from, date_to } = query;

    const qb = this.returnRequestRepo
      .createQueryBuilder('rr')
      .leftJoinAndSelect('rr.items', 'items')
      .where('rr.store_id = :storeId', { storeId });

    if (status) {
      qb.andWhere('rr.status = :status', { status });
    }
    if (reason_category) {
      qb.andWhere('rr.reason_category = :reason_category', { reason_category });
    }
    if (date_from) {
      qb.andWhere('rr.created_at >= :date_from', { date_from: new Date(date_from) });
    }
    if (date_to) {
      qb.andWhere('rr.created_at <= :date_to', { date_to: new Date(date_to) });
    }

    qb.orderBy('rr.created_at', 'DESC');

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllAdmin(query: AdminReturnQueryDto): Promise<PaginatedResult<ReturnRequestEntity>> {
    const { page = 1, limit = 20, search, status, reason_category, store_id, customer_id, date_from, date_to } = query;

    const qb = this.returnRequestRepo
      .createQueryBuilder('rr')
      .leftJoinAndSelect('rr.items', 'items')
      .leftJoin('rr.order', 'order')
      .addSelect(['order.order_number']);

    if (search) {
      qb.andWhere(
        '(rr.request_number ILIKE :search OR order.order_number ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) {
      qb.andWhere('rr.status = :status', { status });
    }
    if (reason_category) {
      qb.andWhere('rr.reason_category = :reason_category', { reason_category });
    }
    if (store_id) {
      qb.andWhere('rr.store_id = :store_id', { store_id });
    }
    if (customer_id) {
      qb.andWhere('rr.customer_id = :customer_id', { customer_id });
    }
    if (date_from) {
      qb.andWhere('rr.created_at >= :date_from', { date_from: new Date(date_from) });
    }
    if (date_to) {
      qb.andWhere('rr.created_at <= :date_to', { date_to: new Date(date_to) });
    }

    qb.orderBy('rr.created_at', 'DESC');

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateReturnRequest(id: string, updateData: Partial<ReturnRequestEntity>): Promise<ReturnRequestEntity | null> {
    await this.returnRequestRepo.update(id, updateData as any);
    return this.findById(id);
  }

  async updateReturnItems(returnRequestId: string, updateData: Partial<ReturnItemEntity>): Promise<void> {
    await this.returnItemRepo.update({ return_request_id: returnRequestId }, updateData as any);
  }

  async requestNumberExists(requestNumber: string): Promise<boolean> {
    const count = await this.returnRequestRepo.count({ where: { request_number: requestNumber } });
    return count > 0;
  }

  async getReturnStats(dateFrom?: string, dateTo?: string): Promise<{
    totalReturns: number;
    pendingReturns: number;
    approvedReturns: number;
    deniedReturns: number;
    escalatedReturns: number;
    totalRefundAmount: number;
    returnsByStatus: { status: string; count: number }[];
    returnsByReason: { reason_category: string; count: number }[];
  }> {
    const qb = this.returnRequestRepo.createQueryBuilder('rr');

    if (dateFrom) {
      qb.andWhere('rr.created_at >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      qb.andWhere('rr.created_at <= :dateTo', { dateTo: new Date(dateTo) });
    }

    const statsResult = await qb
      .clone()
      .select('COUNT(*)', 'total_returns')
      .addSelect("COUNT(CASE WHEN rr.status = 'pending' THEN 1 END)", 'pending')
      .addSelect("COUNT(CASE WHEN rr.status = 'approved' THEN 1 END)", 'approved')
      .addSelect("COUNT(CASE WHEN rr.status = 'denied' THEN 1 END)", 'denied')
      .addSelect("COUNT(CASE WHEN rr.status = 'escalated' THEN 1 END)", 'escalated')
      .addSelect("COALESCE(SUM(CASE WHEN rr.status IN ('refunded') THEN rr.refund_amount ELSE 0 END), 0)", 'total_refund')
      .getRawOne();

    const returnsByStatus = await qb
      .clone()
      .select('rr.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('rr.status')
      .getRawMany();

    const returnsByReason = await qb
      .clone()
      .select('rr.reason_category', 'reason_category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('rr.reason_category')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return {
      totalReturns: parseInt(statsResult?.total_returns || '0', 10),
      pendingReturns: parseInt(statsResult?.pending || '0', 10),
      approvedReturns: parseInt(statsResult?.approved || '0', 10),
      deniedReturns: parseInt(statsResult?.denied || '0', 10),
      escalatedReturns: parseInt(statsResult?.escalated || '0', 10),
      totalRefundAmount: parseFloat(statsResult?.total_refund || '0'),
      returnsByStatus: returnsByStatus.map((row) => ({
        status: row.status,
        count: parseInt(row.count, 10),
      })),
      returnsByReason: returnsByReason.map((row) => ({
        reason_category: row.reason_category,
        count: parseInt(row.count, 10),
      })),
    };
  }
}
