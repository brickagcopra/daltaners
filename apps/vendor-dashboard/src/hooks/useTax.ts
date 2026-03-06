import { useQuery } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

// ── Types ──────────────────────────────────────────────

export interface VendorTaxSummary {
  vendor_id: string;
  total_gross: number;
  total_vat: number;
  total_ewt: number;
  total_invoices: number;
  total_settlements: number;
  total_commissions: number;
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
  status: 'draft' | 'issued' | 'cancelled' | 'voided';
  issued_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxInvoiceFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// ── Queries ────────────────────────────────────────────

export function useTaxSummary() {
  return useQuery({
    queryKey: ['vendor-tax-summary'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<VendorTaxSummary>>(
        '/payments/tax/summary',
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useMyTaxInvoices(filters: TaxInvoiceFilters = {}) {
  return useQuery({
    queryKey: ['vendor-tax-invoices', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get<ApiResponse<TaxInvoice[]>>(
        `/payments/tax/invoices?${params.toString()}`,
      );
      return data;
    },
  });
}

export function useTaxInvoiceDetail(id: string | null) {
  return useQuery({
    queryKey: ['vendor-tax-invoice-detail', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TaxInvoice>>(
        `/payments/tax/invoices/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}
