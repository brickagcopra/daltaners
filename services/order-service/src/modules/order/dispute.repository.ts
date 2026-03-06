import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DisputeEntity } from './entities/dispute.entity';
import { DisputeMessageEntity } from './entities/dispute-message.entity';
import { DisputeQueryDto, AdminDisputeQueryDto } from './dto/dispute-query.dto';
import { PaginatedResult } from './return.repository';

@Injectable()
export class DisputeRepository {
  private readonly logger = new Logger(DisputeRepository.name);

  constructor(
    @InjectRepository(DisputeEntity)
    private readonly disputeRepo: Repository<DisputeEntity>,
    @InjectRepository(DisputeMessageEntity)
    private readonly messageRepo: Repository<DisputeMessageEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createDispute(
    disputeData: Partial<DisputeEntity>,
    initialMessage?: Partial<DisputeMessageEntity>,
  ): Promise<DisputeEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dispute = queryRunner.manager.create(DisputeEntity, disputeData);
      const savedDispute = await queryRunner.manager.save(DisputeEntity, dispute);

      if (initialMessage) {
        const message = queryRunner.manager.create(DisputeMessageEntity, {
          ...initialMessage,
          dispute_id: savedDispute.id,
        });
        const savedMessage = await queryRunner.manager.save(DisputeMessageEntity, message);
        savedDispute.messages = [savedMessage];
      } else {
        savedDispute.messages = [];
      }

      await queryRunner.commitTransaction();
      return savedDispute;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create dispute: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string): Promise<DisputeEntity | null> {
    return this.disputeRepo.findOne({
      where: { id },
      relations: ['messages', 'order'],
    });
  }

  async findByIdWithPublicMessages(id: string): Promise<DisputeEntity | null> {
    const dispute = await this.disputeRepo.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!dispute) return null;

    // Load only non-internal messages for customer/vendor view
    const messages = await this.messageRepo.find({
      where: { dispute_id: id, is_internal: false },
      order: { created_at: 'ASC' },
    });

    dispute.messages = messages;
    return dispute;
  }

  async findByDisputeNumber(disputeNumber: string): Promise<DisputeEntity | null> {
    return this.disputeRepo.findOne({
      where: { dispute_number: disputeNumber },
      relations: ['messages'],
    });
  }

  async findByOrderId(orderId: string): Promise<DisputeEntity[]> {
    return this.disputeRepo.find({
      where: { order_id: orderId },
      order: { created_at: 'DESC' },
    });
  }

  async findByCustomerId(customerId: string, query: DisputeQueryDto): Promise<PaginatedResult<DisputeEntity>> {
    const { page = 1, limit = 20, status, category, priority, date_from, date_to } = query;

    const qb = this.disputeRepo
      .createQueryBuilder('d')
      .where('d.customer_id = :customerId', { customerId });

    if (status) {
      qb.andWhere('d.status = :status', { status });
    }
    if (category) {
      qb.andWhere('d.category = :category', { category });
    }
    if (priority) {
      qb.andWhere('d.priority = :priority', { priority });
    }
    if (date_from) {
      qb.andWhere('d.created_at >= :date_from', { date_from: new Date(date_from) });
    }
    if (date_to) {
      qb.andWhere('d.created_at <= :date_to', { date_to: new Date(date_to) });
    }

    qb.orderBy('d.created_at', 'DESC');

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

  async findByStoreId(storeId: string, query: DisputeQueryDto): Promise<PaginatedResult<DisputeEntity>> {
    const { page = 1, limit = 20, status, category, priority, date_from, date_to } = query;

    const qb = this.disputeRepo
      .createQueryBuilder('d')
      .where('d.store_id = :storeId', { storeId });

    if (status) {
      qb.andWhere('d.status = :status', { status });
    }
    if (category) {
      qb.andWhere('d.category = :category', { category });
    }
    if (priority) {
      qb.andWhere('d.priority = :priority', { priority });
    }
    if (date_from) {
      qb.andWhere('d.created_at >= :date_from', { date_from: new Date(date_from) });
    }
    if (date_to) {
      qb.andWhere('d.created_at <= :date_to', { date_to: new Date(date_to) });
    }

    qb.orderBy('d.created_at', 'DESC');

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

  async findAllAdmin(query: AdminDisputeQueryDto): Promise<PaginatedResult<DisputeEntity>> {
    const { page = 1, limit = 20, search, status, category, priority, store_id, customer_id, assigned_to, date_from, date_to } = query;

    const qb = this.disputeRepo
      .createQueryBuilder('d')
      .leftJoin('d.order', 'order')
      .addSelect(['order.order_number']);

    if (search) {
      qb.andWhere(
        '(d.dispute_number ILIKE :search OR order.order_number ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) {
      qb.andWhere('d.status = :status', { status });
    }
    if (category) {
      qb.andWhere('d.category = :category', { category });
    }
    if (priority) {
      qb.andWhere('d.priority = :priority', { priority });
    }
    if (store_id) {
      qb.andWhere('d.store_id = :store_id', { store_id });
    }
    if (customer_id) {
      qb.andWhere('d.customer_id = :customer_id', { customer_id });
    }
    if (assigned_to) {
      qb.andWhere('d.admin_assigned_to = :assigned_to', { assigned_to });
    }
    if (date_from) {
      qb.andWhere('d.created_at >= :date_from', { date_from: new Date(date_from) });
    }
    if (date_to) {
      qb.andWhere('d.created_at <= :date_to', { date_to: new Date(date_to) });
    }

    qb.orderBy('d.created_at', 'DESC');

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

  async updateDispute(id: string, updateData: Partial<DisputeEntity>): Promise<DisputeEntity | null> {
    await this.disputeRepo.update(id, updateData as any);
    return this.findById(id);
  }

  async addMessage(messageData: Partial<DisputeMessageEntity>): Promise<DisputeMessageEntity> {
    const message = this.messageRepo.create(messageData);
    return this.messageRepo.save(message);
  }

  async getMessages(disputeId: string, includeInternal: boolean): Promise<DisputeMessageEntity[]> {
    const where: any = { dispute_id: disputeId };
    if (!includeInternal) {
      where.is_internal = false;
    }
    return this.messageRepo.find({
      where,
      order: { created_at: 'ASC' },
    });
  }

  async disputeNumberExists(disputeNumber: string): Promise<boolean> {
    const count = await this.disputeRepo.count({ where: { dispute_number: disputeNumber } });
    return count > 0;
  }

  async findOverdueDisputes(): Promise<DisputeEntity[]> {
    return this.disputeRepo
      .createQueryBuilder('d')
      .where('d.status = :status', { status: 'open' })
      .andWhere('d.vendor_response_deadline IS NOT NULL')
      .andWhere('d.vendor_response_deadline < NOW()')
      .getMany();
  }

  async getDisputeStats(dateFrom?: string, dateTo?: string): Promise<{
    totalDisputes: number;
    openDisputes: number;
    escalatedDisputes: number;
    resolvedDisputes: number;
    closedDisputes: number;
    totalResolutionAmount: number;
    disputesByStatus: { status: string; count: number }[];
    disputesByCategory: { category: string; count: number }[];
    disputesByPriority: { priority: string; count: number }[];
  }> {
    const qb = this.disputeRepo.createQueryBuilder('d');

    if (dateFrom) {
      qb.andWhere('d.created_at >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      qb.andWhere('d.created_at <= :dateTo', { dateTo: new Date(dateTo) });
    }

    const statsResult = await qb
      .clone()
      .select('COUNT(*)', 'total_disputes')
      .addSelect("COUNT(CASE WHEN d.status = 'open' THEN 1 END)", 'open')
      .addSelect("COUNT(CASE WHEN d.status = 'escalated' THEN 1 END)", 'escalated')
      .addSelect("COUNT(CASE WHEN d.status = 'resolved' THEN 1 END)", 'resolved')
      .addSelect("COUNT(CASE WHEN d.status = 'closed' THEN 1 END)", 'closed')
      .addSelect("COALESCE(SUM(CASE WHEN d.status = 'resolved' THEN d.resolution_amount ELSE 0 END), 0)", 'total_resolution')
      .getRawOne();

    const disputesByStatus = await qb
      .clone()
      .select('d.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.status')
      .getRawMany();

    const disputesByCategory = await qb
      .clone()
      .select('d.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.category')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    const disputesByPriority = await qb
      .clone()
      .select('d.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.priority')
      .getRawMany();

    return {
      totalDisputes: parseInt(statsResult?.total_disputes || '0', 10),
      openDisputes: parseInt(statsResult?.open || '0', 10),
      escalatedDisputes: parseInt(statsResult?.escalated || '0', 10),
      resolvedDisputes: parseInt(statsResult?.resolved || '0', 10),
      closedDisputes: parseInt(statsResult?.closed || '0', 10),
      totalResolutionAmount: parseFloat(statsResult?.total_resolution || '0'),
      disputesByStatus: disputesByStatus.map((row) => ({
        status: row.status,
        count: parseInt(row.count, 10),
      })),
      disputesByCategory: disputesByCategory.map((row) => ({
        category: row.category,
        count: parseInt(row.count, 10),
      })),
      disputesByPriority: disputesByPriority.map((row) => ({
        priority: row.priority,
        count: parseInt(row.count, 10),
      })),
    };
  }
}
