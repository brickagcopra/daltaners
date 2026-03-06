import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

// ── Types ──

export type PolicyCategory =
  | 'quality'
  | 'delivery'
  | 'pricing'
  | 'listing'
  | 'communication'
  | 'fraud'
  | 'compliance'
  | 'safety'
  | 'content'
  | 'other';

export type PolicySeverity = 'warning' | 'minor' | 'major' | 'critical';
export type PenaltyType = 'warning' | 'suspension' | 'fine' | 'termination';

export type ViolationStatus =
  | 'pending'
  | 'acknowledged'
  | 'under_review'
  | 'appealed'
  | 'resolved'
  | 'dismissed'
  | 'penalty_applied';

export type DetectedBy = 'system' | 'admin' | 'customer_report';
export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'denied' | 'escalated';

export interface PolicyRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: PolicyCategory;
  severity: PolicySeverity;
  penaltyType: PenaltyType;
  penaltyValue: number;
  suspensionDays: number;
  autoDetect: boolean;
  maxViolations: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appeal {
  id: string;
  appealNumber: string;
  violationId: string;
  storeId: string;
  storeName?: string;
  status: AppealStatus;
  reason: string;
  evidenceUrls: string[];
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  violation?: Violation;
}

export interface Violation {
  id: string;
  violationNumber: string;
  storeId: string;
  storeName?: string;
  ruleId: string | null;
  ruleCode?: string;
  ruleName?: string;
  category: PolicyCategory;
  severity: PolicySeverity;
  status: ViolationStatus;
  subject: string;
  description: string;
  evidenceUrls: string[];
  detectedBy: DetectedBy;
  detectedByUserId: string | null;
  penaltyType: PenaltyType | null;
  penaltyValue: number;
  penaltyAppliedAt: string | null;
  penaltyExpiresAt: string | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  appeals?: Appeal[];
}

export interface ViolationStats {
  total: number;
  byStatus: Record<ViolationStatus, number>;
  bySeverity: Record<PolicySeverity, number>;
  byCategory: Record<string, number>;
}

// ── Transform helpers ──

function transformRule(r: Record<string, unknown>): PolicyRule {
  return {
    id: r.id as string,
    code: (r.code as string) || '',
    name: (r.name as string) || '',
    description: (r.description as string) || null,
    category: (r.category as PolicyCategory) || 'other',
    severity: (r.severity as PolicySeverity) || 'warning',
    penaltyType: (r.penalty_type as PenaltyType) || 'warning',
    penaltyValue: (r.penalty_value as number) || 0,
    suspensionDays: (r.suspension_days as number) || 0,
    autoDetect: (r.auto_detect as boolean) || false,
    maxViolations: (r.max_violations as number) || 3,
    isActive: r.is_active !== false,
    createdAt: (r.created_at as string) || '',
    updatedAt: (r.updated_at as string) || '',
  };
}

function transformAppeal(a: Record<string, unknown>): Appeal {
  return {
    id: a.id as string,
    appealNumber: (a.appeal_number as string) || '',
    violationId: (a.violation_id as string) || '',
    storeId: (a.store_id as string) || '',
    storeName: (a.store_name as string) || undefined,
    status: (a.status as AppealStatus) || 'pending',
    reason: (a.reason as string) || '',
    evidenceUrls: (a.evidence_urls as string[]) || [],
    adminNotes: (a.admin_notes as string) || null,
    reviewedBy: (a.reviewed_by as string) || null,
    reviewedAt: (a.reviewed_at as string) || null,
    createdAt: (a.created_at as string) || '',
    updatedAt: (a.updated_at as string) || '',
    violation: a.violation ? transformViolation(a.violation as Record<string, unknown>) : undefined,
  };
}

function transformViolation(v: Record<string, unknown>): Violation {
  const rawAppeals = (v.appeals as Record<string, unknown>[]) || [];
  return {
    id: v.id as string,
    violationNumber: (v.violation_number as string) || '',
    storeId: (v.store_id as string) || '',
    storeName: (v.store_name as string) || undefined,
    ruleId: (v.rule_id as string) || null,
    ruleCode: (v.rule_code as string) || undefined,
    ruleName: (v.rule_name as string) || undefined,
    category: (v.category as PolicyCategory) || 'other',
    severity: (v.severity as PolicySeverity) || 'warning',
    status: (v.status as ViolationStatus) || 'pending',
    subject: (v.subject as string) || '',
    description: (v.description as string) || '',
    evidenceUrls: (v.evidence_urls as string[]) || [],
    detectedBy: (v.detected_by as DetectedBy) || 'admin',
    detectedByUserId: (v.detected_by_user_id as string) || null,
    penaltyType: (v.penalty_type as PenaltyType) || null,
    penaltyValue: (v.penalty_value as number) || 0,
    penaltyAppliedAt: (v.penalty_applied_at as string) || null,
    penaltyExpiresAt: (v.penalty_expires_at as string) || null,
    resolutionNotes: (v.resolution_notes as string) || null,
    resolvedBy: (v.resolved_by as string) || null,
    resolvedAt: (v.resolved_at as string) || null,
    createdAt: (v.created_at as string) || '',
    updatedAt: (v.updated_at as string) || '',
    appeals: rawAppeals.map((a) => transformAppeal(a)),
  };
}

function transformStats(s: Record<string, unknown>): ViolationStats {
  return {
    total: (s.total as number) || 0,
    byStatus: (s.by_status as Record<ViolationStatus, number>) || {},
    bySeverity: (s.by_severity as Record<PolicySeverity, number>) || {},
    byCategory: (s.by_category as Record<string, number>) || {},
  };
}

// ── Filter interfaces ──

export interface ViolationFilters {
  page?: number;
  limit?: number;
  status?: ViolationStatus;
  category?: PolicyCategory;
  severity?: PolicySeverity;
}

export interface AppealFilters {
  page?: number;
  limit?: number;
  status?: AppealStatus;
}

// ── Query hooks ──

export function useMyViolations(filters: ViolationFilters = {}) {
  const { page = 1, limit = 20, status, category, severity } = filters;

  return useQuery({
    queryKey: ['vendor-violations', { page, limit, status, category, severity }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (severity) params.set('severity', severity);

      const { data } = await api.get<ApiResponse>(`/vendors/policy/violations?${params.toString()}`);
      const raw = data as Record<string, unknown>;
      const items = (raw.data as Record<string, unknown>[]) || [];
      return {
        data: items.map(transformViolation),
        meta: raw.meta as { page: number; limit: number; total: number; totalPages: number; hasMore: boolean },
      };
    },
    refetchInterval: 30000,
  });
}

export function useMyViolation(violationId: string) {
  return useQuery({
    queryKey: ['vendor-violation', violationId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/vendors/policy/violations/${violationId}`);
      const raw = (data as Record<string, unknown>).data as Record<string, unknown>;
      return transformViolation(raw);
    },
    enabled: !!violationId,
  });
}

export function useMyViolationSummary() {
  return useQuery({
    queryKey: ['vendor-violation-summary'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>('/vendors/policy/summary');
      const raw = (data as Record<string, unknown>).data as Record<string, unknown>;
      return transformStats(raw);
    },
  });
}

export function useMyAppeals(filters: AppealFilters = {}) {
  const { page = 1, limit = 20, status } = filters;

  return useQuery({
    queryKey: ['vendor-appeals', { page, limit, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (status) params.set('status', status);

      const { data } = await api.get<ApiResponse>(`/vendors/policy/appeals?${params.toString()}`);
      const raw = data as Record<string, unknown>;
      const items = (raw.data as Record<string, unknown>[]) || [];
      return {
        data: items.map(transformAppeal),
        meta: raw.meta as { page: number; limit: number; total: number; totalPages: number; hasMore: boolean },
      };
    },
  });
}

export function useMyAppeal(appealId: string) {
  return useQuery({
    queryKey: ['vendor-appeal', appealId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/vendors/policy/appeals/${appealId}`);
      const raw = (data as Record<string, unknown>).data as Record<string, unknown>;
      return transformAppeal(raw);
    },
    enabled: !!appealId,
  });
}

export function usePolicyRules(category?: PolicyCategory) {
  return useQuery({
    queryKey: ['vendor-policy-rules', { category }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (category) params.set('category', category);

      const { data } = await api.get<ApiResponse>(`/vendors/policy/rules?${params.toString()}`);
      const raw = data as Record<string, unknown>;
      const items = (raw.data as Record<string, unknown>[]) || [];
      return items.map(transformRule);
    },
  });
}

// ── Mutation hooks ──

export function useAcknowledgeViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (violationId: string) => {
      const { data } = await api.patch(`/vendors/policy/violations/${violationId}/acknowledge`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-violations'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-violation'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-violation-summary'] });
    },
  });
}

export function useSubmitAppeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      violationId,
      reason,
      evidenceUrls,
    }: {
      violationId: string;
      reason: string;
      evidenceUrls?: string[];
    }) => {
      const { data } = await api.post(`/vendors/policy/violations/${violationId}/appeal`, {
        reason,
        evidence_urls: evidenceUrls || [],
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-violations'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-violation'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-appeals'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-violation-summary'] });
    },
  });
}

// ── Label constants ──

export const VIOLATION_STATUS_LABELS: Record<ViolationStatus, string> = {
  pending: 'Pending',
  acknowledged: 'Acknowledged',
  under_review: 'Under Review',
  appealed: 'Appealed',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
  penalty_applied: 'Penalty Applied',
};

export const POLICY_CATEGORY_LABELS: Record<PolicyCategory, string> = {
  quality: 'Quality',
  delivery: 'Delivery',
  pricing: 'Pricing',
  listing: 'Listing',
  communication: 'Communication',
  fraud: 'Fraud',
  compliance: 'Compliance',
  safety: 'Safety',
  content: 'Content',
  other: 'Other',
};

export const POLICY_SEVERITY_LABELS: Record<PolicySeverity, string> = {
  warning: 'Warning',
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical',
};

export const PENALTY_TYPE_LABELS: Record<PenaltyType, string> = {
  warning: 'Warning',
  suspension: 'Suspension',
  fine: 'Fine',
  termination: 'Termination',
};

export const APPEAL_STATUS_LABELS: Record<AppealStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  denied: 'Denied',
  escalated: 'Escalated',
};

export const DETECTED_BY_LABELS: Record<DetectedBy, string> = {
  system: 'System',
  admin: 'Admin',
  customer_report: 'Customer Report',
};
