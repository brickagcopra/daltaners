import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderQueryDto } from './dto/order-query.dto';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class OrderRepository {
  private readonly logger = new Logger(OrderRepository.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createOrder(
    orderData: Partial<OrderEntity>,
    itemsData: Partial<OrderItemEntity>[],
  ): Promise<OrderEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(OrderEntity, orderData);
      const savedOrder = await queryRunner.manager.save(OrderEntity, order);

      const items = itemsData.map((item) =>
        queryRunner.manager.create(OrderItemEntity, {
          ...item,
          order_id: savedOrder.id,
        }),
      );
      const savedItems = await queryRunner.manager.save(OrderItemEntity, items);

      await queryRunner.commitTransaction();

      savedOrder.items = savedItems;
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create order: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOrderById(id: string): Promise<OrderEntity | null> {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  async findOrderByNumber(orderNumber: string): Promise<OrderEntity | null> {
    return this.orderRepo.findOne({
      where: { order_number: orderNumber },
      relations: ['items'],
    });
  }

  async findOrders(query: OrderQueryDto): Promise<PaginatedResult<OrderEntity>> {
    const { page = 1, limit = 20, customer_id, store_id, status, order_type, date_from, date_to } = query;

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .select([
        'order.id',
        'order.order_number',
        'order.customer_id',
        'order.store_id',
        'order.store_location_id',
        'order.status',
        'order.order_type',
        'order.service_type',
        'order.delivery_type',
        'order.subtotal',
        'order.delivery_fee',
        'order.service_fee',
        'order.tax_amount',
        'order.discount_amount',
        'order.tip_amount',
        'order.total_amount',
        'order.payment_method',
        'order.payment_status',
        'order.scheduled_at',
        'order.estimated_delivery_at',
        'order.actual_delivery_at',
        'order.created_at',
        'order.updated_at',
        'items.id',
        'items.product_id',
        'items.product_name',
        'items.unit_price',
        'items.quantity',
        'items.total_price',
        'items.status',
      ]);

    this.applyFilters(qb, { customer_id, store_id, status, order_type, date_from, date_to });

    qb.orderBy('order.created_at', 'DESC');

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

  async findOrdersByCustomerId(
    customerId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<CursorPaginatedResult<OrderEntity>> {
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.customer_id = :customerId', { customerId })
      .orderBy('order.created_at', 'DESC')
      .take(limit + 1);

    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      qb.andWhere('order.created_at < :cursorDate', { cursorDate: decodedCursor });
    }

    const results = await qb.getMany();
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = Buffer.from(lastItem.created_at.toISOString()).toString('base64');
    }

    return { items, nextCursor, hasMore };
  }

  async findOrdersByStoreId(
    storeId: string,
    query: OrderQueryDto,
  ): Promise<PaginatedResult<OrderEntity>> {
    const { page = 1, limit = 20, status, order_type, date_from, date_to } = query;

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.store_id = :storeId', { storeId });

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }
    if (order_type) {
      qb.andWhere('order.order_type = :order_type', { order_type });
    }
    if (date_from) {
      qb.andWhere('order.created_at >= :date_from', { date_from: new Date(date_from) });
    }
    if (date_to) {
      qb.andWhere('order.created_at <= :date_to', { date_to: new Date(date_to) });
    }

    qb.orderBy('order.created_at', 'DESC');

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

  async updateOrderStatus(id: string, status: string, additionalFields?: Partial<OrderEntity>): Promise<OrderEntity | null> {
    const updateData: Partial<OrderEntity> = { status, ...additionalFields };
    await this.orderRepo.update(id, updateData as any);
    return this.findOrderById(id);
  }

  async updateOrder(id: string, updateData: Partial<OrderEntity>): Promise<OrderEntity | null> {
    await this.orderRepo.update(id, updateData as any);
    return this.findOrderById(id);
  }

  async orderNumberExists(orderNumber: string): Promise<boolean> {
    const count = await this.orderRepo.count({ where: { order_number: orderNumber } });
    return count > 0;
  }

  private applyFilters(
    qb: SelectQueryBuilder<OrderEntity>,
    filters: {
      customer_id?: string;
      store_id?: string;
      status?: string;
      order_type?: string;
      date_from?: string;
      date_to?: string;
    },
  ): void {
    if (filters.customer_id) {
      qb.andWhere('order.customer_id = :customer_id', { customer_id: filters.customer_id });
    }
    if (filters.store_id) {
      qb.andWhere('order.store_id = :store_id', { store_id: filters.store_id });
    }
    if (filters.status) {
      qb.andWhere('order.status = :status', { status: filters.status });
    }
    if (filters.order_type) {
      qb.andWhere('order.order_type = :order_type', { order_type: filters.order_type });
    }
    if (filters.date_from) {
      qb.andWhere('order.created_at >= :date_from', { date_from: new Date(filters.date_from) });
    }
    if (filters.date_to) {
      qb.andWhere('order.created_at <= :date_to', { date_to: new Date(filters.date_to) });
    }
  }
}
