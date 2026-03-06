import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Types (snake_case — admin panel convention) ──

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
  penalty_type: PenaltyType;
  penalty_value: number;
  suspension_days: number;
  auto_detect: boolean;
  max_violations: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PolicyViolation {
  id: string;
  violation_number: string;
  store_id: string;
  store_name?: string;
  rule_id: string | null;
  rule_code?: string;
  rule_name?: string;
  category: PolicyCategory;
  severity: PolicySeverity;
  status: ViolationStatus;
  subject: string;
  description: string;
  evidence_urls: string[];
  detected_by: DetectedBy;
  detected_by_user_id: string | null;
  penalty_type: PenaltyType | null;
  penalty_value: number;
  penalty_applied_at: string | null;
  penalty_expires_at: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  appeals?: Appeal[];
}

export interface Appeal {
  id: string;
  appeal_number: string;
  violation_id: string;
  store_id: string;
  store_name?: string;
  status: AppealStatus;
  reason: string;
  evidence_urls: string[];
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  violation?: PolicyViolation;
}

export interface ViolationStats {
  total: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
}

export interface AppealStats {
  total: number;
  by_status: Record<string, number>;
  approval_rate: number;
}

// ── Filter interfaces ──

interface RulesFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: PolicyCategory;
  severity?: PolicySeverity;
  is_active?: boolean;
}

interface ViolationsFilters {
  page?: number;
  limit?: number;
  search?: string;
  store_id?: string;
  status?: ViolationStatus;
  category?: PolicyCategory;
  severity?: PolicySeverity;
  detected_by?: DetectedBy;
}

interface AppealsFilters {
  page?: number;
  limit?: number;
  search?: string;
  store_id?: string;
  status?: AppealStatus;
}

// ── Response interfaces ──

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface SingleResponse<T> {
  success: boolean;
  data: T;
}

// ── Policy Rules hooks ──

export function useAdminPolicyRules(filters: RulesFilters = {}) {
  const { page = 1, limit = 20, search, category, severity, is_active } = filters;

  return useQuery({
    queryKey: ['admin', 'policy-rules', { page, limit, search, category, severity, is_active }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (severity) params.set('severity', severity);
      if (is_active !== undefined) params.set('is_active', String(is_active));

      const response = await api.get<PaginatedResponse<PolicyRule>>(`/admin/policy/rules?${params.toString()}`);
      return response.data;
    },
  });
}

export function useAdminPolicyRule(id: string) {
  return useQuery({
    queryKey: ['admin', 'policy-rule', id],
    queryFn: async () => {
      const response = await api.get<SingleResponse<PolicyRule>>(`/admin/policy/rules/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useCreatePolicyRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      code: string;
      name: string;
      description?: string;
      category: PolicyCategory;
      severity: PolicySeverity;
      penalty_type: PenaltyType;
      penalty_value?: number;
      suspension_days?: number;
      auto_detect?: boolean;
      max_violations?: number;
    }) => {
      const response = await api.post<SingleResponse<PolicyRule>>('/admin/policy/rules', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'policy-rules'] });
    },
  });
}

export function useUpdatePolicyRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<PolicyRule>) => {
      const response = await api.patch<SingleResponse<PolicyRule>>(`/admin/policy/rules/${id}`, data);
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'policy-rules'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'policy-rule', variables.id] });
    },
  });
}

// ── Violations hooks ──

export function useAdminViolations(filters: ViolationsFilters = {}) {
  const { page = 1, limit = 20, search, store_id, status, category, severity, detected_by } = filters;

  return useQuery({
    queryKey: ['admin', 'violations', { page, limit, search, store_id, status, category, severity, detected_by }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (store_id) params.set('store_id', store_id);
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (severity) params.set('severity', severity);
      if (detected_by) params.set('detected_by', detected_by);

      const response = await api.get<PaginatedResponse<PolicyViolation>>(`/admin/policy/violations?${params.toString()}`);
      return response.data;
    },
  });
}

export function useAdminViolation(id: string) {
  return useQuery({
    queryKey: ['admin', 'violation', id],
    queryFn: async () => {
      const response = await api.get<SingleResponse<PolicyViolation>>(`/admin/policy/violations/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useViolationStats() {
  return useQuery({
    queryKey: ['admin', 'violations', 'stats'],
    queryFn: async () => {
      const response = await api.get<SingleResponse<ViolationStats>>('/admin/policy/violations/stats');
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      store_id: string;
      rule_id?: string;
      category: PolicyCategory;
      severity: PolicySeverity;
      subject: string;
      description: string;
      evidence_urls?: string[];
      detected_by?: DetectedBy;
    }) => {
      const response = await api.post<SingleResponse<PolicyViolation>>('/admin/policy/violations', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'violations'] });
    },
  });
}

export function useReviewViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<SingleResponse<PolicyViolation>>(`/admin/policy/violations/${id}/review`);
      return response.data.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'violations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'violation', id] });
    },
  });
}

export function useApplyPenalty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      penalty_type,
      penalty_value,
      suspension_days,
      notes,
    }: {
      id: string;
      penalty_type: PenaltyType;
      penalty_value?: number;
      suspension_days?: number;
      notes?: string;
    }) => {
      const response = await api.patch<SingleResponse<PolicyViolation>>(`/admin/policy/violations/${id}/penalty`, {
        penalty_type,
        penalty_value,
        suspension_days,
        notes,
      });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'violations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'violation', variables.id] });
    },
  });
}

export function useResolveViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resolution_notes }: { id: string; resolution_notes: string }) => {
      const response = await api.patch<SingleResponse<PolicyViolation>>(`/admin/policy/violations/${id}/resolve`, { resolution_notes });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'violations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'violation', variables.id] });
    },
  });
}

export function useDismissViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resolution_notes }: { id: string; resolution_notes: string }) => {
      const response = await api.patch<SingleResponse<PolicyViolation>>(`/admin/policy/violations/${id}/dismiss`, { resolution_notes });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'violations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'violation', variables.id] });
    },
  });
}

// ── Appeals hooks ──

export function useAdminAppeals(filters: AppealsFilters = {}) {
  const { page = 1, limit = 20, search, store_id, status } = filters;

  return useQuery({
    queryKey: ['admin', 'appeals', { page, limit, search, store_id, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (store_id) params.set('store_id', store_id);
      if (status) params.set('status', status);

      const response = await api.get<PaginatedResponse<Appeal>>(`/admin/policy/appeals?${params.toString()}`);
      return response.data;
    },
  });
}

export function useAdminAppeal(id: string) {
  return useQuery({
    queryKey: ['admin', 'appeal', id],
    queryFn: async () => {
      const response = await api.get<SingleResponse<Appeal>>(`/admin/policy/appeals/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useAppealStats() {
  return useQuery({
    queryKey: ['admin', 'appeals', 'stats'],
    queryFn: async () => {
      const response = await api.get<SingleResponse<AppealStats>>('/admin/policy/appeals/stats');
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useReviewAppeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes: string }) => {
      const response = await api.patch<SingleResponse<Appeal>>(`/admin/policy/appeals/${id}/review`, { admin_notes });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'appeals'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'appeal', variables.id] });
    },
  });
}

export function useApproveAppeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes?: string }) => {
      const response = await api.patch<SingleResponse<Appeal>>(`/admin/policy/appeals/${id}/approve`, { admin_notes });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'appeals'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'appeal', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'violations'] });
    },
  });
}

export function useDenyAppeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes: string }) => {
      const response = await api.patch<SingleResponse<Appeal>>(`/admin/policy/appeals/${id}/deny`, { admin_notes });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'appeals'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'appeal', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'violations'] });
    },
  });
}

export function useEscalateAppeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<SingleResponse<Appeal>>(`/admin/policy/appeals/${id}/escalate`);
      return response.data.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'appeals'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'appeal', id] });
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

export const VIOLATION_STATUS_COLORS: Record<ViolationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  under_review: 'bg-purple-100 text-purple-800',
  appealed: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
  penalty_applied: 'bg-red-100 text-red-800',
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

export const SEVERITY_COLORS: Record<PolicySeverity, string> = {
  warning: 'bg-gray-100 text-gray-700',
  minor: 'bg-blue-100 text-blue-700',
  major: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export const PENALTY_TYPE_LABELS: Record<PenaltyType, string> = {
  warning: 'Warning',
  suspension: 'Suspension',
  fine: 'Fine',
  termination: 'Termination',
};

export const DETECTED_BY_LABELS: Record<DetectedBy, string> = {
  system: 'System',
  admin: 'Admin',
  customer_report: 'Customer Report',
};

export const APPEAL_STATUS_LABELS: Record<AppealStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  denied: 'Denied',
  escalated: 'Escalated',
};

export const APPEAL_STATUS_COLORS: Record<AppealStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  escalated: 'bg-orange-100 text-orange-800',
};
