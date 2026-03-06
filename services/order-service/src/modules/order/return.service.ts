import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ReturnRepository } from './return.repository';
import { OrderRepository } from './order.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ReturnRequestQueryDto, AdminReturnQueryDto } from './dto/return-request-query.dto';
import {
  VendorApproveReturnDto,
  VendorDenyReturnDto,
  VendorMarkReceivedDto,
  AdminReturnActionDto,
} from './dto/vendor-return-response.dto';
import { ReturnRequestEntity } from './entities/return-request.entity';

const RETURN_CACHE_PREFIX = 'return:request:';
const RETURN_CACHE_TTL = 300; // 5 minutes

const RETURNABLE_ORDER_STATUSES = ['delivered'];
const RETURN_WINDOW_DAYS = 7;

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'denied', 'cancelled', 'escalated'],
  approved: ['received', 'escalated'],
  received: ['refunded'],
  escalated: ['approved', 'denied', 'refunded'],
};

@Injectable()
export class ReturnService {
  private readonly logger = new Logger(ReturnService.name);

  constructor(
    private readonly returnRepository: ReturnRepository,
    private readonly orderRepository: OrderRepository,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ── Customer: Create Return Request ──

  async createReturnRequest(customerId: string, dto: CreateReturnRequestDto): Promise<ReturnRequestEntity> {
    const order = await this.orderRepository.findOrderById(dto.order_id);
    if (!order) {
      throw new NotFoundException(`Order with id ${dto.order_id} not found`);
    }

    if (order.customer_id !== customerId) {
      throw new ForbiddenException('You can only return your own orders');
    }

    if (!RETURNABLE_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(`Order status '${order.status}' does not allow returns. Order must be 'delivered'.`);
    }

    // Check return window
    const deliveryDate = order.actual_delivery_at || order.updated_at;
    const daysSinceDelivery = Math.floor(
      (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      throw new BadRequestException(
        `Return window of ${RETURN_WINDOW_DAYS} days has expired. Order was delivered ${daysSinceDelivery} days ago.`,
      );
    }

    // Check for existing pending/approved return on same order
    const existingReturns = await this.returnRepository.findByOrderId(dto.order_id);
    const activeReturn = existingReturns.find((r) =>
      ['pending', 'approved', 'received', 'escalated'].includes(r.status),
    );
    if (activeReturn) {
      throw new ConflictException(
        `An active return request (${activeReturn.request_number}) already exists for this order`,
      );
    }

    // Validate items belong to the order
    const orderItemIds = order.items.map((item) => item.id);
    for (const returnItem of dto.items) {
      if (!orderItemIds.includes(returnItem.order_item_id)) {
        throw new BadRequestException(`Order item ${returnItem.order_item_id} does not belong to order ${dto.order_id}`);
      }
      const orderItem = order.items.find((i) => i.id === returnItem.order_item_id);
      if (orderItem && returnItem.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Return quantity (${returnItem.quantity}) exceeds order quantity (${orderItem.quantity}) for item ${orderItem.product_name}`,
        );
      }
    }

    // Generate request number
    const requestNumber = await this.generateRequestNumber();

    // Calculate initial refund amount
    let totalRefundAmount = 0;
    const itemsData = dto.items.map((returnItem) => {
      const orderItem = order.items.find((i) => i.id === returnItem.order_item_id)!;
      const itemRefund = Number(orderItem.unit_price) * returnItem.quantity;
      totalRefundAmount += itemRefund;
      return {
        order_item_id: returnItem.order_item_id,
        product_id: orderItem.product_id,
        product_name: orderItem.product_name,
        quantity: returnItem.quantity,
        unit_price: orderItem.unit_price,
        refund_amount: itemRefund,
        condition: returnItem.condition || 'unknown',
      };
    });

    const returnRequest = await this.returnRepository.createReturnRequest(
      {
        order_id: dto.order_id,
        customer_id: customerId,
        store_id: order.store_id,
        request_number: requestNumber,
        status: 'pending',
        reason_category: dto.reason_category,
        reason_details: dto.reason_details || null,
        evidence_urls: dto.evidence_urls || [],
        requested_resolution: dto.requested_resolution || 'refund',
        refund_amount: totalRefundAmount,
      },
      itemsData,
    );

    // Publish Kafka event
    await this.kafkaProducer.publish(
      'daltaners.returns.events',
      'com.daltaners.returns.created',
      {
        return_request_id: returnRequest.id,
        request_number: returnRequest.request_number,
        order_id: returnRequest.order_id,
        customer_id: returnRequest.customer_id,
        store_id: returnRequest.store_id,
        reason_category: returnRequest.reason_category,
        refund_amount: totalRefundAmount,
        items_count: dto.items.length,
      },
      returnRequest.id,
    );

    this.logger.log(`Return request created: ${requestNumber} for order ${order.order_number}`);

    return returnRequest;
  }

  // ── Customer: Get My Returns ──

  async getCustomerReturns(customerId: string, query: ReturnRequestQueryDto) {
    const result = await this.returnRepository.findByCustomerId(customerId, query);
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

  // ── Customer: Get Return Detail ──

  async getReturnById(id: string, userId?: string, userRole?: string): Promise<ReturnRequestEntity> {
    // Try cache first
    const cacheKey = `${RETURN_CACHE_PREFIX}${id}`;
    const cached = await this.redisService.getJson<ReturnRequestEntity>(cacheKey);
    if (cached) {
      this.assertAccess(cached, userId, userRole);
      return cached;
    }

    const returnRequest = await this.returnRepository.findById(id);
    if (!returnRequest) {
      throw new NotFoundException(`Return request with id ${id} not found`);
    }

    this.assertAccess(returnRequest, userId, userRole);

    await this.redisService.setJson(cacheKey, returnRequest, RETURN_CACHE_TTL);
    return returnRequest;
  }

  // ── Customer: Cancel Return ──

  async cancelReturn(id: string, customerId: string): Promise<ReturnRequestEntity> {
    const returnRequest = await this.returnRepository.findById(id);
    if (!returnRequest) {
      throw new NotFoundException(`Return request with id ${id} not found`);
    }

    if (returnRequest.customer_id !== customerId) {
      throw new ForbiddenException('You can only cancel your own return requests');
    }

    if (returnRequest.status !== 'pending') {
      throw new BadRequestException(`Cannot cancel return in status '${returnRequest.status}'. Only pending returns can be cancelled.`);
    }

    const updated = await this.returnRepository.updateReturnRequest(id, { status: 'cancelled' });
    await this.invalidateCache(id);

    this.logger.log(`Return request cancelled: ${returnRequest.request_number}`);
    return updated!;
  }

  // ── Vendor: Get Store Returns ──

  async getVendorReturns(storeId: string, query: ReturnRequestQueryDto) {
    const result = await this.returnRepository.findByStoreId(storeId, query);
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

  // ── Vendor: Approve Return ──

  async approveReturn(id: string, storeId: string, dto: VendorApproveReturnDto): Promise<ReturnRequestEntity> {
    const returnRequest = await this.getAndValidateVendorReturn(id, storeId);
    this.assertStatusTransition(returnRequest.status, 'approved');

    const refundAmount = dto.refund_amount ?? returnRequest.refund_amount;

    const updated = await this.returnRepository.updateReturnRequest(id, {
      status: 'approved',
      vendor_response: dto.vendor_response || null,
      vendor_responded_at: new Date(),
      refund_amount: refundAmount,
    });

    await this.invalidateCache(id);

    await this.kafkaProducer.publish(
      'daltaners.returns.events',
      'com.daltaners.returns.approved',
      {
        return_request_id: id,
        request_number: returnRequest.request_number,
        order_id: returnRequest.order_id,
        customer_id: returnRequest.customer_id,
        store_id: returnRequest.store_id,
        refund_amount: refundAmount,
        items: returnRequest.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          restockable: item.restockable,
        })),
      },
      id,
    );

    this.logger.log(`Return request approved: ${returnRequest.request_number}`);
    return updated!;
  }

  // ── Vendor: Deny Return ──

  async denyReturn(id: string, storeId: string, dto: VendorDenyReturnDto): Promise<ReturnRequestEntity> {
    const returnRequest = await this.getAndValidateVendorReturn(id, storeId);
    this.assertStatusTransition(returnRequest.status, 'denied');

    const updated = await this.returnRepository.updateReturnRequest(id, {
      status: 'denied',
      vendor_response: dto.vendor_response,
      vendor_responded_at: new Date(),
    });

    await this.invalidateCache(id);

    await this.kafkaProducer.publish(
      'daltaners.returns.events',
      'com.daltaners.returns.denied',
      {
        return_request_id: id,
        request_number: returnRequest.request_number,
        order_id: returnRequest.order_id,
        customer_id: returnRequest.customer_id,
        store_id: returnRequest.store_id,
        reason: dto.vendor_response,
      },
      id,
    );

    this.logger.log(`Return request denied: ${returnRequest.request_number}`);
    return updated!;
  }

  // ── Vendor: Mark Items Received ──

  async markReceived(id: string, storeId: string, dto: VendorMarkReceivedDto): Promise<ReturnRequestEntity> {
    const returnRequest = await this.getAndValidateVendorReturn(id, storeId);
    this.assertStatusTransition(returnRequest.status, 'received');

    const updated = await this.returnRepository.updateReturnRequest(id, {
      status: 'received',
      vendor_response: dto.vendor_response || returnRequest.vendor_response,
    });

    if (dto.restockable !== undefined) {
      await this.returnRepository.updateReturnItems(id, { restockable: dto.restockable });
    }

    await this.invalidateCache(id);

    this.logger.log(`Return items received: ${returnRequest.request_number}`);
    return updated!;
  }

  // ── Admin: List All Returns ──

  async getAdminReturns(query: AdminReturnQueryDto) {
    const result = await this.returnRepository.findAllAdmin(query);
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

  // ── Admin: Escalate Return ──

  async escalateReturn(id: string, dto: AdminReturnActionDto): Promise<ReturnRequestEntity> {
    const returnRequest = await this.returnRepository.findById(id);
    if (!returnRequest) {
      throw new NotFoundException(`Return request with id ${id} not found`);
    }
    this.assertStatusTransition(returnRequest.status, 'escalated');

    const updated = await this.returnRepository.updateReturnRequest(id, {
      status: 'escalated',
      admin_notes: dto.admin_notes || null,
    });

    await this.invalidateCache(id);

    await this.kafkaProducer.publish(
      'daltaners.returns.events',
      'com.daltaners.returns.escalated',
      {
        return_request_id: id,
        request_number: returnRequest.request_number,
        order_id: returnRequest.order_id,
        customer_id: returnRequest.customer_id,
        store_id: returnRequest.store_id,
      },
      id,
    );

    this.logger.log(`Return request escalated: ${returnRequest.request_number}`);
    return updated!;
  }

  // ── Admin: Override Approve ──

  async overrideApprove(id: string, dto: AdminReturnActionDto): Promise<ReturnRequestEntity> {
    const returnRequest = await this.returnRepository.findById(id);
    if (!returnRequest) {
      throw new NotFoundException(`Return request with id ${id} not found`);
    }

    if (!['pending', 'denied', 'escalated'].includes(returnRequest.status)) {
      throw new BadRequestException(`Cannot override approve return in status '${returnRequest.status}'`);
    }

    const refundAmount = dto.refund_amount ?? returnRequest.refund_amount;

    const updated = await this.returnRepository.updateReturnRequest(id, {
      status: 'approved',
      admin_notes: dto.admin_notes || null,
      refund_amount: refundAmount,
    });

    await this.invalidateCache(id);

    await this.kafkaProducer.publish(
      'daltaners.returns.events',
      'com.daltaners.returns.approved',
      {
        return_request_id: id,
        request_number: returnRequest.request_number,
        order_id: returnRequest.order_id,
        customer_id: returnRequest.customer_id,
        store_id: returnRequest.store_id,
        refund_amount: refundAmount,
        override: true,
        items: returnRequest.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          restockable: item.restockable,
        })),
      },
      id,
    );

    this.logger.log(`Return request override approved by admin: ${returnRequest.request_number}`);
    return updated!;
  }

  // ── Admin: Override Deny ──

  async overrideDeny(id: string, dto: AdminReturnActionDto): Promise<ReturnRequestEntity> {
    const returnRequest = await this.returnRepository.findById(id);
    if (!returnRequest) {
      throw new NotFoundException(`Return request with id ${id} not found`);
    }

    if (!['pending', 'approved', 'escalated'].includes(returnRequest.status)) {
      throw new BadRequestException(`Cannot override deny return in status '${returnRequest.status}'`);
    }

    const updated = await this.returnRepository.updateReturnRequest(id, {
      status: 'denied',
      admin_notes: dto.admin_notes || null,
    });

    await this.invalidateCache(id);

    this.logger.log(`Return request override denied by admin: ${returnRequest.request_number}`);
    return updated!;
  }

  // ── Admin: Get Return Stats ──

  async getReturnStats(dateFrom?: string, dateTo?: string) {
    const stats = await this.returnRepository.getReturnStats(dateFrom, dateTo);
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Helpers ──

  private async generateRequestNumber(): Promise<string> {
    const prefix = 'RET';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const requestNumber = `${prefix}-${timestamp}-${random}`;

    const exists = await this.returnRepository.requestNumberExists(requestNumber);
    if (exists) {
      return this.generateRequestNumber();
    }
    return requestNumber;
  }

  private assertAccess(returnRequest: ReturnRequestEntity, userId?: string, userRole?: string): void {
    if (!userId || !userRole) return;
    if (userRole === 'admin') return;
    if (userRole === 'customer' && returnRequest.customer_id !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async getAndValidateVendorReturn(id: string, storeId: string): Promise<ReturnRequestEntity> {
    const returnRequest = await this.returnRepository.findById(id);
    if (!returnRequest) {
      throw new NotFoundException(`Return request with id ${id} not found`);
    }
    if (returnRequest.store_id !== storeId) {
      throw new ForbiddenException('This return request does not belong to your store');
    }
    return returnRequest;
  }

  private assertStatusTransition(currentStatus: string, targetStatus: string): void {
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition return from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed?.join(', ') || 'none'}`,
      );
    }
  }

  private async invalidateCache(id: string): Promise<void> {
    await this.redisService.del(`${RETURN_CACHE_PREFIX}${id}`);
  }
}
