import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Types (snake_case — admin panel convention) ──────────

export interface PricingRule {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  rule_type: string;
  discount_type: string;
  discount_value: number;
  applies_to: string;
  applies_to_ids: string[] | null;
  schedule: { days_of_week?: number[]; start_time?: string; end_time?: string } | null;
  conditions: { min_quantity?: number; max_quantity?: number; min_order_value?: number };
  start_date: string;
  end_date: string | null;
  priority: number;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
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

export interface PriceHistoryEntry {
  id: string;
  product_id: string;
  store_id: string;
  old_base_price: number | null;
  new_base_price: number | null;
  old_sale_price: number | null;
  new_sale_price: number | null;
  change_type: string;
  rule_id: string | null;
  changed_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
  product_name?: string;
  rule_name?: string;
}

export interface AdminPricingFilters {
  search?: string;
  rule_type?: string;
  status?: string;
  store_id?: string;
  page?: number;
  limit?: number;
}

export interface AdminHistoryFilters {
  change_type?: string;
  store_id?: string;
  page?: number;
  limit?: number;
}

// ── Label / Color Constants ─────────────────────────────

export const RULE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  active: 'Active',
  paused: 'Paused',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const RULE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const RULE_TYPE_LABELS: Record<string, string> = {
  time_based: 'Time-Based',
  happy_hour: 'Happy Hour',
  flash_sale: 'Flash Sale',
  bulk_discount: 'Bulk Discount',
  scheduled_price: 'Scheduled Price',
};

export const RULE_TYPE_COLORS: Record<string, string> = {
  time_based: 'bg-indigo-100 text-indigo-700',
  happy_hour: 'bg-orange-100 text-orange-700',
  flash_sale: 'bg-red-100 text-red-700',
  bulk_discount: 'bg-purple-100 text-purple-700',
  scheduled_price: 'bg-blue-100 text-blue-700',
};

export const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed Amount',
  price_override: 'Price Override',
};

export const APPLIES_TO_LABELS: Record<string, string> = {
  all_products: 'All Products',
  specific_products: 'Specific Products',
  category: 'Category',
  brand: 'Brand',
};

export const CHANGE_TYPE_LABELS: Record<string, string> = {
  manual: 'Manual',
  rule_applied: 'Rule Applied',
  rule_expired: 'Rule Expired',
  bulk_update: 'Bulk Update',
  csv_import: 'CSV Import',
  scheduled: 'Scheduled',
};

// ── Queries ─────────────────────────────────────────────

export function useAdminPricingRules(filters: AdminPricingFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'pricing-rules', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.rule_type && filters.rule_type !== 'all') params.set('rule_type', filters.rule_type);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.store_id) params.set('store_id', filters.store_id);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get(
        `/admin/pricing/rules?${params.toString()}`,
      );
      return data;
    },
  });
}

export function useAdminPricingStats() {
  return useQuery({
    queryKey: ['admin', 'pricing-stats'],
    queryFn: async () => {
      const { data } = await api.get(
        '/admin/pricing/stats',
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useAdminPricingRule(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'pricing-rule', id],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/pricing/rules/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useAdminPriceHistory(filters: AdminHistoryFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'price-history', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.change_type && filters.change_type !== 'all') params.set('change_type', filters.change_type);
      if (filters.store_id) params.set('store_id', filters.store_id);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get(
        `/admin/pricing/history?${params.toString()}`,
      );
      return data;
    },
  });
}

// ── Mutations ───────────────────────────────────────────

export function useForceExpirePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(
        `/admin/pricing/rules/${id}/force-expire`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pricing-rules'] });
      qc.invalidateQueries({ queryKey: ['admin', 'pricing-stats'] });
    },
  });
}

export function useForceCancelPricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(
        `/admin/pricing/rules/${id}/force-cancel`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pricing-rules'] });
      qc.invalidateQueries({ queryKey: ['admin', 'pricing-stats'] });
    },
  });
}
