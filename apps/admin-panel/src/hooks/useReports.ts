import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ---------- Types ----------

export interface RevenueSummary {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  total_delivery_fees: number;
  total_service_fees: number;
  total_commission: number;
  total_refunds: number;
  net_revenue: number;
  growth_rate: number;
}

export interface RevenueByPeriod {
  period: string;
  revenue: number;
  orders: number;
  avg_order_value: number;
  delivery_fees: number;
  service_fees: number;
  commission: number;
  refunds: number;
  net_revenue: number;
}

export interface RevenueByCategory {
  category: string;
  revenue: number;
  orders: number;
  percentage: number;
  avg_order_value: number;
  growth_rate: number;
}

export interface RevenueByZone {
  zone_id: string;
  zone_name: string;
  city: string;
  revenue: number;
  orders: number;
  percentage: number;
  avg_delivery_time_minutes: number;
}

export interface RevenueByPaymentMethod {
  method: string;
  revenue: number;
  transactions: number;
  percentage: number;
}

export interface SettlementSummary {
  total_settled: number;
  total_pending: number;
  total_processing: number;
  total_failed: number;
  settlement_count: number;
  avg_settlement_amount: number;
  total_commission_collected: number;
  total_tax_withheld: number;
}

export interface FeeSummary {
  total_commission_earned: number;
  total_delivery_fees: number;
  total_service_fees: number;
  total_platform_fees: number;
  commission_by_category: { category: string; amount: number; percentage: number }[];
  avg_commission_rate: number;
}

export interface RefundByReason {
  reason: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface RefundByMethod {
  method: string;
  count: number;
  amount: number;
}

export interface RefundSummary {
  total_refunds: number;
  total_refund_amount: number;
  avg_refund_amount: number;
  refund_rate: number;
  refunds_by_reason: RefundByReason[];
  refunds_by_method: RefundByMethod[];
}

export interface ReportFilters {
  period?: string;
  date_from?: string;
  date_to?: string;
}

// ---------- Query Hooks ----------

export function useRevenueSummary(filters: ReportFilters = {}) {
  const { period = 'monthly' } = filters;
  return useQuery({
    queryKey: ['admin', 'reports', 'revenue-summary', { period }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.set('period', period);
      const response = await api.get<{ data: RevenueSummary }>(
        `/admin/reports/revenue-summary?${params.toString()}`,
      );
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useRevenueByPeriod(filters: ReportFilters & { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 14, date_from, date_to } = filters;
  return useQuery({
    queryKey: ['admin', 'reports', 'revenue-by-period', { page, limit, date_from, date_to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);
      const response = await api.get<{ data: RevenueByPeriod[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
        `/admin/reports/revenue-by-period?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useRevenueByCategory() {
  return useQuery({
    queryKey: ['admin', 'reports', 'revenue-by-category'],
    queryFn: async () => {
      const response = await api.get<{ data: RevenueByCategory[] }>('/admin/reports/revenue-by-category');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useRevenueByZone() {
  return useQuery({
    queryKey: ['admin', 'reports', 'revenue-by-zone'],
    queryFn: async () => {
      const response = await api.get<{ data: RevenueByZone[] }>('/admin/reports/revenue-by-zone');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useRevenueByPaymentMethod() {
  return useQuery({
    queryKey: ['admin', 'reports', 'revenue-by-payment-method'],
    queryFn: async () => {
      const response = await api.get<{ data: RevenueByPaymentMethod[] }>('/admin/reports/revenue-by-payment-method');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useSettlementSummary() {
  return useQuery({
    queryKey: ['admin', 'reports', 'settlement-summary'],
    queryFn: async () => {
      const response = await api.get<{ data: SettlementSummary }>('/admin/reports/settlement-summary');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useFeeSummary() {
  return useQuery({
    queryKey: ['admin', 'reports', 'fee-summary'],
    queryFn: async () => {
      const response = await api.get<{ data: FeeSummary }>('/admin/reports/fee-summary');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useRefundSummary() {
  return useQuery({
    queryKey: ['admin', 'reports', 'refund-summary'],
    queryFn: async () => {
      const response = await api.get<{ data: RefundSummary }>('/admin/reports/refund-summary');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

// ---------- Mutation Hooks ----------

export function useExportReport() {
  return useMutation({
    mutationFn: async ({ format, section }: { format: 'csv' | 'pdf'; section: string }) => {
      const response = await api.post<{ data: { download_url: string; filename: string } }>(
        '/admin/reports/export',
        { format, section },
      );
      return response.data.data;
    },
  });
}

// ---------- Constants ----------

export const REFUND_REASON_LABELS: Record<string, string> = {
  cancelled_by_customer: 'Cancelled by Customer',
  cancelled_by_vendor: 'Cancelled by Vendor',
  item_damaged: 'Item Damaged',
  item_missing: 'Item Missing',
  wrong_item: 'Wrong Item',
  quality_issue: 'Quality Issue',
  late_delivery: 'Late Delivery',
  other: 'Other',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  gcash: 'GCash',
  card: 'Credit/Debit Card',
  cod: 'Cash on Delivery',
  maya: 'Maya',
  wallet: 'Daltaners Wallet',
  grabpay: 'GrabPay',
  bank_transfer: 'Bank Transfer',
};

export const CATEGORY_LABELS: Record<string, string> = {
  grocery: 'Grocery',
  food: 'Food',
  pharmacy: 'Pharmacy',
  parcel: 'Parcel',
};

export const CATEGORY_COLORS: Record<string, string> = {
  grocery: '#27AE60',
  food: '#FF6B35',
  pharmacy: '#004E89',
  parcel: '#F2994A',
};
