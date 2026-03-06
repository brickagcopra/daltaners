import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PolicyService } from '../policy.service';
import { PolicyRepository } from '../policy.repository';
import { VendorRepository } from '../vendor.repository';
import { KafkaProducerService } from '../kafka-producer.service';
import { RedisService } from '../../../config/redis.service';
import { PolicyRule, PolicyCategory, PolicySeverity, PenaltyType } from '../entities/policy-rule.entity';
import { PolicyViolation, ViolationStatus, DetectedBy } from '../entities/policy-violation.entity';
import { Appeal, AppealStatus } from '../entities/appeal.entity';
import { StoreStatus } from '../entities/store.entity';

describe('PolicyService', () => {
  let service: PolicyService;
  let policyRepo: jest.Mocked<PolicyRepository>;
  let vendorRepo: jest.Mocked<VendorRepository>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;
  let redis: jest.Mocked<RedisService>;

  const adminId = 'admin-uuid-1';
  const storeId = 'store-uuid-1';

  const mockRule: Partial<PolicyRule> = {
    id: 'rule-uuid-1',
    code: 'LATE_DELIVERY',
    name: 'Late Delivery Violation',
    description: 'Vendor consistently delivers late',
    category: PolicyCategory.DELIVERY,
    severity: PolicySeverity.MINOR,
    penalty_type: PenaltyType.WARNING,
    penalty_value: 0,
    suspension_days: 0,
    auto_detect: false,
    max_violations: 3,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockViolation: Partial<PolicyViolation> = {
    id: 'violation-uuid-1',
    violation_number: 'VIO-2026-100001',
    store_id: storeId,
    rule_id: 'rule-uuid-1',
    category: PolicyCategory.DELIVERY,
    severity: PolicySeverity.MINOR,
    status: ViolationStatus.PENDING,
    subject: 'Late delivery pattern detected',
    description: 'Multiple orders delivered beyond ETA',
    evidence_urls: [],
    detected_by: DetectedBy.ADMIN,
    detected_by_user_id: adminId,
    penalty_type: PenaltyType.WARNING,
    penalty_value: 0,
    penalty_applied_at: null,
    penalty_expires_at: null,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAppeal: Partial<Appeal> = {
    id: 'appeal-uuid-1',
    appeal_number: 'APL-2026-100001',
    violation_id: 'violation-uuid-1',
    store_id: storeId,
    status: AppealStatus.PENDING,
    reason: 'The late deliveries were caused by typhoon',
    evidence_urls: [],
    admin_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    violation: mockViolation as PolicyViolation,
  };

  const mockStore = {
    id: storeId,
    name: 'Test Store',
    status: StoreStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyService,
        {
          provide: PolicyRepository,
          useValue: {
            createRule: jest.fn(),
            findRuleById: jest.fn(),
            findRuleByCode: jest.fn(),
            updateRule: jest.fn(),
            findAllRules: jest.fn(),
            findActiveRules: jest.fn(),
            createViolation: jest.fn(),
            findViolationById: jest.fn(),
            findViolationByNumber: jest.fn(),
            updateViolation: jest.fn(),
            findViolationsByStore: jest.fn(),
            findAllViolationsAdmin: jest.fn(),
            countViolationsByStore: jest.fn(),
            countViolationsByStoreAndRule: jest.fn(),
            getViolationStats: jest.fn(),
            createAppeal: jest.fn(),
            findAppealById: jest.fn(),
            updateAppeal: jest.fn(),
            findAppealsByStore: jest.fn(),
            findAllAppealsAdmin: jest.fn(),
            findActiveAppealForViolation: jest.fn(),
            getAppealStats: jest.fn(),
          },
        },
        {
          provide: VendorRepository,
          useValue: {
            findStoreById: jest.fn(),
            updateStoreStatus: jest.fn(),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PolicyService>(PolicyService);
    policyRepo = module.get(PolicyRepository);
    vendorRepo = module.get(VendorRepository);
    kafkaProducer = module.get(KafkaProducerService);
    redis = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Policy Rules ──────────────────────────────────────────────

  describe('createRule', () => {
    it('should create a policy rule', async () => {
      policyRepo.findRuleByCode.mockResolvedValue(null);
      policyRepo.createRule.mockResolvedValue(mockRule as PolicyRule);

      const result = await service.createRule({
        code: 'LATE_DELIVERY',
        name: 'Late Delivery Violation',
        category: 'delivery',
        severity: 'minor',
        penalty_type: 'warning',
      });

      expect(result).toEqual(mockRule);
      expect(policyRepo.createRule).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate code', async () => {
      policyRepo.findRuleByCode.mockResolvedValue(mockRule as PolicyRule);

      await expect(
        service.createRule({
          code: 'LATE_DELIVERY',
          name: 'Late Delivery Violation',
          category: 'delivery',
          severity: 'minor',
          penalty_type: 'warning',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const updatedRule = { ...mockRule, name: 'Updated Name' };
      policyRepo.findRuleById.mockResolvedValue(mockRule as PolicyRule);
      policyRepo.updateRule.mockResolvedValue(updatedRule as PolicyRule);

      const result = await service.updateRule('rule-uuid-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      policyRepo.findRuleById.mockResolvedValue(null);

      await expect(
        service.updateRule('non-existent', { name: 'Updated Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRuleById', () => {
    it('should return a rule by ID', async () => {
      policyRepo.findRuleById.mockResolvedValue(mockRule as PolicyRule);

      const result = await service.getRuleById('rule-uuid-1');
      expect(result).toEqual(mockRule);
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      policyRepo.findRuleById.mockResolvedValue(null);

      await expect(service.getRuleById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listRules', () => {
    it('should return paginated rules', async () => {
      const mockResult = { items: [mockRule], total: 1, page: 1, limit: 20, totalPages: 1 };
      policyRepo.findAllRules.mockResolvedValue(mockResult as any);

      const result = await service.listRules({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });
  });

  // ── Violations ────────────────────────────────────────────────

  describe('createViolation', () => {
    it('should create a violation for a valid store', async () => {
      vendorRepo.findStoreById.mockResolvedValue(mockStore as any);
      policyRepo.findRuleById.mockResolvedValue(mockRule as PolicyRule);
      policyRepo.countViolationsByStoreAndRule.mockResolvedValue(0);
      policyRepo.createViolation.mockResolvedValue(mockViolation as PolicyViolation);

      const result = await service.createViolation(
        {
          store_id: storeId,
          rule_id: 'rule-uuid-1',
          category: 'delivery',
          severity: 'minor',
          subject: 'Late delivery pattern detected',
          description: 'Multiple orders delivered beyond ETA',
        },
        adminId,
      );

      expect(result).toEqual(mockViolation);
      expect(kafkaProducer.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid store', async () => {
      vendorRepo.findStoreById.mockResolvedValue(null);

      await expect(
        service.createViolation(
          {
            store_id: 'invalid-store',
            category: 'delivery',
            severity: 'minor',
            subject: 'Test',
            description: 'Test',
          },
          adminId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for invalid rule_id', async () => {
      vendorRepo.findStoreById.mockResolvedValue(mockStore as any);
      policyRepo.findRuleById.mockResolvedValue(null);

      await expect(
        service.createViolation(
          {
            store_id: storeId,
            rule_id: 'invalid-rule',
            category: 'delivery',
            severity: 'minor',
            subject: 'Test',
            description: 'Test',
          },
          adminId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should inherit penalty defaults from rule when not overridden', async () => {
      const fineRule = { ...mockRule, penalty_type: PenaltyType.FINE, penalty_value: 500 };
      vendorRepo.findStoreById.mockResolvedValue(mockStore as any);
      policyRepo.findRuleById.mockResolvedValue(fineRule as PolicyRule);
      policyRepo.countViolationsByStoreAndRule.mockResolvedValue(0);
      policyRepo.createViolation.mockImplementation(async (data) => ({
        ...mockViolation,
        ...data,
      } as PolicyViolation));

      await service.createViolation(
        {
          store_id: storeId,
          rule_id: 'rule-uuid-1',
          category: 'delivery',
          severity: 'minor',
          subject: 'Test',
          description: 'Test',
        },
        adminId,
      );

      expect(policyRepo.createViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          penalty_type: PenaltyType.FINE,
          penalty_value: 500,
        }),
      );
    });
  });

  describe('acknowledgeViolation', () => {
    it('should acknowledge a pending violation', async () => {
      const pendingViolation = { ...mockViolation, status: ViolationStatus.PENDING };
      policyRepo.findViolationById.mockResolvedValue(pendingViolation as PolicyViolation);
      policyRepo.updateViolation.mockResolvedValue({
        ...pendingViolation,
        status: ViolationStatus.ACKNOWLEDGED,
      } as PolicyViolation);

      const result = await service.acknowledgeViolation('violation-uuid-1', storeId);
      expect(result.status).toBe(ViolationStatus.ACKNOWLEDGED);
    });

    it('should throw BadRequestException for non-pending violation', async () => {
      const resolvedViolation = { ...mockViolation, status: ViolationStatus.RESOLVED };
      policyRepo.findViolationById.mockResolvedValue(resolvedViolation as PolicyViolation);

      await expect(
        service.acknowledgeViolation('violation-uuid-1', storeId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for wrong store', async () => {
      policyRepo.findViolationById.mockResolvedValue(mockViolation as PolicyViolation);

      await expect(
        service.acknowledgeViolation('violation-uuid-1', 'other-store-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyPenalty', () => {
    it('should apply warning penalty', async () => {
      const pendingViolation = { ...mockViolation, status: ViolationStatus.PENDING };
      policyRepo.findViolationById.mockResolvedValue(pendingViolation as PolicyViolation);
      policyRepo.updateViolation.mockResolvedValue({
        ...pendingViolation,
        status: ViolationStatus.PENALTY_APPLIED,
        penalty_type: PenaltyType.WARNING,
      } as PolicyViolation);

      const result = await service.applyPenalty(
        'violation-uuid-1',
        { penalty_type: 'warning' },
        adminId,
      );

      expect(result.status).toBe(ViolationStatus.PENALTY_APPLIED);
    });

    it('should suspend store when suspension penalty applied', async () => {
      const pendingViolation = { ...mockViolation, status: ViolationStatus.PENDING };
      policyRepo.findViolationById.mockResolvedValue(pendingViolation as PolicyViolation);
      policyRepo.updateViolation.mockResolvedValue({
        ...pendingViolation,
        status: ViolationStatus.PENALTY_APPLIED,
      } as PolicyViolation);

      await service.applyPenalty(
        'violation-uuid-1',
        { penalty_type: 'suspension', suspension_days: 7 },
        adminId,
      );

      expect(vendorRepo.updateStoreStatus).toHaveBeenCalledWith(
        storeId,
        StoreStatus.SUSPENDED,
        expect.any(Object),
      );
    });

    it('should close store when termination penalty applied', async () => {
      const pendingViolation = { ...mockViolation, status: ViolationStatus.PENDING };
      policyRepo.findViolationById.mockResolvedValue(pendingViolation as PolicyViolation);
      policyRepo.updateViolation.mockResolvedValue({
        ...pendingViolation,
        status: ViolationStatus.PENALTY_APPLIED,
      } as PolicyViolation);

      await service.applyPenalty(
        'violation-uuid-1',
        { penalty_type: 'termination' },
        adminId,
      );

      expect(vendorRepo.updateStoreStatus).toHaveBeenCalledWith(
        storeId,
        StoreStatus.CLOSED,
        expect.any(Object),
      );
    });

    it('should throw BadRequestException for resolved violation', async () => {
      const resolvedViolation = { ...mockViolation, status: ViolationStatus.RESOLVED };
      policyRepo.findViolationById.mockResolvedValue(resolvedViolation as PolicyViolation);

      await expect(
        service.applyPenalty('violation-uuid-1', { penalty_type: 'warning' }, adminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveViolation', () => {
    it('should resolve a pending violation', async () => {
      policyRepo.findViolationById.mockResolvedValue(mockViolation as PolicyViolation);
      policyRepo.updateViolation.mockResolvedValue({
        ...mockViolation,
        status: ViolationStatus.RESOLVED,
      } as PolicyViolation);

      const result = await service.resolveViolation(
        'violation-uuid-1',
        { resolution_notes: 'Issue addressed by vendor' },
        adminId,
      );

      expect(result.status).toBe(ViolationStatus.RESOLVED);
      expect(kafkaProducer.publish).toHaveBeenCalled();
    });

    it('should throw for already resolved violation', async () => {
      const resolved = { ...mockViolation, status: ViolationStatus.RESOLVED };
      policyRepo.findViolationById.mockResolvedValue(resolved as PolicyViolation);

      await expect(
        service.resolveViolation(
          'violation-uuid-1',
          { resolution_notes: 'Test' },
          adminId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dismissViolation', () => {
    it('should dismiss a pending violation', async () => {
      policyRepo.findViolationById.mockResolvedValue(mockViolation as PolicyViolation);
      policyRepo.updateViolation.mockResolvedValue({
        ...mockViolation,
        status: ViolationStatus.DISMISSED,
      } as PolicyViolation);

      const result = await service.dismissViolation(
        'violation-uuid-1',
        { resolution_notes: 'False positive' },
        adminId,
      );

      expect(result.status).toBe(ViolationStatus.DISMISSED);
    });

    it('should throw for penalty_applied violation', async () => {
      const penalized = { ...mockViolation, status: ViolationStatus.PENALTY_APPLIED };
      policyRepo.findViolationById.mockResolvedValue(penalized as PolicyViolation);

      await expect(
        service.dismissViolation(
          'violation-uuid-1',
          { resolution_notes: 'Test' },
          adminId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getViolationStats', () => {
    it('should return cached stats', async () => {
      const mockStats = { total: 10, pending: 3, resolved: 5 };
      redis.get.mockResolvedValue(JSON.stringify(mockStats));

      const result = await service.getViolationStats();
      expect(result).toEqual(mockStats);
      expect(policyRepo.getViolationStats).not.toHaveBeenCalled();
    });

    it('should compute and cache stats on cache miss', async () => {
      const mockStats = {
        total: 10,
        pending: 3,
        under_review: 2,
        appealed: 1,
        resolved: 3,
        dismissed: 1,
        penalty_applied: 0,
        by_severity: { warning: 5 },
        by_category: { delivery: 3 },
      };
      redis.get.mockResolvedValue(null);
      policyRepo.getViolationStats.mockResolvedValue(mockStats);

      const result = await service.getViolationStats();
      expect(result).toEqual(mockStats);
      expect(redis.set).toHaveBeenCalled();
    });
  });

  // ── Appeals ───────────────────────────────────────────────────

  describe('createAppeal', () => {
    it('should create an appeal for a pending violation', async () => {
      policyRepo.findViolationById.mockResolvedValue(mockViolation as PolicyViolation);
      policyRepo.findActiveAppealForViolation.mockResolvedValue(null);
      policyRepo.createAppeal.mockResolvedValue(mockAppeal as Appeal);
      policyRepo.updateViolation.mockResolvedValue({
        ...mockViolation,
        status: ViolationStatus.APPEALED,
      } as PolicyViolation);

      const result = await service.createAppeal(
        'violation-uuid-1',
        storeId,
        { reason: 'The late deliveries were caused by typhoon' },
      );

      expect(result).toEqual(mockAppeal);
      expect(policyRepo.updateViolation).toHaveBeenCalledWith(
        'violation-uuid-1',
        expect.objectContaining({ status: ViolationStatus.APPEALED }),
      );
    });

    it('should throw NotFoundException for wrong store', async () => {
      policyRepo.findViolationById.mockResolvedValue(mockViolation as PolicyViolation);

      await expect(
        service.createAppeal('violation-uuid-1', 'other-store', { reason: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for resolved violation', async () => {
      const resolved = { ...mockViolation, status: ViolationStatus.RESOLVED };
      policyRepo.findViolationById.mockResolvedValue(resolved as PolicyViolation);

      await expect(
        service.createAppeal('violation-uuid-1', storeId, { reason: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for existing active appeal', async () => {
      policyRepo.findViolationById.mockResolvedValue(mockViolation as PolicyViolation);
      policyRepo.findActiveAppealForViolation.mockResolvedValue(mockAppeal as Appeal);

      await expect(
        service.createAppeal('violation-uuid-1', storeId, { reason: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('approveAppeal', () => {
    it('should approve a pending appeal and dismiss violation', async () => {
      const pendingAppeal = {
        ...mockAppeal,
        status: AppealStatus.PENDING,
        violation: { ...mockViolation, penalty_type: null } as PolicyViolation,
      };
      policyRepo.findAppealById.mockResolvedValue(pendingAppeal as Appeal);
      policyRepo.updateAppeal.mockResolvedValue({
        ...pendingAppeal,
        status: AppealStatus.APPROVED,
      } as Appeal);
      policyRepo.updateViolation.mockResolvedValue({
        ...mockViolation,
        status: ViolationStatus.DISMISSED,
      } as PolicyViolation);

      const result = await service.approveAppeal(
        'appeal-uuid-1',
        { admin_notes: 'Valid reason' },
        adminId,
      );

      expect(result.status).toBe(AppealStatus.APPROVED);
      expect(policyRepo.updateViolation).toHaveBeenCalledWith(
        'violation-uuid-1',
        expect.objectContaining({ status: ViolationStatus.DISMISSED }),
      );
    });

    it('should reactivate suspended store on appeal approval', async () => {
      const suspensionViolation = {
        ...mockViolation,
        penalty_type: PenaltyType.SUSPENSION,
        penalty_applied_at: new Date(),
      };
      const pendingAppeal = {
        ...mockAppeal,
        status: AppealStatus.PENDING,
        violation: suspensionViolation as PolicyViolation,
      };
      policyRepo.findAppealById.mockResolvedValue(pendingAppeal as Appeal);
      policyRepo.updateAppeal.mockResolvedValue({
        ...pendingAppeal,
        status: AppealStatus.APPROVED,
      } as Appeal);
      policyRepo.updateViolation.mockResolvedValue({} as PolicyViolation);
      vendorRepo.findStoreById.mockResolvedValue({
        ...mockStore,
        status: StoreStatus.SUSPENDED,
      } as any);

      await service.approveAppeal(
        'appeal-uuid-1',
        { admin_notes: 'Valid' },
        adminId,
      );

      expect(vendorRepo.updateStoreStatus).toHaveBeenCalledWith(
        storeId,
        StoreStatus.ACTIVE,
        expect.any(Object),
      );
    });

    it('should throw for already approved appeal', async () => {
      const approved = { ...mockAppeal, status: AppealStatus.APPROVED };
      policyRepo.findAppealById.mockResolvedValue(approved as Appeal);

      await expect(
        service.approveAppeal('appeal-uuid-1', { admin_notes: 'Test' }, adminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('denyAppeal', () => {
    it('should deny a pending appeal and revert violation status', async () => {
      const pendingAppeal = { ...mockAppeal, status: AppealStatus.PENDING };
      policyRepo.findAppealById.mockResolvedValue(pendingAppeal as Appeal);
      policyRepo.updateAppeal.mockResolvedValue({
        ...pendingAppeal,
        status: AppealStatus.DENIED,
      } as Appeal);
      policyRepo.updateViolation.mockResolvedValue({
        ...mockViolation,
        status: ViolationStatus.UNDER_REVIEW,
      } as PolicyViolation);

      const result = await service.denyAppeal(
        'appeal-uuid-1',
        { admin_notes: 'Insufficient evidence' },
        adminId,
      );

      expect(result.status).toBe(AppealStatus.DENIED);
      expect(policyRepo.updateViolation).toHaveBeenCalledWith(
        'violation-uuid-1',
        expect.objectContaining({ status: ViolationStatus.UNDER_REVIEW }),
      );
    });
  });

  describe('escalateAppeal', () => {
    it('should escalate a pending appeal', async () => {
      const pendingAppeal = { ...mockAppeal, status: AppealStatus.PENDING };
      policyRepo.findAppealById.mockResolvedValue(pendingAppeal as Appeal);
      policyRepo.updateAppeal.mockResolvedValue({
        ...pendingAppeal,
        status: AppealStatus.ESCALATED,
      } as Appeal);

      const result = await service.escalateAppeal('appeal-uuid-1', adminId);
      expect(result.status).toBe(AppealStatus.ESCALATED);
    });

    it('should throw for denied appeal', async () => {
      const denied = { ...mockAppeal, status: AppealStatus.DENIED };
      policyRepo.findAppealById.mockResolvedValue(denied as Appeal);

      await expect(
        service.escalateAppeal('appeal-uuid-1', adminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewAppeal', () => {
    it('should move pending appeal to under_review', async () => {
      const pendingAppeal = { ...mockAppeal, status: AppealStatus.PENDING };
      policyRepo.findAppealById.mockResolvedValue(pendingAppeal as Appeal);
      policyRepo.updateAppeal.mockResolvedValue({
        ...pendingAppeal,
        status: AppealStatus.UNDER_REVIEW,
      } as Appeal);

      const result = await service.reviewAppeal('appeal-uuid-1', adminId);
      expect(result.status).toBe(AppealStatus.UNDER_REVIEW);
    });
  });

  describe('getStoreViolationSummary', () => {
    it('should return store violation summary', async () => {
      policyRepo.countViolationsByStore.mockResolvedValueOnce(10);
      policyRepo.countViolationsByStore.mockResolvedValueOnce(3);
      policyRepo.findAppealsByStore.mockResolvedValue({
        items: [],
        total: 1,
        page: 1,
        limit: 1,
        totalPages: 1,
      });

      const result = await service.getStoreViolationSummary(storeId);

      expect(result.total_violations).toBe(10);
      expect(result.active_violations).toBe(3);
      expect(result.pending_appeals).toBe(1);
    });
  });

  describe('markUnderReview', () => {
    it('should mark pending violation as under review', async () => {
      policyRepo.findViolationById.mockResolvedValue(mockViolation as PolicyViolation);
      policyRepo.updateViolation.mockResolvedValue({
        ...mockViolation,
        status: ViolationStatus.UNDER_REVIEW,
      } as PolicyViolation);

      const result = await service.markUnderReview('violation-uuid-1', adminId);
      expect(result.status).toBe(ViolationStatus.UNDER_REVIEW);
    });

    it('should throw for resolved violation', async () => {
      const resolved = { ...mockViolation, status: ViolationStatus.RESOLVED };
      policyRepo.findViolationById.mockResolvedValue(resolved as PolicyViolation);

      await expect(
        service.markUnderReview('violation-uuid-1', adminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAppealStats', () => {
    it('should return cached appeal stats', async () => {
      const mockStats = { total: 5, pending: 2 };
      redis.get.mockResolvedValue(JSON.stringify(mockStats));

      const result = await service.getAppealStats();
      expect(result).toEqual(mockStats);
    });

    it('should compute and cache appeal stats on miss', async () => {
      redis.get.mockResolvedValue(null);
      const mockStats = {
        total: 5,
        pending: 2,
        under_review: 1,
        approved: 1,
        denied: 1,
        escalated: 0,
      };
      policyRepo.getAppealStats.mockResolvedValue(mockStats);

      const result = await service.getAppealStats();
      expect(result).toEqual(mockStats);
      expect(redis.set).toHaveBeenCalled();
    });
  });
});
