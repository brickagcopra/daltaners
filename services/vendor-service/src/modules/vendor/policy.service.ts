import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PolicyRepository } from './policy.repository';
import { KafkaProducerService } from './kafka-producer.service';
import { RedisService } from '../../config/redis.service';
import { VendorRepository } from './vendor.repository';
import { PolicyRule } from './entities/policy-rule.entity';
import { PolicyViolation, ViolationStatus } from './entities/policy-violation.entity';
import { Appeal, AppealStatus } from './entities/appeal.entity';
import { StoreStatus } from './entities/store.entity';
import { PenaltyType } from './entities/policy-rule.entity';
import {
  CreatePolicyRuleDto,
  UpdatePolicyRuleDto,
  PolicyRuleQueryDto,
} from './dto/policy-rule.dto';
import {
  CreateViolationDto,
  ViolationQueryDto,
  AdminViolationQueryDto,
  ApplyPenaltyDto,
  ResolveViolationDto,
  DismissViolationDto,
} from './dto/policy-violation.dto';
import {
  CreateAppealDto,
  AppealQueryDto,
  AdminAppealQueryDto,
  ReviewAppealDto,
  DenyAppealDto,
} from './dto/appeal.dto';

const POLICY_EVENTS_TOPIC = 'daltaners.policy.events';
const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  constructor(
    private readonly policyRepository: PolicyRepository,
    private readonly vendorRepository: VendorRepository,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly redisService: RedisService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────

  private generateViolationNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const seq = Math.floor(Math.random() * 900000) + 100000;
    return `VIO-${year}-${seq}`;
  }

  private generateAppealNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const seq = Math.floor(Math.random() * 900000) + 100000;
    return `APL-${year}-${seq}`;
  }

  private async publishEvent(type: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.kafkaProducer.publish(POLICY_EVENTS_TOPIC, {
        key: (data.store_id as string) || (data.violation_id as string) || uuidv4(),
        value: JSON.stringify({
          specversion: '1.0',
          id: uuidv4(),
          source: 'daltaners/vendor-service',
          type: `com.daltaners.policy.${type}`,
          datacontenttype: 'application/json',
          time: new Date().toISOString(),
          data,
        }),
      });
    } catch (error) {
      this.logger.error(`Failed to publish ${type} event`, (error as Error).stack);
    }
  }

  private async invalidateCache(storeId?: string): Promise<void> {
    try {
      await this.redisService.del('vendor:policy:stats');
      await this.redisService.del('vendor:appeal:stats');
      if (storeId) {
        await this.redisService.del(`vendor:violations:${storeId}`);
        await this.redisService.del(`vendor:appeals:${storeId}`);
      }
    } catch {
      // non-critical
    }
  }

  // ── Policy Rules (Admin) ──────────────────────────────────────

  async createRule(dto: CreatePolicyRuleDto): Promise<PolicyRule> {
    const existing = await this.policyRepository.findRuleByCode(dto.code);
    if (existing) {
      throw new ConflictException(`Policy rule with code '${dto.code}' already exists`);
    }

    const rule = await this.policyRepository.createRule({
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      category: dto.category as any,
      severity: dto.severity as any,
      penalty_type: dto.penalty_type as any,
      penalty_value: dto.penalty_value || 0,
      suspension_days: dto.suspension_days || 0,
      auto_detect: dto.auto_detect || false,
      max_violations: dto.max_violations || 3,
    });

    this.logger.log(`Policy rule created: ${rule.code} (${rule.id})`);
    return rule;
  }

  async updateRule(id: string, dto: UpdatePolicyRuleDto): Promise<PolicyRule> {
    const rule = await this.policyRepository.findRuleById(id);
    if (!rule) {
      throw new NotFoundException('Policy rule not found');
    }

    const updated = await this.policyRepository.updateRule(id, dto as any);
    this.logger.log(`Policy rule updated: ${rule.code} (${id})`);
    return updated!;
  }

  async getRuleById(id: string): Promise<PolicyRule> {
    const rule = await this.policyRepository.findRuleById(id);
    if (!rule) {
      throw new NotFoundException('Policy rule not found');
    }
    return rule;
  }

  async listRules(query: PolicyRuleQueryDto) {
    return this.policyRepository.findAllRules(query);
  }

  async getActiveRules(): Promise<PolicyRule[]> {
    return this.policyRepository.findActiveRules();
  }

  // ── Violations (Admin) ────────────────────────────────────────

  async createViolation(dto: CreateViolationDto, adminId: string): Promise<PolicyViolation> {
    // Verify store exists
    const store = await this.vendorRepository.findStoreById(dto.store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // If rule_id provided, validate and inherit defaults
    let penaltyType = dto.penalty_type;
    let penaltyValue = dto.penalty_value || 0;

    if (dto.rule_id) {
      const rule = await this.policyRepository.findRuleById(dto.rule_id);
      if (!rule) {
        throw new NotFoundException('Policy rule not found');
      }
      if (!penaltyType) {
        penaltyType = rule.penalty_type;
        penaltyValue = rule.penalty_value;
      }

      // Check max violations threshold
      const existingCount = await this.policyRepository.countViolationsByStoreAndRule(
        dto.store_id,
        dto.rule_id,
      );
      if (existingCount >= rule.max_violations) {
        this.logger.warn(
          `Store ${dto.store_id} has exceeded max violations (${rule.max_violations}) for rule ${rule.code}`,
        );
      }
    }

    const violation = await this.policyRepository.createViolation({
      violation_number: this.generateViolationNumber(),
      store_id: dto.store_id,
      rule_id: dto.rule_id || null,
      category: dto.category as any,
      severity: dto.severity as any,
      subject: dto.subject,
      description: dto.description,
      evidence_urls: dto.evidence_urls || [],
      detected_by: (dto.detected_by as any) || 'admin',
      detected_by_user_id: adminId,
      penalty_type: (penaltyType as any) || null,
      penalty_value: penaltyValue,
    });

    await this.invalidateCache(dto.store_id);

    await this.publishEvent('violation_created', {
      violation_id: violation.id,
      violation_number: violation.violation_number,
      store_id: violation.store_id,
      store_name: store.name,
      category: violation.category,
      severity: violation.severity,
      subject: violation.subject,
    });

    this.logger.log(`Violation created: ${violation.violation_number} for store ${store.name}`);
    return violation;
  }

  async getViolation(id: string): Promise<PolicyViolation> {
    const violation = await this.policyRepository.findViolationById(id);
    if (!violation) {
      throw new NotFoundException('Violation not found');
    }
    return violation;
  }

  async listViolationsByStore(storeId: string, query: ViolationQueryDto) {
    return this.policyRepository.findViolationsByStore(storeId, query);
  }

  async listAllViolations(query: AdminViolationQueryDto) {
    return this.policyRepository.findAllViolationsAdmin(query);
  }

  async getViolationStats() {
    const cached = await this.redisService.get('vendor:policy:stats');
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await this.policyRepository.getViolationStats();
    await this.redisService.set('vendor:policy:stats', JSON.stringify(stats), CACHE_TTL);
    return stats;
  }

  async acknowledgeViolation(violationId: string, storeId: string): Promise<PolicyViolation> {
    const violation = await this.getViolation(violationId);
    if (violation.store_id !== storeId) {
      throw new NotFoundException('Violation not found');
    }
    if (violation.status !== ViolationStatus.PENDING) {
      throw new BadRequestException('Only pending violations can be acknowledged');
    }

    const updated = await this.policyRepository.updateViolation(violationId, {
      status: ViolationStatus.ACKNOWLEDGED,
    });

    await this.invalidateCache(storeId);
    return updated!;
  }

  async applyPenalty(
    violationId: string,
    dto: ApplyPenaltyDto,
    adminId: string,
  ): Promise<PolicyViolation> {
    const violation = await this.getViolation(violationId);

    const allowedStatuses = [
      ViolationStatus.PENDING,
      ViolationStatus.ACKNOWLEDGED,
      ViolationStatus.UNDER_REVIEW,
    ];
    if (!allowedStatuses.includes(violation.status)) {
      throw new BadRequestException(
        `Cannot apply penalty to violation with status '${violation.status}'`,
      );
    }

    const now = new Date();
    let penaltyExpiresAt: Date | null = null;

    // Handle suspension: also suspend the store
    if (dto.penalty_type === PenaltyType.SUSPENSION && dto.suspension_days) {
      penaltyExpiresAt = new Date(now.getTime() + dto.suspension_days * 24 * 60 * 60 * 1000);
      await this.vendorRepository.updateStoreStatus(violation.store_id, StoreStatus.SUSPENDED, {
        suspension_reason: `Policy violation: ${violation.violation_number}`,
        suspension_expires_at: penaltyExpiresAt.toISOString(),
      });
    }

    // Handle termination: close the store
    if (dto.penalty_type === PenaltyType.TERMINATION) {
      await this.vendorRepository.updateStoreStatus(violation.store_id, StoreStatus.CLOSED, {
        closure_reason: `Policy violation: ${violation.violation_number}`,
      });
    }

    const updated = await this.policyRepository.updateViolation(violationId, {
      status: ViolationStatus.PENALTY_APPLIED,
      penalty_type: dto.penalty_type as any,
      penalty_value: dto.penalty_value || 0,
      penalty_applied_at: now,
      penalty_expires_at: penaltyExpiresAt,
      resolution_notes: dto.notes || null,
      resolved_by: adminId,
      resolved_at: now,
    });

    await this.invalidateCache(violation.store_id);

    await this.publishEvent('penalty_applied', {
      violation_id: violationId,
      violation_number: violation.violation_number,
      store_id: violation.store_id,
      penalty_type: dto.penalty_type,
      penalty_value: dto.penalty_value || 0,
      suspension_days: dto.suspension_days,
      admin_id: adminId,
    });

    this.logger.log(
      `Penalty applied to violation ${violation.violation_number}: ${dto.penalty_type}`,
    );
    return updated!;
  }

  async resolveViolation(
    violationId: string,
    dto: ResolveViolationDto,
    adminId: string,
  ): Promise<PolicyViolation> {
    const violation = await this.getViolation(violationId);

    const terminalStatuses = [ViolationStatus.RESOLVED, ViolationStatus.DISMISSED];
    if (terminalStatuses.includes(violation.status)) {
      throw new BadRequestException('Violation is already resolved or dismissed');
    }

    const updated = await this.policyRepository.updateViolation(violationId, {
      status: ViolationStatus.RESOLVED,
      resolution_notes: dto.resolution_notes,
      resolved_by: adminId,
      resolved_at: new Date(),
    });

    await this.invalidateCache(violation.store_id);

    await this.publishEvent('violation_resolved', {
      violation_id: violationId,
      violation_number: violation.violation_number,
      store_id: violation.store_id,
      admin_id: adminId,
    });

    return updated!;
  }

  async dismissViolation(
    violationId: string,
    dto: DismissViolationDto,
    adminId: string,
  ): Promise<PolicyViolation> {
    const violation = await this.getViolation(violationId);

    const terminalStatuses = [
      ViolationStatus.RESOLVED,
      ViolationStatus.DISMISSED,
      ViolationStatus.PENALTY_APPLIED,
    ];
    if (terminalStatuses.includes(violation.status)) {
      throw new BadRequestException('Violation is already in a terminal state');
    }

    const updated = await this.policyRepository.updateViolation(violationId, {
      status: ViolationStatus.DISMISSED,
      resolution_notes: dto.resolution_notes,
      resolved_by: adminId,
      resolved_at: new Date(),
    });

    await this.invalidateCache(violation.store_id);

    await this.publishEvent('violation_dismissed', {
      violation_id: violationId,
      violation_number: violation.violation_number,
      store_id: violation.store_id,
      admin_id: adminId,
    });

    return updated!;
  }

  async markUnderReview(violationId: string, adminId: string): Promise<PolicyViolation> {
    const violation = await this.getViolation(violationId);
    if (
      violation.status !== ViolationStatus.PENDING &&
      violation.status !== ViolationStatus.ACKNOWLEDGED &&
      violation.status !== ViolationStatus.APPEALED
    ) {
      throw new BadRequestException(
        `Cannot mark violation with status '${violation.status}' as under review`,
      );
    }

    const updated = await this.policyRepository.updateViolation(violationId, {
      status: ViolationStatus.UNDER_REVIEW,
    });

    await this.invalidateCache(violation.store_id);
    return updated!;
  }

  // ── Appeals (Vendor + Admin) ──────────────────────────────────

  async createAppeal(
    violationId: string,
    storeId: string,
    dto: CreateAppealDto,
  ): Promise<Appeal> {
    const violation = await this.getViolation(violationId);
    if (violation.store_id !== storeId) {
      throw new NotFoundException('Violation not found');
    }

    // Cannot appeal terminal violations
    const terminalStatuses = [ViolationStatus.RESOLVED, ViolationStatus.DISMISSED];
    if (terminalStatuses.includes(violation.status)) {
      throw new BadRequestException('Cannot appeal a resolved or dismissed violation');
    }

    // Check for existing active appeal
    const existingAppeal = await this.policyRepository.findActiveAppealForViolation(violationId);
    if (existingAppeal) {
      throw new ConflictException('An active appeal already exists for this violation');
    }

    const appeal = await this.policyRepository.createAppeal({
      appeal_number: this.generateAppealNumber(),
      violation_id: violationId,
      store_id: storeId,
      reason: dto.reason,
      evidence_urls: dto.evidence_urls || [],
    });

    // Update violation status to appealed
    await this.policyRepository.updateViolation(violationId, {
      status: ViolationStatus.APPEALED,
    });

    await this.invalidateCache(storeId);

    await this.publishEvent('appeal_created', {
      appeal_id: appeal.id,
      appeal_number: appeal.appeal_number,
      violation_id: violationId,
      violation_number: violation.violation_number,
      store_id: storeId,
    });

    this.logger.log(
      `Appeal created: ${appeal.appeal_number} for violation ${violation.violation_number}`,
    );
    return appeal;
  }

  async getAppeal(id: string): Promise<Appeal> {
    const appeal = await this.policyRepository.findAppealById(id);
    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }
    return appeal;
  }

  async listAppealsByStore(storeId: string, query: AppealQueryDto) {
    return this.policyRepository.findAppealsByStore(storeId, query);
  }

  async listAllAppeals(query: AdminAppealQueryDto) {
    return this.policyRepository.findAllAppealsAdmin(query);
  }

  async getAppealStats() {
    const cached = await this.redisService.get('vendor:appeal:stats');
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await this.policyRepository.getAppealStats();
    await this.redisService.set('vendor:appeal:stats', JSON.stringify(stats), CACHE_TTL);
    return stats;
  }

  async approveAppeal(
    appealId: string,
    dto: ReviewAppealDto,
    adminId: string,
  ): Promise<Appeal> {
    const appeal = await this.getAppeal(appealId);
    if (appeal.status !== AppealStatus.PENDING && appeal.status !== AppealStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only pending or under review appeals can be approved');
    }

    const now = new Date();
    const updated = await this.policyRepository.updateAppeal(appealId, {
      status: AppealStatus.APPROVED,
      admin_notes: dto.admin_notes,
      reviewed_by: adminId,
      reviewed_at: now,
    });

    // Dismiss the associated violation
    await this.policyRepository.updateViolation(appeal.violation_id, {
      status: ViolationStatus.DISMISSED,
      resolution_notes: `Appeal approved: ${dto.admin_notes}`,
      resolved_by: adminId,
      resolved_at: now,
    });

    // If store was suspended due to this violation, reactivate it
    if (appeal.violation) {
      const violation = appeal.violation;
      if (
        violation.penalty_type === PenaltyType.SUSPENSION &&
        violation.penalty_applied_at
      ) {
        const store = await this.vendorRepository.findStoreById(violation.store_id);
        if (store && store.status === StoreStatus.SUSPENDED) {
          await this.vendorRepository.updateStoreStatus(
            violation.store_id,
            StoreStatus.ACTIVE,
            { reactivation_reason: `Appeal ${appeal.appeal_number} approved` },
          );
        }
      }
    }

    await this.invalidateCache(appeal.store_id);

    await this.publishEvent('appeal_approved', {
      appeal_id: appealId,
      appeal_number: appeal.appeal_number,
      violation_id: appeal.violation_id,
      store_id: appeal.store_id,
      admin_id: adminId,
    });

    this.logger.log(`Appeal approved: ${appeal.appeal_number}`);
    return updated!;
  }

  async denyAppeal(
    appealId: string,
    dto: DenyAppealDto,
    adminId: string,
  ): Promise<Appeal> {
    const appeal = await this.getAppeal(appealId);
    if (appeal.status !== AppealStatus.PENDING && appeal.status !== AppealStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only pending or under review appeals can be denied');
    }

    const updated = await this.policyRepository.updateAppeal(appealId, {
      status: AppealStatus.DENIED,
      admin_notes: dto.admin_notes,
      reviewed_by: adminId,
      reviewed_at: new Date(),
    });

    // Revert violation status from appealed to under_review
    await this.policyRepository.updateViolation(appeal.violation_id, {
      status: ViolationStatus.UNDER_REVIEW,
    });

    await this.invalidateCache(appeal.store_id);

    await this.publishEvent('appeal_denied', {
      appeal_id: appealId,
      appeal_number: appeal.appeal_number,
      violation_id: appeal.violation_id,
      store_id: appeal.store_id,
      admin_id: adminId,
    });

    this.logger.log(`Appeal denied: ${appeal.appeal_number}`);
    return updated!;
  }

  async escalateAppeal(appealId: string, adminId: string): Promise<Appeal> {
    const appeal = await this.getAppeal(appealId);
    if (appeal.status !== AppealStatus.PENDING && appeal.status !== AppealStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only pending or under review appeals can be escalated');
    }

    const updated = await this.policyRepository.updateAppeal(appealId, {
      status: AppealStatus.ESCALATED,
    });

    await this.invalidateCache(appeal.store_id);

    await this.publishEvent('appeal_escalated', {
      appeal_id: appealId,
      appeal_number: appeal.appeal_number,
      violation_id: appeal.violation_id,
      store_id: appeal.store_id,
      admin_id: adminId,
    });

    return updated!;
  }

  async reviewAppeal(appealId: string, adminId: string): Promise<Appeal> {
    const appeal = await this.getAppeal(appealId);
    if (appeal.status !== AppealStatus.PENDING && appeal.status !== AppealStatus.ESCALATED) {
      throw new BadRequestException('Only pending or escalated appeals can be moved to review');
    }

    const updated = await this.policyRepository.updateAppeal(appealId, {
      status: AppealStatus.UNDER_REVIEW,
    });

    await this.invalidateCache(appeal.store_id);
    return updated!;
  }

  // ── Store Violation Summary ───────────────────────────────────

  async getStoreViolationSummary(storeId: string): Promise<{
    total_violations: number;
    active_violations: number;
    pending_appeals: number;
  }> {
    const totalViolations = await this.policyRepository.countViolationsByStore(storeId);
    const activeViolations = await this.policyRepository.countViolationsByStore(storeId, [
      ViolationStatus.PENDING,
      ViolationStatus.ACKNOWLEDGED,
      ViolationStatus.UNDER_REVIEW,
      ViolationStatus.APPEALED,
    ]);

    const appeals = await this.policyRepository.findAppealsByStore(storeId, {
      status: 'pending',
      page: 1,
      limit: 1,
    });

    return {
      total_violations: totalViolations,
      active_violations: activeViolations,
      pending_appeals: appeals.total,
    };
  }
}
