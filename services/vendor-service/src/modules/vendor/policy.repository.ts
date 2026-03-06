import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyRule } from './entities/policy-rule.entity';
import { PolicyViolation, ViolationStatus } from './entities/policy-violation.entity';
import { Appeal } from './entities/appeal.entity';
import { PolicyRuleQueryDto } from './dto/policy-rule.dto';
import { AdminViolationQueryDto, ViolationQueryDto } from './dto/policy-violation.dto';
import { AdminAppealQueryDto, AppealQueryDto } from './dto/appeal.dto';

@Injectable()
export class PolicyRepository {
  constructor(
    @InjectRepository(PolicyRule)
    private readonly ruleRepo: Repository<PolicyRule>,
    @InjectRepository(PolicyViolation)
    private readonly violationRepo: Repository<PolicyViolation>,
    @InjectRepository(Appeal)
    private readonly appealRepo: Repository<Appeal>,
  ) {}

  // ── Policy Rules ──────────────────────────────────────────────

  async createRule(data: Partial<PolicyRule>): Promise<PolicyRule> {
    const rule = this.ruleRepo.create(data);
    return this.ruleRepo.save(rule);
  }

  async findRuleById(id: string): Promise<PolicyRule | null> {
    return this.ruleRepo.findOne({ where: { id } });
  }

  async findRuleByCode(code: string): Promise<PolicyRule | null> {
    return this.ruleRepo.findOne({ where: { code } });
  }

  async updateRule(id: string, data: Partial<PolicyRule>): Promise<PolicyRule | null> {
    await this.ruleRepo.update(id, data);
    return this.findRuleById(id);
  }

  async findAllRules(query: PolicyRuleQueryDto): Promise<{
    items: PolicyRule[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const qb = this.ruleRepo.createQueryBuilder('rule');

    if (query.search) {
      qb.andWhere(
        '(rule.code ILIKE :search OR rule.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.category) {
      qb.andWhere('rule.category = :category', { category: query.category });
    }
    if (query.severity) {
      qb.andWhere('rule.severity = :severity', { severity: query.severity });
    }
    if (query.is_active !== undefined) {
      qb.andWhere('rule.is_active = :is_active', { is_active: query.is_active });
    }

    qb.orderBy('rule.created_at', 'DESC');
    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const items = await qb.getMany();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findActiveRules(): Promise<PolicyRule[]> {
    return this.ruleRepo.find({ where: { is_active: true }, order: { category: 'ASC', severity: 'ASC' } });
  }

  // ── Policy Violations ─────────────────────────────────────────

  async createViolation(data: Partial<PolicyViolation>): Promise<PolicyViolation> {
    const violation = this.violationRepo.create(data);
    return this.violationRepo.save(violation);
  }

  async findViolationById(id: string): Promise<PolicyViolation | null> {
    return this.violationRepo.findOne({
      where: { id },
      relations: ['store', 'rule', 'appeals'],
    });
  }

  async findViolationByNumber(number: string): Promise<PolicyViolation | null> {
    return this.violationRepo.findOne({
      where: { violation_number: number },
      relations: ['store', 'rule', 'appeals'],
    });
  }

  async updateViolation(id: string, data: Partial<PolicyViolation>): Promise<PolicyViolation | null> {
    const { store, rule, appeals, ...updateData } = data as any;
    await this.violationRepo.update(id, updateData);
    return this.findViolationById(id);
  }

  async findViolationsByStore(
    storeId: string,
    query: ViolationQueryDto,
  ): Promise<{
    items: PolicyViolation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.violationRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.rule', 'rule')
      .where('v.store_id = :storeId', { storeId });

    if (query.status) {
      qb.andWhere('v.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('v.category = :category', { category: query.category });
    }
    if (query.severity) {
      qb.andWhere('v.severity = :severity', { severity: query.severity });
    }

    qb.orderBy('v.created_at', 'DESC');
    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const items = await qb.getMany();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllViolationsAdmin(query: AdminViolationQueryDto): Promise<{
    items: PolicyViolation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.violationRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.store', 'store')
      .leftJoinAndSelect('v.rule', 'rule');

    if (query.search) {
      qb.andWhere(
        '(v.violation_number ILIKE :search OR v.subject ILIKE :search OR store.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.store_id) {
      qb.andWhere('v.store_id = :storeId', { storeId: query.store_id });
    }
    if (query.status) {
      qb.andWhere('v.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('v.category = :category', { category: query.category });
    }
    if (query.severity) {
      qb.andWhere('v.severity = :severity', { severity: query.severity });
    }
    if (query.detected_by) {
      qb.andWhere('v.detected_by = :detectedBy', { detectedBy: query.detected_by });
    }

    qb.orderBy('v.created_at', 'DESC');
    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const items = await qb.getMany();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async countViolationsByStore(storeId: string, statuses?: ViolationStatus[]): Promise<number> {
    const qb = this.violationRepo.createQueryBuilder('v')
      .where('v.store_id = :storeId', { storeId });

    if (statuses && statuses.length > 0) {
      qb.andWhere('v.status IN (:...statuses)', { statuses });
    }

    return qb.getCount();
  }

  async countViolationsByStoreAndRule(storeId: string, ruleId: string): Promise<number> {
    return this.violationRepo.count({
      where: { store_id: storeId, rule_id: ruleId },
    });
  }

  async getViolationStats(): Promise<{
    total: number;
    pending: number;
    under_review: number;
    appealed: number;
    resolved: number;
    dismissed: number;
    penalty_applied: number;
    by_severity: Record<string, number>;
    by_category: Record<string, number>;
  }> {
    const total = await this.violationRepo.count();

    const statusCounts = await this.violationRepo
      .createQueryBuilder('v')
      .select('v.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('v.status')
      .getRawMany();

    const severityCounts = await this.violationRepo
      .createQueryBuilder('v')
      .select('v.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('v.severity')
      .getRawMany();

    const categoryCounts = await this.violationRepo
      .createQueryBuilder('v')
      .select('v.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('v.category')
      .getRawMany();

    const statusMap: Record<string, number> = {};
    for (const row of statusCounts) {
      statusMap[row.status] = parseInt(row.count, 10);
    }

    const by_severity: Record<string, number> = {};
    for (const row of severityCounts) {
      by_severity[row.severity] = parseInt(row.count, 10);
    }

    const by_category: Record<string, number> = {};
    for (const row of categoryCounts) {
      by_category[row.category] = parseInt(row.count, 10);
    }

    return {
      total,
      pending: statusMap['pending'] || 0,
      under_review: statusMap['under_review'] || 0,
      appealed: statusMap['appealed'] || 0,
      resolved: statusMap['resolved'] || 0,
      dismissed: statusMap['dismissed'] || 0,
      penalty_applied: statusMap['penalty_applied'] || 0,
      by_severity,
      by_category,
    };
  }

  // ── Appeals ───────────────────────────────────────────────────

  async createAppeal(data: Partial<Appeal>): Promise<Appeal> {
    const appeal = this.appealRepo.create(data);
    return this.appealRepo.save(appeal);
  }

  async findAppealById(id: string): Promise<Appeal | null> {
    return this.appealRepo.findOne({
      where: { id },
      relations: ['violation', 'violation.store', 'violation.rule', 'store'],
    });
  }

  async updateAppeal(id: string, data: Partial<Appeal>): Promise<Appeal | null> {
    const { violation, store, ...updateData } = data as any;
    await this.appealRepo.update(id, updateData);
    return this.findAppealById(id);
  }

  async findAppealsByStore(
    storeId: string,
    query: AppealQueryDto,
  ): Promise<{
    items: Appeal[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.appealRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.violation', 'violation')
      .where('a.store_id = :storeId', { storeId });

    if (query.status) {
      qb.andWhere('a.status = :status', { status: query.status });
    }

    qb.orderBy('a.created_at', 'DESC');
    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const items = await qb.getMany();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllAppealsAdmin(query: AdminAppealQueryDto): Promise<{
    items: Appeal[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.appealRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.violation', 'violation')
      .leftJoinAndSelect('a.store', 'store');

    if (query.search) {
      qb.andWhere(
        '(a.appeal_number ILIKE :search OR store.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.store_id) {
      qb.andWhere('a.store_id = :storeId', { storeId: query.store_id });
    }
    if (query.status) {
      qb.andWhere('a.status = :status', { status: query.status });
    }

    qb.orderBy('a.created_at', 'DESC');
    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const items = await qb.getMany();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findActiveAppealForViolation(violationId: string): Promise<Appeal | null> {
    return this.appealRepo.findOne({
      where: [
        { violation_id: violationId, status: 'pending' as any },
        { violation_id: violationId, status: 'under_review' as any },
        { violation_id: violationId, status: 'escalated' as any },
      ],
    });
  }

  async getAppealStats(): Promise<{
    total: number;
    pending: number;
    under_review: number;
    approved: number;
    denied: number;
    escalated: number;
  }> {
    const total = await this.appealRepo.count();

    const statusCounts = await this.appealRepo
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.status')
      .getRawMany();

    const statusMap: Record<string, number> = {};
    for (const row of statusCounts) {
      statusMap[row.status] = parseInt(row.count, 10);
    }

    return {
      total,
      pending: statusMap['pending'] || 0,
      under_review: statusMap['under_review'] || 0,
      approved: statusMap['approved'] || 0,
      denied: statusMap['denied'] || 0,
      escalated: statusMap['escalated'] || 0,
    };
  }
}
