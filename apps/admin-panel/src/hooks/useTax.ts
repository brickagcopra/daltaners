import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Types ──────────────────────────────────────────────

export type TaxType = 'vat' | 'ewt' | 'percentage_tax' | 'excise' | 'custom';
export type TaxAppliesTo = 'all' | 'category' | 'zone' | 'vendor_tier';
export type InvoiceStatus = 'draft' | 'issued' | 'cancelled' | 'voided';
export type ReportStatus = 'draft' | 'finalized' | 'filed' | 'amended';
export type ReportType = 'monthly_vat' | 'quarterly_vat' | 'annual_income' | 'ewt_summary';

export interface TaxConfig {
  id: string;
  name: string;
  description: string;
  tax_type: TaxType;
  rate: number;
  applies_to: TaxAppliesTo;
  applies_to_value: string | null;
  is_inclusive: boolean;
  is_active: boolean;
  effective_from: string;
  effective_until: string | null;
  created_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TaxInvoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  vendor_id: string;
  vendor_name: string;
  vendor_tin: string;
  vendor_address: string;
  settlement_id: string | null;
  order_id: string | null;
  period_start: string;
  period_end: string;
  gross_amount: number;
  vat_amount: number;
  ewt_amount: number;
  net_amount: number;
  vat_rate: number;
  ewt_rate: number;
  status: InvoiceStatus;
  issued_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxReport {
  id: string;
  report_number: string;
  report_type: ReportType;
  period_type: string;
  period_year: number;
  period_month: number | null;
  period_quarter: number | null;
  period_start: string;
  period_end: string;
  total_gross_sales: number;
  total_vat_collected: number;
  total_ewt_withheld: number;
  total_commissions: number;
  total_refunds: number;
  total_net_revenue: number;
  total_orders: number;
  total_vendors: number;
  total_settlements: number;
  breakdown_by_category: Record<string, unknown>;
  breakdown_by_zone: Record<string, unknown>;
  breakdown_by_method: Record<string, unknown>;
  status: ReportStatus;
  generated_by: string;
  finalized_by: string | null;
  finalized_at: string | null;
  filed_at: string | null;
  filing_reference: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InvoiceStats {
  total_invoices: number;
  issued_count: number;
  draft_count: number;
  cancelled_count: number;
  voided_count: number;
  total_vat_amount: number;
  total_ewt_amount: number;
  total_gross_amount: number;
}

export interface ReportStats {
  total_reports: number;
  draft_count: number;
  finalized_count: number;
  filed_count: number;
  amended_count: number;
  total_gross_sales: number;
  total_vat_collected: number;
  total_ewt_withheld: number;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface SingleResponse<T> {
  success: boolean;
  data: T;
}

// ── Config filters ─────────────────────────────────────

export interface ConfigFilters {
  tax_type?: string;
  applies_to?: string;
  search?: string;
}

export interface InvoiceFilters {
  invoice_type?: string;
  status?: string;
  vendor_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface ReportFilters {
  report_type?: string;
  status?: string;
  year?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Tax Config Queries ─────────────────────────────────

export function useTaxConfigs(filters: ConfigFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'tax', 'configs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.tax_type && filters.tax_type !== 'all') params.set('tax_type', filters.tax_type);
      if (filters.applies_to && filters.applies_to !== 'all') params.set('applies_to', filters.applies_to);
      if (filters.search) params.set('search', filters.search);

      const { data } = await api.get<SingleResponse<TaxConfig[]>>(
        `/payments/admin/tax/configs?${params.toString()}`,
      );
      return data.data;
    },
  });
}

export function useCreateTaxConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<TaxConfig>) => {
      const { data } = await api.post<SingleResponse<TaxConfig>>(
        '/payments/admin/tax/configs',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'configs'] });
    },
  });
}

export function useUpdateTaxConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<TaxConfig> & { id: string }) => {
      const { data } = await api.patch<SingleResponse<TaxConfig>>(
        `/payments/admin/tax/configs/${id}`,
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'configs'] });
    },
  });
}

export function useDeleteTaxConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payments/admin/tax/configs/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'configs'] });
    },
  });
}

// ── Tax Invoice Queries ────────────────────────────────

export function useTaxInvoices(filters: InvoiceFilters = {}) {
  const { page = 1, limit = 20, ...rest } = filters;
  return useQuery({
    queryKey: ['admin', 'tax', 'invoices', { page, limit, ...rest }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (rest.invoice_type && rest.invoice_type !== 'all') params.set('invoice_type', rest.invoice_type);
      if (rest.status && rest.status !== 'all') params.set('status', rest.status);
      if (rest.vendor_id) params.set('vendor_id', rest.vendor_id);
      if (rest.search) params.set('search', rest.search);
      if (rest.date_from) params.set('date_from', rest.date_from);
      if (rest.date_to) params.set('date_to', rest.date_to);

      const { data } = await api.get<PaginatedResponse<TaxInvoice>>(
        `/payments/admin/tax/invoices?${params.toString()}`,
      );
      return data;
    },
  });
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: ['admin', 'tax', 'invoice-stats'],
    queryFn: async () => {
      const { data } = await api.get<SingleResponse<InvoiceStats>>(
        '/payments/admin/tax/invoice-stats',
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.patch<SingleResponse<TaxInvoice>>(
        `/payments/admin/tax/invoices/${id}/cancel`,
        { reason },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'invoices'] });
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'invoice-stats'] });
    },
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.patch<SingleResponse<TaxInvoice>>(
        `/payments/admin/tax/invoices/${id}/void`,
        { reason },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'invoices'] });
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'invoice-stats'] });
    },
  });
}

// ── Tax Report Queries ─────────────────────────────────

export function useTaxReports(filters: ReportFilters = {}) {
  const { page = 1, limit = 20, ...rest } = filters;
  return useQuery({
    queryKey: ['admin', 'tax', 'reports', { page, limit, ...rest }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (rest.report_type && rest.report_type !== 'all') params.set('report_type', rest.report_type);
      if (rest.status && rest.status !== 'all') params.set('status', rest.status);
      if (rest.year) params.set('year', rest.year);
      if (rest.search) params.set('search', rest.search);

      const { data } = await api.get<PaginatedResponse<TaxReport>>(
        `/payments/admin/tax/reports?${params.toString()}`,
      );
      return data;
    },
  });
}

export function useReportStats() {
  return useQuery({
    queryKey: ['admin', 'tax', 'report-stats'],
    queryFn: async () => {
      const { data } = await api.get<SingleResponse<ReportStats>>(
        '/payments/admin/tax/report-stats',
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useGenerateTaxReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      report_type: ReportType;
      period_year: number;
      period_month?: number;
      period_quarter?: number;
    }) => {
      const { data } = await api.post<SingleResponse<TaxReport>>(
        '/payments/admin/tax/reports/generate',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'report-stats'] });
    },
  });
}

export function useFinalizeTaxReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<SingleResponse<TaxReport>>(
        `/payments/admin/tax/reports/${id}/finalize`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'report-stats'] });
    },
  });
}

export function useFileTaxReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, filing_reference, notes }: {
      id: string;
      filing_reference?: string;
      notes?: string;
    }) => {
      const { data } = await api.patch<SingleResponse<TaxReport>>(
        `/payments/admin/tax/reports/${id}/file`,
        { filing_reference, notes },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'tax', 'report-stats'] });
    },
  });
}
