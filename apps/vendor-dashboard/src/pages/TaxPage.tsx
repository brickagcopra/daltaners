import { useState } from 'react';
import {
  useTaxSummary,
  useMyTaxInvoices,
  useTaxInvoiceDetail,
  type TaxInvoice,
  type TaxInvoiceFilters,
} from '@/hooks/useTax';
import { cn } from '@/lib/cn';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  issued: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  voided: 'bg-yellow-100 text-yellow-700',
};

const invoiceTypeLabels: Record<string, string> = {
  ewt_certificate: 'EWT Certificate',
  official_receipt: 'Official Receipt',
  sales_invoice: 'Sales Invoice',
  credit_note: 'Credit Note',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/* ── Invoice Detail Modal ────────────────────────────── */

function InvoiceDetailModal({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) {
  const { data: inv, isLoading } = useTaxInvoiceDetail(invoiceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Invoice Detail</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading || !inv ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6 px-6 py-5">
            {/* Invoice Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-sm font-bold text-gray-900">{inv.invoice_number}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {invoiceTypeLabels[inv.invoice_type] || inv.invoice_type}
                </p>
              </div>
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', statusColors[inv.status])}>
                {inv.status}
              </span>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Gross Amount</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(inv.gross_amount)}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-gray-500">VAT ({formatPercent(inv.vat_rate)})</p>
                <p className="mt-1 text-lg font-bold text-blue-600">{formatCurrency(inv.vat_amount)}</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <p className="text-xs text-gray-500">EWT ({formatPercent(inv.ewt_rate)})</p>
                <p className="mt-1 text-lg font-bold text-orange-600">{formatCurrency(inv.ewt_amount)}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-gray-500">Net Amount</p>
                <p className="mt-1 text-lg font-bold text-green-600">{formatCurrency(inv.net_amount)}</p>
              </div>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <span className="text-gray-500">Period:</span>{' '}
                <span className="font-medium text-gray-900">
                  {formatDate(inv.period_start)} \u2014 {formatDate(inv.period_end)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Issued:</span>{' '}
                <span className="font-medium text-gray-900">{formatDate(inv.issued_at)}</span>
              </div>
              {inv.settlement_id && (
                <div>
                  <span className="text-gray-500">Settlement:</span>{' '}
                  <span className="font-mono text-xs font-medium text-gray-900">{inv.settlement_id}</span>
                </div>
              )}
              {inv.cancellation_reason && (
                <div className="col-span-2">
                  <span className="text-gray-500">Cancellation Reason:</span>{' '}
                  <span className="font-medium text-red-600">{inv.cancellation_reason}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────── */

export default function TaxPage() {
  const [filters, setFilters] = useState<TaxInvoiceFilters>({ page: 1, limit: 20 });
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const { data: summary, isLoading: summaryLoading } = useTaxSummary();
  const { data: invoicesRes, isLoading: invoicesLoading } = useMyTaxInvoices(filters);

  const invoices = invoicesRes?.data || [];
  const meta = (invoicesRes as Record<string, unknown>)?.meta as
    | { page: number; limit: number; total: number; totalPages: number }
    | undefined;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tax & Compliance</h1>
        <p className="mt-1 text-sm text-gray-500">View your tax invoices, EWT certificates, and VAT summaries</p>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">Total Gross</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.total_gross)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">VAT Collected</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{formatCurrency(summary.total_vat)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">EWT Withheld</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{formatCurrency(summary.total_ewt)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">Total Invoices</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summary.total_invoices}</p>
          </div>
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.status || 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="cancelled">Cancelled</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      {/* Invoice Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Period</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Gross</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">VAT</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">EWT</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Net</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoicesLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((inv: TaxInvoice) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-600">{invoiceTypeLabels[inv.invoice_type] || inv.invoice_type}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(inv.period_start)} \u2014 {formatDate(inv.period_end)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(inv.gross_amount)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(inv.vat_amount)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(inv.ewt_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(inv.net_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusColors[inv.status])}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-600">
              Showing {(meta.page - 1) * meta.limit + 1}\u2013{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoiceId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </div>
  );
}
