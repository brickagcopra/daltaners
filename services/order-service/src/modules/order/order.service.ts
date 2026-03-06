import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OrderRepository, PaginatedResult, CursorPaginatedResult } from './order.repository';
import { CouponService } from './coupon.service';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { OrderEntity } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { AdminOrderQueryDto, AdminOrderStatsQueryDto } from './dto/admin-order-query.dto';
import {
  getServiceTypeRules,
  validateMinimumOrder,
  validateDeliveryType,
  validatePrescription,
  calculateEstimatedDelivery,
} from './service-type-rules';
import { ZoneClientService } from './zone-client.service';

const ORDER_CACHE_TTL = 300; // 5 minutes

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['picked_up', 'cancelled'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
  delivered: ['returned', 'refunded'],
  cancelled: [],
  returned: ['refunded'],
  refunded: [],
};

const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

const DELIVERY_FEE_MAP: Record<string, number> = {
  standard: 49.0,
  express: 79.0,
  scheduled: 39.0,
  instant: 99.0,
};

const SERVICE_FEE_RATE = 0.05;
const TAX_RATE = 0.12;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly couponService: CouponService,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly zoneClient: ZoneClientService,
  ) {}

  async createOrder(customerId: string, dto: CreateOrderDto): Promise<OrderEntity> {
    // ── Service-type validation ──
    const rules = getServiceTypeRules(dto.service_type);
    validateDeliveryType(rules, dto.delivery_type);

    const orderNumber = await this.generateUniqueOrderNumber();

    // Calculate item totals using placeholder unit price
    // In production, prices would be fetched from catalog-service via inter-service call
    const itemsData = dto.items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      product_name: 'Product', // Placeholder: resolved by catalog service in production
      product_image_url: null,
      unit_price: 0,
      quantity: item.quantity,
      total_price: 0,
      discount_amount: 0,
      special_instructions: item.special_instructions || null,
      substitution_product_id: null,
      status: 'pending',
    }));

    // Calculate fee breakdown
    const subtotal = itemsData.reduce((sum, item) => sum + Number(item.total_price), 0);

    // Validate minimum order amount per service type
    validateMinimumOrder(rules, subtotal);

    // Validate prescription for pharmacy orders with Rx items
    validatePrescription(rules, !!dto.has_rx_items, dto.prescription_upload_id);

    // Zone-based delivery fee with fallback to static map
    let deliveryFee = 0;
    if (dto.order_type !== 'pickup') {
      const originLat = (dto.delivery_address as any)?.lat || 0;
      const originLng = (dto.delivery_address as any)?.lng || 0;
      deliveryFee = await this.zoneClient.calculateDeliveryFee(
        originLat,
        originLng,
        dto.destination_lat || 0,
        dto.destination_lng || 0,
        dto.delivery_type,
      );
    }
    const serviceFee = parseFloat((subtotal * SERVICE_FEE_RATE).toFixed(2));
    const taxAmount = parseFloat((subtotal * TAX_RATE).toFixed(2));
    const tipAmount = dto.tip_amount || 0;

    // Validate and apply coupon if provided
    let discountAmount = 0;
    let couponId: string | null = null;
    let couponValidation: { coupon_id: string; discount_type: string; discount_amount: number } | null = null;

    if (dto.coupon_code) {
      const validationResult = await this.couponService.validateCoupon(
        {
          code: dto.coupon_code,
          subtotal,
          store_id: dto.store_id,
          category_ids: dto.category_ids,
        },
        customerId,
      );

      couponId = validationResult.coupon_id;
      discountAmount = validationResult.discount_amount;
      couponValidation = validationResult;

      // For free_delivery coupons, zero out delivery fee
      if (validationResult.discount_type === 'free_delivery') {
        deliveryFee = 0;
      }
    }

    const totalAmount = parseFloat(
      (subtotal + deliveryFee + serviceFee + taxAmount - discountAmount + tipAmount).toFixed(2),
    );

    // Calculate estimated delivery time based on service type prep time
    const estimatedDeliveryAt = dto.order_type === 'pickup'
      ? null
      : calculateEstimatedDelivery(rules);

    const orderData: Partial<OrderEntity> = {
      order_number: orderNumber,
      customer_id: customerId,
      store_id: dto.store_id,
      store_location_id: dto.store_location_id,
      status: 'pending',
      order_type: dto.order_type,
      service_type: dto.service_type,
      delivery_type: dto.delivery_type,
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
      subtotal,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      tip_amount: tipAmount,
      total_amount: totalAmount,
      payment_method: dto.payment_method,
      payment_status: 'pending',
      delivery_address: dto.delivery_address,
      delivery_instructions: dto.delivery_instructions || null,
      substitution_policy: dto.substitution_policy || 'refund_only',
      coupon_id: couponId,
      coupon_code: dto.coupon_code ? dto.coupon_code.toUpperCase() : null,
      customer_notes: dto.customer_notes || null,
      cancellation_reason: null,
      estimated_delivery_at: estimatedDeliveryAt,
      actual_delivery_at: null,
      prepared_at: null,
      picked_up_at: null,
      metadata: {},
    };

    const order = await this.orderRepository.createOrder(orderData, itemsData);

    // Redeem coupon after order is saved
    if (couponValidation && couponId) {
      await this.couponService.redeemCoupon(couponId, customerId, order.id, discountAmount);
    }

    // Cache the new order
    await this.cacheOrder(order);

    // Publish ORDER_PLACED event
    await this.kafkaProducer.publish(
      'daltaners.orders.events',
      'com.daltaners.orders.placed',
      {
        order_id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        store_id: order.store_id,
        store_location_id: order.store_location_id,
        order_type: order.order_type,
        service_type: order.service_type,
        delivery_type: order.delivery_type,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        items: order.items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
      },
      order.id,
    );

    this.logger.log(`Order created: ${order.order_number} for customer ${customerId}`);
    return order;
  }

  async getOrder(id: string, userId?: string, userRole?: string): Promise<OrderEntity> {
    // Try cache first
    const cached = await this.redisService.getJson<OrderEntity>(`order:detail:${id}`);
    if (cached) {
      this.enforceOrderAccess(cached, userId, userRole);
      return cached;
    }

    const order = await this.orderRepository.findOrderById(id);
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    this.enforceOrderAccess(order, userId, userRole);

    await this.cacheOrder(order);
    return order;
  }

  async getOrders(query: OrderQueryDto): Promise<PaginatedResult<OrderEntity>> {
    return this.orderRepository.findOrders(query);
  }

  async getCustomerOrders(
    customerId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<CursorPaginatedResult<OrderEntity>> {
    return this.orderRepository.findOrdersByCustomerId(customerId, limit, cursor);
  }

  async getVendorOrders(
    storeId: string,
    query: OrderQueryDto,
    vendorId?: string,
  ): Promise<PaginatedResult<OrderEntity>> {
    return this.orderRepository.findOrdersByStoreId(storeId, query);
  }

  async cancelOrder(
    orderId: string,
    userId: string,
    userRole: string,
    cancellationReason?: string,
  ): Promise<OrderEntity> {
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    this.enforceOrderAccess(order, userId, userRole);

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Order cannot be cancelled in status '${order.status}'. Cancellation is only allowed when status is: ${CANCELLABLE_STATUSES.join(', ')}`,
      );
    }

    const updatedOrder = await this.orderRepository.updateOrderStatus(orderId, 'cancelled', {
      cancellation_reason: cancellationReason || 'Cancelled by user',
      payment_status: order.payment_status === 'completed' ? 'refund_pending' : 'cancelled',
    });

    if (!updatedOrder) {
      throw new NotFoundException(`Order with id ${orderId} not found after update`);
    }

    // Release coupon if one was applied
    await this.couponService.releaseCoupon(orderId);

    // Invalidate cache
    await this.invalidateOrderCache(orderId);

    // Publish ORDER_CANCELLED event
    await this.kafkaProducer.publish(
      'daltaners.orders.events',
      'com.daltaners.orders.cancelled',
      {
        order_id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        customer_id: updatedOrder.customer_id,
        store_id: updatedOrder.store_id,
        cancellation_reason: updatedOrder.cancellation_reason,
        previous_status: order.status,
        items: updatedOrder.items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
      },
      updatedOrder.id,
    );

    this.logger.log(`Order cancelled: ${updatedOrder.order_number} by user ${userId}`);
    return updatedOrder;
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    userId: string,
    userRole: string,
  ): Promise<OrderEntity> {
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    // Validate state transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions || !allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from '${order.status}' to '${dto.status}'. Allowed transitions: ${(allowedTransitions || []).join(', ') || 'none'}`,
      );
    }

    // Build additional fields based on status
    const additionalFields: Partial<OrderEntity> = {};

    switch (dto.status) {
      case 'cancelled':
        additionalFields.cancellation_reason = dto.cancellation_reason || 'Cancelled by vendor/admin';
        additionalFields.payment_status =
          order.payment_status === 'completed' ? 'refund_pending' : 'cancelled';
        break;
      case 'preparing':
        // No additional fields
        break;
      case 'ready':
        additionalFields.prepared_at = new Date();
        break;
      case 'picked_up':
        additionalFields.picked_up_at = new Date();
        break;
      case 'delivered':
        additionalFields.actual_delivery_at = new Date();
        break;
      case 'confirmed':
        // No additional fields
        break;
      case 'refunded':
        additionalFields.payment_status = 'refunded';
        break;
    }

    const updatedOrder = await this.orderRepository.updateOrderStatus(
      orderId,
      dto.status,
      additionalFields,
    );

    if (!updatedOrder) {
      throw new NotFoundException(`Order with id ${orderId} not found after update`);
    }

    // Release coupon if order is cancelled via status update
    if (dto.status === 'cancelled') {
      await this.couponService.releaseCoupon(orderId);
    }

    // Invalidate cache
    await this.invalidateOrderCache(orderId);

    // Publish ORDER_STATUS_CHANGED event
    await this.kafkaProducer.publish(
      'daltaners.orders.events',
      'com.daltaners.orders.status_changed',
      {
        order_id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        customer_id: updatedOrder.customer_id,
        store_id: updatedOrder.store_id,
        total_amount: Number(updatedOrder.total_amount),
        previous_status: order.status,
        new_status: dto.status,
        updated_by: userId,
        updated_by_role: userRole,
      },
      updatedOrder.id,
    );

    this.logger.log(
      `Order status updated: ${updatedOrder.order_number} from '${order.status}' to '${dto.status}' by ${userId}`,
    );
    return updatedOrder;
  }

  async handlePaymentCompleted(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
      this.logger.warn(`Payment completed event received for unknown order: ${orderId}`);
      return;
    }

    if (order.payment_status === 'completed') {
      this.logger.warn(`Duplicate payment completed event for order: ${orderId}`);
      return;
    }

    await this.orderRepository.updateOrderStatus(orderId, 'confirmed', {
      payment_status: 'completed',
    } as Partial<OrderEntity>);

    await this.invalidateOrderCache(orderId);

    await this.kafkaProducer.publish(
      'daltaners.orders.events',
      'com.daltaners.orders.status_changed',
      {
        order_id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        store_id: order.store_id,
        total_amount: Number(order.total_amount),
        previous_status: order.status,
        new_status: 'confirmed',
        updated_by: 'system',
        updated_by_role: 'system',
      },
      order.id,
    );

    this.logger.log(`Order confirmed after payment: ${order.order_number}`);
  }

  async handlePaymentFailed(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
      this.logger.warn(`Payment failed event received for unknown order: ${orderId}`);
      return;
    }

    if (order.status === 'cancelled') {
      this.logger.warn(`Order already cancelled, ignoring payment failure: ${orderId}`);
      return;
    }

    await this.orderRepository.updateOrderStatus(orderId, 'cancelled', {
      payment_status: 'failed',
      cancellation_reason: 'Payment failed',
    } as Partial<OrderEntity>);

    // Release coupon if one was applied
    await this.couponService.releaseCoupon(orderId);

    await this.invalidateOrderCache(orderId);

    // Publish cancellation event so inventory can be released
    await this.kafkaProducer.publish(
      'daltaners.orders.events',
      'com.daltaners.orders.cancelled',
      {
        order_id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        store_id: order.store_id,
        cancellation_reason: 'Payment failed',
        previous_status: order.status,
        items: order.items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
      },
      order.id,
    );

    this.logger.log(`Order cancelled due to payment failure: ${order.order_number}`);
  }

  async handleDeliveryStatusUpdate(orderId: string, deliveryStatus: string): Promise<void> {
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
      this.logger.warn(`Delivery status update for unknown order: ${orderId}`);
      return;
    }

    const statusMapping: Record<string, string> = {
      picked_up: 'picked_up',
      in_transit: 'in_transit',
      delivered: 'delivered',
    };

    const mappedStatus = statusMapping[deliveryStatus];
    if (!mappedStatus) {
      this.logger.warn(`Unknown delivery status: ${deliveryStatus} for order: ${orderId}`);
      return;
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions || !allowedTransitions.includes(mappedStatus)) {
      this.logger.warn(
        `Invalid delivery status transition from '${order.status}' to '${mappedStatus}' for order: ${orderId}`,
      );
      return;
    }

    const additionalFields: Partial<OrderEntity> = {};
    if (mappedStatus === 'picked_up') {
      additionalFields.picked_up_at = new Date();
    } else if (mappedStatus === 'delivered') {
      additionalFields.actual_delivery_at = new Date();
    }

    await this.orderRepository.updateOrderStatus(orderId, mappedStatus, additionalFields);
    await this.invalidateOrderCache(orderId);

    await this.kafkaProducer.publish(
      'daltaners.orders.events',
      'com.daltaners.orders.status_changed',
      {
        order_id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        store_id: order.store_id,
        total_amount: Number(order.total_amount),
        previous_status: order.status,
        new_status: mappedStatus,
        updated_by: 'delivery-service',
        updated_by_role: 'system',
      },
      order.id,
    );

    this.logger.log(
      `Order delivery status updated: ${order.order_number} to '${mappedStatus}' from delivery tracking`,
    );
  }

  // ── Vendor Analytics ──

  async getVendorAnalytics(
    storeId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const analytics = await this.orderRepository.getVendorAnalytics(storeId, dateFrom, dateTo);
    return {
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Admin Methods ──

  async adminListOrders(query: AdminOrderQueryDto) {
    const result = await this.orderRepository.findAllOrdersAdmin(query);
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async adminGetStats(query?: AdminOrderStatsQueryDto) {
    const stats = await this.orderRepository.getOrderStats(query?.date_from, query?.date_to);
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  private async generateUniqueOrderNumber(): Promise<string> {
    let orderNumber: string;
    let exists: boolean;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      orderNumber = this.generateOrderNumber();
      exists = await this.orderRepository.orderNumberExists(orderNumber);
      attempts++;
      if (attempts >= maxAttempts) {
        throw new BadRequestException('Unable to generate unique order number. Please try again.');
      }
    } while (exists);

    return orderNumber;
  }

  private generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `DLT-${year}-${random}`;
  }

  private enforceOrderAccess(
    order: OrderEntity,
    userId?: string,
    userRole?: string,
  ): void {
    if (!userId || !userRole) return;

    // Admins can access all orders
    if (userRole === 'admin') return;

    // Customers can only access their own orders
    if (userRole === 'customer' && order.customer_id !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    // Vendors can access orders for their stores (vendor_id check done at controller level)
    if (userRole === 'vendor_owner' || userRole === 'vendor_staff') return;

    // Delivery personnel can access orders assigned to them (checked via metadata in production)
    if (userRole === 'delivery') return;
  }

  private async cacheOrder(order: OrderEntity): Promise<void> {
    await this.redisService.setJson(`order:detail:${order.id}`, order, ORDER_CACHE_TTL);
  }

  private async invalidateOrderCache(orderId: string): Promise<void> {
    await this.redisService.del(`order:detail:${orderId}`);
  }
}
