import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderQueryDto } from './dto/order-query.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';

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

  async findAllOrdersAdmin(query: AdminOrderQueryDto): Promise<PaginatedResult<OrderEntity>> {
    const { page = 1, limit = 20, search, status, payment_method, payment_status, order_type, store_id, date_from, date_to } = query;

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
        'order.delivery_address',
        'order.scheduled_at',
        'order.estimated_delivery_at',
        'order.actual_delivery_at',
        'order.cancellation_reason',
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

    if (search) {
      qb.andWhere(
        '(order.order_number ILIKE :search OR order.customer_id::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) {
      qb.andWhere('order.status = :status', { status });
    }
    if (payment_method) {
      qb.andWhere('order.payment_method = :payment_method', { payment_method });
    }
    if (payment_status) {
      qb.andWhere('order.payment_status = :payment_status', { payment_status });
    }
    if (order_type) {
      qb.andWhere('order.order_type = :order_type', { order_type });
    }
    if (store_id) {
      qb.andWhere('order.store_id = :store_id', { store_id });
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

  async getOrderStats(dateFrom?: string, dateTo?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    todayOrders: number;
    todayRevenue: number;
    pendingOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
    ordersByStatus: { status: string; count: number }[];
    ordersByDay: { date: string; count: number; revenue: number }[];
    topStores: { store_id: string; store_name: string; order_count: number; revenue: number }[];
  }> {
    const qb = this.orderRepo.createQueryBuilder('order');

    if (dateFrom) {
      qb.andWhere('order.created_at >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      qb.andWhere('order.created_at <= :dateTo', { dateTo: new Date(dateTo) });
    }

    // Aggregate stats
    const statsResult = await qb
      .clone()
      .select('COUNT(*)', 'total_orders')
      .addSelect('COALESCE(SUM(order.total_amount), 0)', 'total_revenue')
      .addSelect('COALESCE(AVG(order.total_amount), 0)', 'avg_order_value')
      .getRawOne();

    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('COUNT(*)', 'today_orders')
      .addSelect('COALESCE(SUM(order.total_amount), 0)', 'today_revenue')
      .where('order.created_at >= :todayStart', { todayStart })
      .getRawOne();

    // Pending count
    const pendingResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('COUNT(*)', 'count')
      .where('order.status IN (:...statuses)', { statuses: ['pending', 'confirmed', 'preparing', 'ready'] })
      .getRawOne();

    // Cancelled count
    const cancelledResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('COUNT(*)', 'count')
      .where('order.status = :status', { status: 'cancelled' })
      .getRawOne();

    // Orders by status
    const ordersByStatus = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();

    // Orders by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ordersByDay = await this.orderRepo
      .createQueryBuilder('order')
      .select("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(order.total_amount), 0)', 'revenue')
      .where('order.created_at >= :thirtyDaysAgo', { thirtyDaysAgo })
      .groupBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();

    // Top stores (by order count, last 30 days)
    const topStores = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.store_id', 'store_id')
      .addSelect('COUNT(*)', 'order_count')
      .addSelect('COALESCE(SUM(order.total_amount), 0)', 'revenue')
      .where('order.created_at >= :thirtyDaysAgo', { thirtyDaysAgo })
      .groupBy('order.store_id')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalOrders: parseInt(statsResult?.total_orders || '0', 10),
      totalRevenue: parseFloat(statsResult?.total_revenue || '0'),
      todayOrders: parseInt(todayResult?.today_orders || '0', 10),
      todayRevenue: parseFloat(todayResult?.today_revenue || '0'),
      pendingOrders: parseInt(pendingResult?.count || '0', 10),
      cancelledOrders: parseInt(cancelledResult?.count || '0', 10),
      averageOrderValue: parseFloat(parseFloat(statsResult?.avg_order_value || '0').toFixed(2)),
      ordersByStatus: ordersByStatus.map((row) => ({
        status: row.status,
        count: parseInt(row.count, 10),
      })),
      ordersByDay: ordersByDay.map((row) => ({
        date: row.date,
        count: parseInt(row.count, 10),
        revenue: parseFloat(row.revenue),
      })),
      topStores: topStores.map((row) => ({
        store_id: row.store_id,
        store_name: '', // Will be enriched by service layer if needed
        order_count: parseInt(row.order_count, 10),
        revenue: parseFloat(row.revenue),
      })),
    };
  }

  async getVendorAnalytics(
    storeId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{
    revenue: { today: number; week: number; month: number; all_time: number };
    orders: { today: number; week: number; month: number; all_time: number };
    average_order_value: number;
    orders_by_status: { status: string; count: number }[];
    revenue_by_day: { date: string; revenue: number }[];
    orders_by_day: { date: string; count: number }[];
    top_products: { product_id: string; product_name: string; quantity: number; revenue: number }[];
    fulfillment_rate: number;
    avg_preparation_time_minutes: number;
    peak_hours: { hour: number; count: number }[];
  }> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);

    // Revenue + order count summaries
    const revenueSummary = await this.orderRepo
      .createQueryBuilder('order')
      .select([
        'COALESCE(SUM(CASE WHEN order.created_at >= :todayStart THEN order.total_amount ELSE 0 END), 0) AS today_revenue',
        'COALESCE(SUM(CASE WHEN order.created_at >= :weekStart THEN order.total_amount ELSE 0 END), 0) AS week_revenue',
        'COALESCE(SUM(CASE WHEN order.created_at >= :monthStart THEN order.total_amount ELSE 0 END), 0) AS month_revenue',
        'COALESCE(SUM(order.total_amount), 0) AS all_time_revenue',
        'COUNT(CASE WHEN order.created_at >= :todayStart THEN 1 END) AS today_orders',
        'COUNT(CASE WHEN order.created_at >= :weekStart THEN 1 END) AS week_orders',
        'COUNT(CASE WHEN order.created_at >= :monthStart THEN 1 END) AS month_orders',
        'COUNT(*) AS all_time_orders',
        'COALESCE(AVG(order.total_amount), 0) AS avg_order_value',
      ])
      .where('order.store_id = :storeId', { storeId })
      .andWhere("order.status != 'cancelled'")
      .setParameters({ todayStart, weekStart, monthStart })
      .getRawOne();

    // Orders by status
    const ordersByStatus = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.store_id = :storeId', { storeId })
      .groupBy('order.status')
      .getRawMany();

    // Revenue by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const revenueByDay = await this.orderRepo
      .createQueryBuilder('order')
      .select("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COALESCE(SUM(order.total_amount), 0)', 'revenue')
      .where('order.store_id = :storeId', { storeId })
      .andWhere('order.created_at >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere("order.status != 'cancelled'")
      .groupBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();

    // Orders by day (last 30 days)
    const ordersByDay = await this.orderRepo
      .createQueryBuilder('order')
      .select("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('order.store_id = :storeId', { storeId })
      .andWhere('order.created_at >= :thirtyDaysAgo', { thirtyDaysAgo })
      .groupBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();

    // Top selling products (top 10)
    const topProducts = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .select('item.product_id', 'product_id')
      .addSelect('item.product_name', 'product_name')
      .addSelect('SUM(item.quantity)', 'quantity')
      .addSelect('SUM(item.total_price)', 'revenue')
      .where('order.store_id = :storeId', { storeId })
      .andWhere("order.status != 'cancelled'")
      .groupBy('item.product_id')
      .addGroupBy('item.product_name')
      .orderBy('SUM(item.quantity)', 'DESC')
      .limit(10)
      .getRawMany();

    // Fulfillment rate (delivered / non-cancelled)
    const fulfillmentResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('COUNT(*)', 'total')
      .addSelect("COUNT(CASE WHEN order.status = 'delivered' THEN 1 END)", 'delivered')
      .where('order.store_id = :storeId', { storeId })
      .andWhere("order.status != 'cancelled'")
      .getRawOne();

    const totalNonCancelled = parseInt(fulfillmentResult?.total || '0', 10);
    const delivered = parseInt(fulfillmentResult?.delivered || '0', 10);
    const fulfillmentRate = totalNonCancelled > 0
      ? parseFloat(((delivered / totalNonCancelled) * 100).toFixed(1))
      : 0;

    // Average preparation time (prepared_at - created_at in minutes)
    const prepTimeResult = await this.orderRepo
      .createQueryBuilder('order')
      .select(
        'COALESCE(AVG(EXTRACT(EPOCH FROM (order.prepared_at - order.created_at)) / 60), 0)',
        'avg_prep_time',
      )
      .where('order.store_id = :storeId', { storeId })
      .andWhere('order.prepared_at IS NOT NULL')
      .getRawOne();

    // Peak hours (group by hour of day)
    const peakHours = await this.orderRepo
      .createQueryBuilder('order')
      .select('EXTRACT(HOUR FROM order.created_at)::int', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('order.store_id = :storeId', { storeId })
      .groupBy('EXTRACT(HOUR FROM order.created_at)')
      .orderBy('EXTRACT(HOUR FROM order.created_at)', 'ASC')
      .getRawMany();

    return {
      revenue: {
        today: parseFloat(revenueSummary?.today_revenue || '0'),
        week: parseFloat(revenueSummary?.week_revenue || '0'),
        month: parseFloat(revenueSummary?.month_revenue || '0'),
        all_time: parseFloat(revenueSummary?.all_time_revenue || '0'),
      },
      orders: {
        today: parseInt(revenueSummary?.today_orders || '0', 10),
        week: parseInt(revenueSummary?.week_orders || '0', 10),
        month: parseInt(revenueSummary?.month_orders || '0', 10),
        all_time: parseInt(revenueSummary?.all_time_orders || '0', 10),
      },
      average_order_value: parseFloat(parseFloat(revenueSummary?.avg_order_value || '0').toFixed(2)),
      orders_by_status: ordersByStatus.map((row) => ({
        status: row.status,
        count: parseInt(row.count, 10),
      })),
      revenue_by_day: revenueByDay.map((row) => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
      })),
      orders_by_day: ordersByDay.map((row) => ({
        date: row.date,
        count: parseInt(row.count, 10),
      })),
      top_products: topProducts.map((row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        quantity: parseInt(row.quantity, 10),
        revenue: parseFloat(row.revenue),
      })),
      fulfillment_rate: fulfillmentRate,
      avg_preparation_time_minutes: parseFloat(
        parseFloat(prepTimeResult?.avg_prep_time || '0').toFixed(1),
      ),
      peak_hours: peakHours.map((row) => ({
        hour: parseInt(row.hour, 10),
        count: parseInt(row.count, 10),
      })),
    };
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
