import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

// ── Types ──────────────────────────────────────────────

export type PricingRuleType = 'time_based' | 'happy_hour' | 'flash_sale' | 'bulk_discount' | 'scheduled_price';
export type PricingDiscountType = 'percentage' | 'fixed_amount' | 'price_override';
export type PricingAppliesTo = 'all_products' | 'specific_products' | 'category' | 'brand';
export type PricingRuleStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'cancelled';
export type PriceChangeType = 'manual' | 'rule_applied' | 'rule_expired' | 'bulk_update' | 'csv_import' | 'scheduled';

export interface PricingSchedule {
  days_of_week?: number[];
  start_time?: string;
  end_time?: string;
}

export interface PricingConditions {
  min_quantity?: number;
  max_quantity?: number;
  min_order_value?: number;
}

export interface PricingRule {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  rule_type: PricingRuleType;
  discount_type: PricingDiscountType;
  discount_value: number;
  applies_to: PricingAppliesTo;
  applies_to_ids: string[] | null;
  schedule: PricingSchedule | null;
  conditions: PricingConditions;
  start_date: string;
  end_date: string | null;
  priority: number;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  status: PricingRuleStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PriceHistoryEntry {
  id: string;
  product_id: string;
  store_id: string;
  old_base_price: number | null;
  new_base_price: number | null;
  old_sale_price: number | null;
  new_sale_price: number | null;
  change_type: PriceChangeType;
  rule_id: string | null;
  changed_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
  product_name?: string;
  rule_name?: string;
}

export interface PricingStats {
  total: number;
  draft: number;
  scheduled: number;
  active: number;
  paused: number;
  expired: number;
  cancelled: number;
}

export interface EffectivePrice {
  product_id: string;
  base_price: number;
  effective_price: number;
  discount_amount: number;
  applied_rule: {
    id: string;
    name: string;
    rule_type: string;
    discount_type: string;
    discount_value: number;
  } | null;
}

export interface PricingRuleFilters {
  search?: string;
  rule_type?: PricingRuleType | 'all';
  status?: PricingRuleStatus | 'all';
  page?: number;
  limit?: number;
}

export interface PriceHistoryFilters {
  change_type?: PriceChangeType | 'all';
  page?: number;
  limit?: number;
}

export interface CreatePricingRuleData {
  name: string;
  description?: string;
  rule_type: PricingRuleType;
  discount_type: PricingDiscountType;
  discount_value: number;
  applies_to: PricingAppliesTo;
  applies_to_ids?: string[];
  schedule?: PricingSchedule;
  conditions?: PricingConditions;
  start_date: string;
  end_date?: string;
  priority?: number;
  max_uses?: number;
}

// ── Label / Color Constants ─────────────────────────────

export const RULE_TYPE_LABELS: Record<PricingRuleType, string> = {
  time_based: 'Time-Based',
  happy_hour: 'Happy Hour',
  flash_sale: 'Flash Sale',
  bulk_discount: 'Bulk Discount',
  scheduled_price: 'Scheduled Price',
};

export const DISCOUNT_TYPE_LABELS: Record<PricingDiscountType, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed Amount',
  price_override: 'Price Override',
};

export const APPLIES_TO_LABELS: Record<PricingAppliesTo, string> = {
  all_products: 'All Products',
  specific_products: 'Specific Products',
  category: 'Category',
  brand: 'Brand',
};

export const RULE_STATUS_LABELS: Record<PricingRuleStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  active: 'Active',
  paused: 'Paused',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const RULE_STATUS_COLORS: Record<PricingRuleStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const CHANGE_TYPE_LABELS: Record<PriceChangeType, string> = {
  manual: 'Manual',
  rule_applied: 'Rule Applied',
  rule_expired: 'Rule Expired',
  bulk_update: 'Bulk Update',
  csv_import: 'CSV Import',
  scheduled: 'Scheduled',
};

export const RULE_TYPE_COLORS: Record<PricingRuleType, string> = {
  time_based: 'bg-indigo-100 text-indigo-700',
  happy_hour: 'bg-orange-100 text-orange-700',
  flash_sale: 'bg-red-100 text-red-700',
  bulk_discount: 'bg-purple-100 text-purple-700',
  scheduled_price: 'bg-blue-100 text-blue-700',
};

// ── Queries ─────────────────────────────────────────────

export function usePricingRules(filters: PricingRuleFilters = {}) {
  return useQuery({
    queryKey: ['vendor-pricing-rules', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.rule_type && filters.rule_type !== 'all') params.set('rule_type', filters.rule_type);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get<ApiResponse<PricingRule[]>>(
        `/catalog/pricing-rules?${params.toString()}`,
      );
      return data;
    },
  });
}

export function usePricingRule(id: string | null) {
  return useQuery({
    queryKey: ['vendor-pricing-rule', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PricingRule>>(
        `/catalog/pricing-rules/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function usePricingStats() {
  return useQuery({
    queryKey: ['vendor-pricing-stats'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PricingStats>>(
        '/catalog/pricing-rules/stats',
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useStorePriceHistory(filters: PriceHistoryFilters = {}) {
  return useQuery({
    queryKey: ['vendor-price-history', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.change_type && filters.change_type !== 'all') params.set('change_type', filters.change_type);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get<ApiResponse<PriceHistoryEntry[]>>(
        `/catalog/pricing/store/history?${params.toString()}`,
      );
      return data;
    },
  });
}

// ── Mutations ───────────────────────────────────────────

export function useCreatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ruleData: CreatePricingRuleData) => {
      const { data } = await api.post<ApiResponse<PricingRule>>(
        '/catalog/pricing-rules',
        ruleData,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-pricing-rules'] });
      qc.invalidateQueries({ queryKey: ['vendor-pricing-stats'] });
    },
  });
}

export function useUpdatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...ruleData }: Partial<CreatePricingRuleData> & { id: string }) => {
      const { data } = await api.patch<ApiResponse<PricingRule>>(
        `/catalog/pricing-rules/${id}`,
        ruleData,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-pricing-rules'] });
      qc.invalidateQueries({ queryKey: ['vendor-pricing-stats'] });
    },
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalog/pricing-rules/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-pricing-rules'] });
      qc.invalidateQueries({ queryKey: ['vendor-pricing-stats'] });
    },
  });
}

export function useActivatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ApiResponse<PricingRule>>(
        `/catalog/pricing-rules/${id}/activate`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-pricing-rules'] });
      qc.invalidateQueries({ queryKey: ['vendor-pricing-stats'] });
    },
  });
}

export function usePausePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ApiResponse<PricingRule>>(
        `/catalog/pricing-rules/${id}/pause`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-pricing-rules'] });
      qc.invalidateQueries({ queryKey: ['vendor-pricing-stats'] });
    },
  });
}

export function useCancelPricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ApiResponse<PricingRule>>(
        `/catalog/pricing-rules/${id}/cancel`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-pricing-rules'] });
      qc.invalidateQueries({ queryKey: ['vendor-pricing-stats'] });
    },
  });
}

export function useApplyPricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<{ rule_id: string; products_affected: number }>>(
        `/catalog/pricing-rules/${id}/apply`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-pricing-rules'] });
      qc.invalidateQueries({ queryKey: ['vendor-price-history'] });
    },
  });
}

export function useRevertPricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<{ rule_id: string; products_affected: number }>>(
        `/catalog/pricing-rules/${id}/revert`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-pricing-rules'] });
      qc.invalidateQueries({ queryKey: ['vendor-price-history'] });
    },
  });
}
