import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Interfaces ──────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  order_id: string;
  user_id: string;
  type: 'charge' | 'refund';
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  amount: number;
  currency: string;
  gateway_transaction_id: string | null;
  idempotency_key: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

export interface TransactionStats {
  total_transactions: number;
  total_revenue: number;
  total_refunds: number;
  pending_amount: number;
  completed_count: number;
  failed_count: number;
  refund_count: number;
}

export interface Settlement {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  withholding_tax: number;
  adjustment_amount: number;
  final_amount: number;
  order_count?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  notes?: string | null;
  approved_by?: string | null;
  payment_reference: string | null;
  settlement_date: string | null;
  created_at: string;
}

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
}

export interface SettlementStats {
  total_settlements: number;
  total_gross: number;
  total_commission: number;
  total_net: number;
  pending_count: number;
  completed_count: number;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_active: boolean;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export interface WalletStats {
  total_wallets: number;
  active_wallets: number;
  total_balance: number;
  average_balance: number;
}

// ── Filter Interfaces ───────────────────────────────────────────────

interface TransactionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  method?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
}

interface SettlementFilters {
  page?: number;
  limit?: number;
  vendor_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

interface WalletFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StatsResponse<T> {
  success: boolean;
  data: T;
}

// ── Query Hooks ─────────────────────────────────────────────────────

export function useTransactions(filters: TransactionFilters = {}) {
  const { page = 1, limit = 20, search, status, method, type, date_from, date_to } = filters;

  return useQuery({
    queryKey: ['admin', 'accounting', 'transactions', { page, limit, search, status, method, type, date_from, date_to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);
      if (method && method !== 'all') params.set('method', method);
      if (type && type !== 'all') params.set('type', type);
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      const response = await api.get<PaginatedResponse<Transaction>>(
        `/payments/admin/transactions?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useTransactionStats() {
  return useQuery({
    queryKey: ['admin', 'accounting', 'transaction-stats'],
    queryFn: async () => {
      const response = await api.get<StatsResponse<TransactionStats>>(
        '/payments/admin/transaction-stats',
      );
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useSettlements(filters: SettlementFilters = {}) {
  const { page = 1, limit = 20, vendor_id, status, date_from, date_to } = filters;

  return useQuery({
    queryKey: ['admin', 'accounting', 'settlements', { page, limit, vendor_id, status, date_from, date_to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (vendor_id) params.set('vendor_id', vendor_id);
      if (status && status !== 'all') params.set('status', status);
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      const response = await api.get<PaginatedResponse<Settlement>>(
        `/payments/admin/settlements?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useSettlementStats() {
  return useQuery({
    queryKey: ['admin', 'accounting', 'settlement-stats'],
    queryFn: async () => {
      const response = await api.get<StatsResponse<SettlementStats>>(
        '/payments/admin/settlement-stats',
      );
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useWallets(filters: WalletFilters = {}) {
  const { page = 1, limit = 20, search, status } = filters;

  return useQuery({
    queryKey: ['admin', 'accounting', 'wallets', { page, limit, search, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);

      const response = await api.get<PaginatedResponse<Wallet>>(
        `/payments/admin/wallets?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useWalletStats() {
  return useQuery({
    queryKey: ['admin', 'accounting', 'wallet-stats'],
    queryFn: async () => {
      const response = await api.get<StatsResponse<WalletStats>>(
        '/payments/admin/wallet-stats',
      );
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

// ── Settlement Detail ──────────────────────────────────────────────

export function useSettlementDetail(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'accounting', 'settlement-detail', id],
    queryFn: async () => {
      const response = await api.get<StatsResponse<SettlementDetail>>(
        `/payments/admin/settlements/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

// ── Settlement Action Mutations ────────────────────────────────────

export function useGenerateSettlements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { period_start: string; period_end: string; vendor_id?: string }) => {
      const response = await api.post('/payments/admin/settlements/generate', payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlements'] });
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlement-stats'] });
    },
  });
}

export function useApproveSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await api.patch(`/payments/admin/settlements/${id}/approve`, { notes });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlements'] });
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlement-detail'] });
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlement-stats'] });
    },
  });
}

export function useProcessSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment_reference, notes }: { id: string; payment_reference: string; notes?: string }) => {
      const response = await api.patch(`/payments/admin/settlements/${id}/process`, { payment_reference, notes });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlements'] });
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlement-detail'] });
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlement-stats'] });
    },
  });
}

export function useRejectSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await api.patch(`/payments/admin/settlements/${id}/reject`, { notes });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlements'] });
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlement-detail'] });
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlement-stats'] });
    },
  });
}

export function useAdjustSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adjustment_amount, notes }: { id: string; adjustment_amount: number; notes: string }) => {
      const response = await api.patch(`/payments/admin/settlements/${id}/adjust`, { adjustment_amount, notes });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlements'] });
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlement-detail'] });
    },
  });
}

export function useBatchProcessSettlements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { settlement_ids: string[]; payment_reference_prefix: string }) => {
      const response = await api.post('/payments/admin/settlements/batch-process', payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlements'] });
      qc.invalidateQueries({ queryKey: ['admin', 'accounting', 'settlement-stats'] });
    },
  });
}
