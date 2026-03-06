import { useQuery } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

export interface SettlementSummary {
  total_earned: number;
  total_paid_out: number;
  total_pending: number;
  total_commission: number;
  settlement_count: number;
}

export interface Settlement {
  id: string;
  vendor_id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  withholding_tax: number;
  adjustment_amount: number;
  final_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_reference: string | null;
  settlement_date: string | null;
  created_at: string;
}

export interface SettlementFilters {
  status?: string;
  period_start?: string;
  period_end?: string;
  page?: number;
  limit?: number;
}

export function useSettlementSummary() {
  return useQuery({
    queryKey: ['vendor-settlement-summary'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SettlementSummary>>(
        '/payments/settlements/summary',
      );
      return data.data;
    },
  });
}

export function useSettlements(filters: SettlementFilters = {}) {
  return useQuery({
    queryKey: ['vendor-settlements', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.period_start) params.set('period_start', filters.period_start);
      if (filters.period_end) params.set('period_end', filters.period_end);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get<ApiResponse<Settlement[]>>(
        `/payments/settlements?${params.toString()}`,
      );
      return data;
    },
  });
}

// ── Settlement Detail ──────────────────────────────────────────────

export interface SettlementItem {
  id: string;
  settlement_id: string;
  order_id: string;
  order_number: string;
  subtotal: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  delivered_at: string;
}

export interface SettlementDetail extends Settlement {
  items: SettlementItem[];
  vendor_name?: string;
  order_count?: number;
  notes?: string | null;
  approved_by?: string | null;
}

export function useSettlementDetail(id: string | null) {
  return useQuery({
    queryKey: ['vendor-settlement-detail', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SettlementDetail>>(
        `/payments/settlements/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

// ── Payment Transactions ──────────────────────────────────────────

export interface PaymentTransaction {
  id: string;
  order_id: string;
  user_id: string;
  type: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  gateway_transaction_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export function usePaymentTransactions(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['vendor-payment-transactions', page, limit],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaymentTransaction[]>>(
        `/payments/my?page=${page}&limit=${limit}`,
      );
      return data;
    },
  });
}
