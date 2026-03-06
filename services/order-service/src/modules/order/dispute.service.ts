import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DisputeRepository } from './dispute.repository';
import { OrderRepository } from './order.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { CreateDisputeDto, CreateDisputeMessageDto } from './dto/create-dispute.dto';
import { DisputeQueryDto, AdminDisputeQueryDto } from './dto/dispute-query.dto';
import {
  VendorRespondDisputeDto,
  EscalateDisputeDto,
  ResolveDisputeDto,
  AdminAssignDisputeDto,
  AdminDisputeMessageDto,
} from './dto/dispute-action.dto';
import { DisputeEntity } from './entities/dispute.entity';
import { DisputeMessageEntity } from './entities/dispute-message.entity';

const DISPUTE_CACHE_PREFIX = 'dispute:';
const DISPUTE_CACHE_TTL = 300; // 5 minutes
const VENDOR_RESPONSE_DEADLINE_HOURS = 48;

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['vendor_response', 'escalated', 'resolved', 'closed'],
  vendor_response: ['customer_reply', 'under_review', 'escalated', 'resolved', 'closed'],
  customer_reply: ['vendor_response', 'under_review', 'escalated', 'resolved', 'closed'],
  under_review: ['escalated', 'resolved', 'closed'],
  escalated: ['under_review', 'resolved', 'closed'],
};

const PRIORITY_MAP: Record<string, string> = {
  order_not_received: 'high',
  unauthorized_charge: 'urgent',
  overcharged: 'high',
  damaged_item: 'medium',
  wrong_item: 'medium',
  item_missing: 'medium',
  quality_issue: 'medium',
  late_delivery: 'low',
  vendor_behavior: 'medium',
  delivery_behavior: 'medium',
  other: 'low',
};

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    private readonly disputeRepository: DisputeRepository,
    private readonly orderRepository: OrderRepository,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ── Customer: Create Dispute ──

  async createDispute(customerId: string, dto: CreateDisputeDto): Promise<DisputeEntity> {
    const order = await this.orderRepository.findOrderById(dto.order_id);
    if (!order) {
      throw new NotFoundException(`Order with id ${dto.order_id} not found`);
    }

    if (order.customer_id !== customerId) {
      throw new ForbiddenException('You can only dispute your own orders');
    }

    // Check for existing active dispute on same order
    const existingDisputes = await this.disputeRepository.findByOrderId(dto.order_id);
    const activeDispute = existingDisputes.find((d) =>
      ['open', 'vendor_response', 'customer_reply', 'under_review', 'escalated'].includes(d.status),
    );
    if (activeDispute) {
      throw new ConflictException(
        `An active dispute (${activeDispute.dispute_number}) already exists for this order`,
      );
    }

    const disputeNumber = await this.generateDisputeNumber();
    const priority = PRIORITY_MAP[dto.category] || 'medium';

    // Set vendor response deadline (48 hours)
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + VENDOR_RESPONSE_DEADLINE_HOURS);

    const dispute = await this.disputeRepository.createDispute(
      {
        dispute_number: disputeNumber,
        order_id: dto.order_id,
        return_request_id: dto.return_request_id || null,
        customer_id: customerId,
        store_id: order.store_id,
        category: dto.category,
        status: 'open',
        priority,
        subject: dto.subject,
        description: dto.description,
        evidence_urls: dto.evidence_urls || [],
        requested_resolution: dto.requested_resolution || 'refund',
        vendor_response_deadline: deadline,
      },
      {
        sender_id: customerId,
        sender_role: 'customer',
        message: dto.description,
        attachments: dto.evidence_urls || [],
        is_internal: false,
      },
    );

    await this.kafkaProducer.publish(
      'daltaners.disputes.events',
      'com.daltaners.disputes.created',
      {
        dispute_id: dispute.id,
        dispute_number: dispute.dispute_number,
        order_id: dispute.order_id,
        customer_id: dispute.customer_id,
        store_id: dispute.store_id,
        category: dispute.category,
        priority,
        vendor_response_deadline: deadline.toISOString(),
      },
      dispute.id,
    );

    this.logger.log(`Dispute created: ${disputeNumber} for order ${order.order_number}`);
    return dispute;
  }

  // ── Customer: Get My Disputes ──

  async getCustomerDisputes(customerId: string, query: DisputeQueryDto) {
    const result = await this.disputeRepository.findByCustomerId(customerId, query);
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

  // ── Customer: Get Dispute Detail ──

  async getDisputeById(id: string, userId?: string, userRole?: string): Promise<DisputeEntity> {
    const cacheKey = `${DISPUTE_CACHE_PREFIX}${id}`;
    const cached = await this.redisService.getJson<DisputeEntity>(cacheKey);
    if (cached) {
      this.assertAccess(cached, userId, userRole);
      return cached;
    }

    // Admin gets all messages (including internal); others get public only
    let dispute: DisputeEntity | null;
    if (userRole === 'admin') {
      dispute = await this.disputeRepository.findById(id);
    } else {
      dispute = await this.disputeRepository.findByIdWithPublicMessages(id);
    }

    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${id} not found`);
    }

    this.assertAccess(dispute, userId, userRole);

    await this.redisService.setJson(cacheKey, dispute, DISPUTE_CACHE_TTL);
    return dispute;
  }

  // ── Customer: Add Message to Dispute ──

  async addCustomerMessage(disputeId: string, customerId: string, dto: CreateDisputeMessageDto): Promise<DisputeMessageEntity> {
    const dispute = await this.disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${disputeId} not found`);
    }

    if (dispute.customer_id !== customerId) {
      throw new ForbiddenException('You can only add messages to your own disputes');
    }

    if (['resolved', 'closed'].includes(dispute.status)) {
      throw new BadRequestException('Cannot add messages to a resolved or closed dispute');
    }

    const message = await this.disputeRepository.addMessage({
      dispute_id: disputeId,
      sender_id: customerId,
      sender_role: 'customer',
      message: dto.message,
      attachments: dto.attachments || [],
      is_internal: false,
    });

    // Update status to customer_reply if vendor had responded
    if (dispute.status === 'vendor_response') {
      await this.disputeRepository.updateDispute(disputeId, { status: 'customer_reply' });
    }

    await this.invalidateCache(disputeId);

    this.logger.log(`Customer message added to dispute ${dispute.dispute_number}`);
    return message;
  }

  // ── Customer: Escalate Dispute ──

  async customerEscalate(disputeId: string, customerId: string, dto: EscalateDisputeDto): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${disputeId} not found`);
    }

    if (dispute.customer_id !== customerId) {
      throw new ForbiddenException('You can only escalate your own disputes');
    }

    this.assertStatusTransition(dispute.status, 'escalated');

    const updated = await this.disputeRepository.updateDispute(disputeId, {
      status: 'escalated',
      escalated_at: new Date(),
      escalation_reason: dto.escalation_reason || 'Customer requested escalation',
    });

    // Add system message
    await this.disputeRepository.addMessage({
      dispute_id: disputeId,
      sender_id: customerId,
      sender_role: 'system',
      message: `Dispute escalated by customer. Reason: ${dto.escalation_reason || 'Customer requested escalation'}`,
      is_internal: false,
    });

    await this.invalidateCache(disputeId);

    await this.kafkaProducer.publish(
      'daltaners.disputes.events',
      'com.daltaners.disputes.escalated',
      {
        dispute_id: disputeId,
        dispute_number: dispute.dispute_number,
        order_id: dispute.order_id,
        customer_id: dispute.customer_id,
        store_id: dispute.store_id,
        escalation_reason: dto.escalation_reason || 'Customer requested escalation',
      },
      disputeId,
    );

    this.logger.log(`Dispute escalated by customer: ${dispute.dispute_number}`);
    return updated!;
  }

  // ── Vendor: Get Store Disputes ──

  async getVendorDisputes(storeId: string, query: DisputeQueryDto) {
    const result = await this.disputeRepository.findByStoreId(storeId, query);
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

  // ── Vendor: Respond to Dispute ──

  async vendorRespond(disputeId: string, storeId: string, vendorUserId: string, dto: VendorRespondDisputeDto): Promise<DisputeEntity> {
    const dispute = await this.getAndValidateVendorDispute(disputeId, storeId);

    if (['resolved', 'closed'].includes(dispute.status)) {
      throw new BadRequestException('Cannot respond to a resolved or closed dispute');
    }

    await this.disputeRepository.addMessage({
      dispute_id: disputeId,
      sender_id: vendorUserId,
      sender_role: 'vendor',
      message: dto.message,
      is_internal: false,
    });

    // Update status to vendor_response if currently open or customer_reply
    if (['open', 'customer_reply'].includes(dispute.status)) {
      await this.disputeRepository.updateDispute(disputeId, { status: 'vendor_response' });
    }

    await this.invalidateCache(disputeId);

    await this.kafkaProducer.publish(
      'daltaners.disputes.events',
      'com.daltaners.disputes.vendor_responded',
      {
        dispute_id: disputeId,
        dispute_number: dispute.dispute_number,
        order_id: dispute.order_id,
        customer_id: dispute.customer_id,
        store_id: dispute.store_id,
      },
      disputeId,
    );

    this.logger.log(`Vendor responded to dispute: ${dispute.dispute_number}`);
    return (await this.disputeRepository.findById(disputeId))!;
  }

  // ── Admin: List All Disputes ──

  async getAdminDisputes(query: AdminDisputeQueryDto) {
    const result = await this.disputeRepository.findAllAdmin(query);
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

  // ── Admin: Get Dispute Stats ──

  async getDisputeStats(dateFrom?: string, dateTo?: string) {
    const stats = await this.disputeRepository.getDisputeStats(dateFrom, dateTo);
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Admin: Assign Dispute ──

  async assignDispute(disputeId: string, dto: AdminAssignDisputeDto): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${disputeId} not found`);
    }

    if (['resolved', 'closed'].includes(dispute.status)) {
      throw new BadRequestException('Cannot assign a resolved or closed dispute');
    }

    const updated = await this.disputeRepository.updateDispute(disputeId, {
      admin_assigned_to: dto.admin_id,
      status: dispute.status === 'escalated' || dispute.status === 'open' ? 'under_review' : dispute.status,
    });

    await this.disputeRepository.addMessage({
      dispute_id: disputeId,
      sender_id: dto.admin_id,
      sender_role: 'system',
      message: 'Dispute assigned to admin for review.',
      is_internal: true,
    });

    await this.invalidateCache(disputeId);

    this.logger.log(`Dispute ${dispute.dispute_number} assigned to admin ${dto.admin_id}`);
    return updated!;
  }

  // ── Admin: Add Message (with internal note option) ──

  async addAdminMessage(disputeId: string, adminId: string, dto: AdminDisputeMessageDto): Promise<DisputeMessageEntity> {
    const dispute = await this.disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${disputeId} not found`);
    }

    const message = await this.disputeRepository.addMessage({
      dispute_id: disputeId,
      sender_id: adminId,
      sender_role: 'admin',
      message: dto.message,
      is_internal: dto.is_internal || false,
    });

    await this.invalidateCache(disputeId);

    this.logger.log(`Admin message added to dispute ${dispute.dispute_number} (internal: ${dto.is_internal || false})`);
    return message;
  }

  // ── Admin: Escalate Dispute ──

  async adminEscalate(disputeId: string, adminId: string, dto: EscalateDisputeDto): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${disputeId} not found`);
    }

    this.assertStatusTransition(dispute.status, 'escalated');

    const updated = await this.disputeRepository.updateDispute(disputeId, {
      status: 'escalated',
      escalated_at: new Date(),
      escalation_reason: dto.escalation_reason || 'Admin escalation',
    });

    await this.disputeRepository.addMessage({
      dispute_id: disputeId,
      sender_id: adminId,
      sender_role: 'system',
      message: `Dispute escalated by admin. Reason: ${dto.escalation_reason || 'Admin escalation'}`,
      is_internal: false,
    });

    await this.invalidateCache(disputeId);

    await this.kafkaProducer.publish(
      'daltaners.disputes.events',
      'com.daltaners.disputes.escalated',
      {
        dispute_id: disputeId,
        dispute_number: dispute.dispute_number,
        order_id: dispute.order_id,
        customer_id: dispute.customer_id,
        store_id: dispute.store_id,
        escalation_reason: dto.escalation_reason || 'Admin escalation',
      },
      disputeId,
    );

    this.logger.log(`Dispute escalated by admin: ${dispute.dispute_number}`);
    return updated!;
  }

  // ── Admin: Resolve Dispute ──

  async resolveDispute(disputeId: string, adminId: string, dto: ResolveDisputeDto): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${disputeId} not found`);
    }

    if (['resolved', 'closed'].includes(dispute.status)) {
      throw new BadRequestException(`Dispute is already ${dispute.status}`);
    }

    const updated = await this.disputeRepository.updateDispute(disputeId, {
      status: 'resolved',
      resolution_type: dto.resolution_type,
      resolution_amount: dto.resolution_amount ?? 0,
      resolution_notes: dto.resolution_notes || null,
      resolved_by: adminId,
      resolved_at: new Date(),
    });

    await this.disputeRepository.addMessage({
      dispute_id: disputeId,
      sender_id: adminId,
      sender_role: 'system',
      message: `Dispute resolved. Resolution: ${dto.resolution_type}${dto.resolution_amount ? ` (Amount: ${dto.resolution_amount})` : ''}. ${dto.resolution_notes || ''}`.trim(),
      is_internal: false,
    });

    await this.invalidateCache(disputeId);

    await this.kafkaProducer.publish(
      'daltaners.disputes.events',
      'com.daltaners.disputes.resolved',
      {
        dispute_id: disputeId,
        dispute_number: dispute.dispute_number,
        order_id: dispute.order_id,
        customer_id: dispute.customer_id,
        store_id: dispute.store_id,
        resolution_type: dto.resolution_type,
        resolution_amount: dto.resolution_amount ?? 0,
        resolved_by: adminId,
      },
      disputeId,
    );

    this.logger.log(`Dispute resolved: ${dispute.dispute_number} — ${dto.resolution_type}`);
    return updated!;
  }

  // ── Admin: Close Dispute ──

  async closeDispute(disputeId: string, adminId: string): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${disputeId} not found`);
    }

    if (dispute.status === 'closed') {
      throw new BadRequestException('Dispute is already closed');
    }

    const updated = await this.disputeRepository.updateDispute(disputeId, {
      status: 'closed',
    });

    await this.disputeRepository.addMessage({
      dispute_id: disputeId,
      sender_id: adminId,
      sender_role: 'system',
      message: 'Dispute closed by admin.',
      is_internal: false,
    });

    await this.invalidateCache(disputeId);

    this.logger.log(`Dispute closed: ${dispute.dispute_number}`);
    return updated!;
  }

  // ── Auto-Escalation: Check for overdue disputes (48h no vendor response) ──

  async autoEscalateOverdueDisputes(): Promise<number> {
    const overdueDisputes = await this.disputeRepository.findOverdueDisputes();

    let escalatedCount = 0;
    for (const dispute of overdueDisputes) {
      try {
        await this.disputeRepository.updateDispute(dispute.id, {
          status: 'escalated',
          escalated_at: new Date(),
          escalation_reason: `Auto-escalated: Vendor did not respond within ${VENDOR_RESPONSE_DEADLINE_HOURS} hours`,
        });

        await this.disputeRepository.addMessage({
          dispute_id: dispute.id,
          sender_id: dispute.customer_id, // system-initiated
          sender_role: 'system',
          message: `This dispute has been automatically escalated because the vendor did not respond within ${VENDOR_RESPONSE_DEADLINE_HOURS} hours.`,
          is_internal: false,
        });

        await this.invalidateCache(dispute.id);

        await this.kafkaProducer.publish(
          'daltaners.disputes.events',
          'com.daltaners.disputes.auto_escalated',
          {
            dispute_id: dispute.id,
            dispute_number: dispute.dispute_number,
            order_id: dispute.order_id,
            customer_id: dispute.customer_id,
            store_id: dispute.store_id,
            escalation_reason: `Vendor did not respond within ${VENDOR_RESPONSE_DEADLINE_HOURS} hours`,
          },
          dispute.id,
        );

        escalatedCount++;
        this.logger.log(`Auto-escalated dispute: ${dispute.dispute_number}`);
      } catch (error) {
        this.logger.error(`Failed to auto-escalate dispute ${dispute.dispute_number}: ${(error as Error).message}`);
      }
    }

    if (escalatedCount > 0) {
      this.logger.log(`Auto-escalation complete: ${escalatedCount} disputes escalated`);
    }

    return escalatedCount;
  }

  // ── Get Messages ──

  async getDisputeMessages(disputeId: string, userId: string, userRole: string): Promise<DisputeMessageEntity[]> {
    const dispute = await this.disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${disputeId} not found`);
    }

    this.assertAccess(dispute, userId, userRole);

    const includeInternal = userRole === 'admin';
    return this.disputeRepository.getMessages(disputeId, includeInternal);
  }

  // ── Helpers ──

  private async generateDisputeNumber(): Promise<string> {
    const prefix = 'DIS';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const disputeNumber = `${prefix}-${timestamp}-${random}`;

    const exists = await this.disputeRepository.disputeNumberExists(disputeNumber);
    if (exists) {
      return this.generateDisputeNumber();
    }
    return disputeNumber;
  }

  private assertAccess(dispute: DisputeEntity, userId?: string, userRole?: string): void {
    if (!userId || !userRole) return;
    if (userRole === 'admin') return;
    if (userRole === 'customer' && dispute.customer_id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    // Vendor access: check store_id via vendorId (store_id in JWT)
    if ((userRole === 'vendor_owner' || userRole === 'vendor_staff') && dispute.store_id !== userId) {
      // vendorId is passed as userId for vendor routes — checked in controller
    }
  }

  private async getAndValidateVendorDispute(id: string, storeId: string): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findById(id);
    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${id} not found`);
    }
    if (dispute.store_id !== storeId) {
      throw new ForbiddenException('This dispute does not belong to your store');
    }
    return dispute;
  }

  private assertStatusTransition(currentStatus: string, targetStatus: string): void {
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition dispute from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed?.join(', ') || 'none'}`,
      );
    }
  }

  private async invalidateCache(id: string): Promise<void> {
    await this.redisService.del(`${DISPUTE_CACHE_PREFIX}${id}`);
  }
}
