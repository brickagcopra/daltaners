import { useState } from 'react';
import {
  useTaxConfigs,
  useCreateTaxConfig,
  useUpdateTaxConfig,
  useDeleteTaxConfig,
  useTaxInvoices,
  useInvoiceStats,
  useCancelInvoice,
  useVoidInvoice,
  useTaxReports,
  useReportStats,
  useGenerateTaxReport,
  useFinalizeTaxReport,
  useFileTaxReport,
  type TaxConfig,
  type TaxInvoice,
  type TaxReport,
  type ConfigFilters,
  type InvoiceFilters,
  type ReportFilters,
  type ReportType,
} from '@/hooks/useTax';

// ── Helpers ────────────────────────────────────────────

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

function statusBadge(status: string): string {
  switch (status) {
    case 'issued':
    case 'filed':
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    case 'finalized':
      return 'bg-blue-100 text-blue-700';
    case 'cancelled':
    case 'voided':
      return 'bg-red-100 text-red-700';
    case 'amended':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

const taxTypeLabels: Record<string, string> = {
  vat: 'VAT',
  ewt: 'EWT',
  percentage_tax: 'Percentage Tax',
  excise: 'Excise',
  custom: 'Custom',
};

const appliesToLabels: Record<string, string> = {
  all: 'All',
  category: 'Category',
  zone: 'Zone',
  vendor_tier: 'Vendor Tier',
};

const invoiceTypeLabels: Record<string, string> = {
  ewt_certificate: 'EWT Certificate',
  official_receipt: 'Official Receipt',
  sales_invoice: 'Sales Invoice',
  credit_note: 'Credit Note',
};

const reportTypeLabels: Record<string, string> = {
  monthly_vat: 'Monthly VAT',
  quarterly_vat: 'Quarterly VAT',
  annual_income: 'Annual Income',
  ewt_summary: 'EWT Summary',
};

// ── Stat Card ──────────────────────────────────────────

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

// ── Configurations Tab ─────────────────────────────────

function ConfigurationsTab() {
  const [filters, setFilters] = useState<ConfigFilters>({});
  const [showForm, setShowForm] = useState(false);
  const [editConfig, setEditConfig] = useState<TaxConfig | null>(null);

  const { data: configs = [], isLoading } = useTaxConfigs(filters);
  const createMutation = useCreateTaxConfig();
  const updateMutation = useUpdateTaxConfig();
  const deleteMutation = useDeleteTaxConfig();

  function handleSave(formData: Record<string, unknown>) {
    if (editConfig) {
      updateMutation.mutate(
        { id: editConfig.id, ...formData } as Partial<TaxConfig> & { id: string },
        { onSuccess: () => { setShowForm(false); setEditConfig(null); } },
      );
    } else {
      createMutation.mutate(formData as Partial<TaxConfig>, {
        onSuccess: () => setShowForm(false),
      });
    }
  }

  function handleDelete(id: string) {
    if (confirm('Delete this tax configuration?')) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.tax_type || 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, tax_type: e.target.value }))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Types</option>
          <option value="vat">VAT</option>
          <option value="ewt">EWT</option>
          <option value="percentage_tax">Percentage Tax</option>
          <option value="excise">Excise</option>
          <option value="custom">Custom</option>
        </select>
        <select
          value={filters.applies_to || 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, applies_to: e.target.value }))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Scopes</option>
          <option value="all">Global</option>
          <option value="category">Category</option>
          <option value="zone">Zone</option>
          <option value="vendor_tier">Vendor Tier</option>
        </select>
        <input
          type="text"
          placeholder="Search configs..."
          value={filters.search || ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex-1" />
        <button
          onClick={() => { setEditConfig(null); setShowForm(true); }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Add Config
        </button>
      </div>

      {/* Config Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Rate</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Scope</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Inclusive</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Active</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Effective</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
                </td>
              </tr>
            ) : configs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-500">No configurations found</td>
              </tr>
            ) : (
              configs.map((cfg: TaxConfig) => (
                <tr key={cfg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{cfg.name}</p>
                    <p className="text-xs text-gray-500">{cfg.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      {taxTypeLabels[cfg.tax_type] || cfg.tax_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">{formatPercent(cfg.rate)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {appliesToLabels[cfg.applies_to] || cfg.applies_to}
                    {cfg.applies_to_value && <span className="ml-1 text-xs text-gray-400">({cfg.applies_to_value})</span>}
                  </td>
                  <td className="px-4 py-3 text-center">{cfg.is_inclusive ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {cfg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {formatDate(cfg.effective_from)}
                    {cfg.effective_until && <> \u2014 {formatDate(cfg.effective_until)}</>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setEditConfig(cfg); setShowForm(true); }}
                      className="mr-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cfg.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Config Form Modal */}
      {showForm && (
        <ConfigFormModal
          config={editConfig}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditConfig(null); }}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ConfigFormModal({
  config,
  onSave,
  onClose,
  saving,
}: {
  config: TaxConfig | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(config?.name || '');
  const [description, setDescription] = useState(config?.description || '');
  const [taxType, setTaxType] = useState<'custom' | 'vat' | 'ewt' | 'percentage_tax' | 'excise'>(config?.tax_type || 'vat');
  const [rate, setRate] = useState(String((config?.rate || 0) * 100));
  const [appliesTo, setAppliesTo] = useState<'category' | 'all' | 'zone' | 'vendor_tier'>(config?.applies_to || 'all');
  const [appliesToValue, setAppliesToValue] = useState(config?.applies_to_value || '');
  const [isInclusive, setIsInclusive] = useState(config?.is_inclusive ?? true);
  const [isActive, setIsActive] = useState(config?.is_active ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name,
      description,
      tax_type: taxType,
      rate: parseFloat(rate) / 100,
      applies_to: appliesTo,
      applies_to_value: appliesTo !== 'all' ? appliesToValue : null,
      is_inclusive: isInclusive,
      is_active: isActive,
      effective_from: config?.effective_from || new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {config ? 'Edit Tax Configuration' : 'New Tax Configuration'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tax Type</label>
              <select value={taxType} onChange={(e) => setTaxType(e.target.value as typeof taxType)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="vat">VAT</option>
                <option value="ewt">EWT</option>
                <option value="percentage_tax">Percentage Tax</option>
                <option value="excise">Excise</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rate (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={rate} onChange={(e) => setRate(e.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Applies To</label>
              <select value={appliesTo} onChange={(e) => setAppliesTo(e.target.value as typeof appliesTo)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="all">All</option>
                <option value="category">Category</option>
                <option value="zone">Zone</option>
                <option value="vendor_tier">Vendor Tier</option>
              </select>
            </div>
            {appliesTo !== 'all' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Value</label>
                <input value={appliesToValue} onChange={(e) => setAppliesToValue(e.target.value)} placeholder="e.g. grocery, platinum" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            )}
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isInclusive} onChange={(e) => setIsInclusive(e.target.checked)} className="rounded border-gray-300" />
              Tax Inclusive
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300" />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : config ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Invoices Tab ───────────────────────────────────────

function InvoicesTab() {
  const [filters, setFilters] = useState<InvoiceFilters>({ page: 1, limit: 20 });
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'void' | null>(null);
  const [reason, setReason] = useState('');

  const { data: stats } = useInvoiceStats();
  const { data: invoicesRes, isLoading } = useTaxInvoices(filters);
  const cancelMutation = useCancelInvoice();
  const voidMutation = useVoidInvoice();

  const invoices = invoicesRes?.data || [];
  const meta = invoicesRes?.meta;

  function handleAction() {
    if (!actionId || !actionType) return;
    const mutation = actionType === 'cancel' ? cancelMutation : voidMutation;
    mutation.mutate(
      { id: actionId, reason },
      { onSuccess: () => { setActionId(null); setActionType(null); setReason(''); } },
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Total Invoices" value={String(stats.total_invoices)} subtitle={`${stats.issued_count} issued, ${stats.draft_count} draft`} />
          <StatCard title="Total Gross" value={formatCurrency(stats.total_gross_amount)} />
          <StatCard title="Total VAT" value={formatCurrency(stats.total_vat_amount)} />
          <StatCard title="Total EWT" value={formatCurrency(stats.total_ewt_amount)} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.status || 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="cancelled">Cancelled</option>
          <option value="voided">Voided</option>
        </select>
        <select
          value={filters.invoice_type || 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, invoice_type: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Types</option>
          <option value="ewt_certificate">EWT Certificate</option>
          <option value="sales_invoice">Sales Invoice</option>
          <option value="credit_note">Credit Note</option>
        </select>
        <input
          type="text"
          placeholder="Search invoices..."
          value={filters.search || ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Invoice Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Vendor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Period</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Gross</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">VAT</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">EWT</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">No invoices found</td>
                </tr>
              ) : (
                invoices.map((inv: TaxInvoice) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{inv.vendor_name}</p>
                      <p className="text-xs text-gray-500">{inv.vendor_tin}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{invoiceTypeLabels[inv.invoice_type] || inv.invoice_type}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDate(inv.period_start)} \u2014 {formatDate(inv.period_end)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(inv.gross_amount)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(inv.vat_amount)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(inv.ewt_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(inv.status === 'issued' || inv.status === 'draft') && (
                        <button
                          onClick={() => { setActionId(inv.id); setActionType('cancel'); }}
                          className="mr-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Cancel
                        </button>
                      )}
                      {inv.status === 'issued' && (
                        <button
                          onClick={() => { setActionId(inv.id); setActionType('void'); }}
                          className="rounded-md px-2 py-1 text-xs font-medium text-yellow-600 hover:bg-yellow-50"
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-600">
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </p>
            <div className="flex gap-2">
              <button disabled={meta.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))} className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">Prev</button>
              <button disabled={meta.page >= meta.totalPages} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))} className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel / Void Confirmation Modal */}
      {actionId && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">
              {actionType === 'cancel' ? 'Cancel Invoice' : 'Void Invoice'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {actionType === 'cancel'
                ? 'This will cancel the invoice. This action cannot be undone.'
                : 'Voiding will invalidate this issued invoice. Provide a reason.'}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason..."
              rows={3}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setActionId(null); setActionType(null); setReason(''); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Close
              </button>
              <button
                onClick={handleAction}
                disabled={cancelMutation.isPending || voidMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {(cancelMutation.isPending || voidMutation.isPending) ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────

function ReportsTab() {
  const [filters, setFilters] = useState<ReportFilters>({ page: 1, limit: 20 });
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TaxReport | null>(null);
  const [fileModalId, setFileModalId] = useState<string | null>(null);
  const [filingRef, setFilingRef] = useState('');
  const [filingNotes, setFilingNotes] = useState('');

  const { data: stats } = useReportStats();
  const { data: reportsRes, isLoading } = useTaxReports(filters);
  const generateMutation = useGenerateTaxReport();
  const finalizeMutation = useFinalizeTaxReport();
  const fileMutation = useFileTaxReport();

  const reports = reportsRes?.data || [];
  const meta = reportsRes?.meta;

  function handleFile() {
    if (!fileModalId) return;
    fileMutation.mutate(
      { id: fileModalId, filing_reference: filingRef, notes: filingNotes },
      { onSuccess: () => { setFileModalId(null); setFilingRef(''); setFilingNotes(''); } },
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Total Reports" value={String(stats.total_reports)} subtitle={`${stats.filed_count} filed, ${stats.draft_count} draft`} />
          <StatCard title="Total Gross Sales" value={formatCurrency(stats.total_gross_sales)} />
          <StatCard title="VAT Collected" value={formatCurrency(stats.total_vat_collected)} />
          <StatCard title="EWT Withheld" value={formatCurrency(stats.total_ewt_withheld)} />
        </div>
      )}

      {/* Filters + Generate */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.report_type || 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, report_type: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Types</option>
          <option value="monthly_vat">Monthly VAT</option>
          <option value="quarterly_vat">Quarterly VAT</option>
          <option value="annual_income">Annual Income</option>
          <option value="ewt_summary">EWT Summary</option>
        </select>
        <select
          value={filters.status || 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="filed">Filed</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowGenerate(true)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Generate Report
        </button>
      </div>

      {/* Reports Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Report #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Period</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Gross Sales</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">VAT</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">EWT</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">No reports found</td>
                </tr>
              ) : (
                reports.map((rpt: TaxReport) => (
                  <tr key={rpt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{rpt.report_number}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {reportTypeLabels[rpt.report_type] || rpt.report_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {rpt.period_month ? `${rpt.period_year}-${String(rpt.period_month).padStart(2, '0')}` : rpt.period_quarter ? `Q${rpt.period_quarter} ${rpt.period_year}` : String(rpt.period_year)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(rpt.total_gross_sales)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(rpt.total_vat_collected)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(rpt.total_ewt_withheld)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(rpt.status)}`}>
                        {rpt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedReport(rpt)}
                        className="mr-1 rounded-md px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                      >
                        View
                      </button>
                      {rpt.status === 'draft' && (
                        <button
                          onClick={() => finalizeMutation.mutate(rpt.id)}
                          disabled={finalizeMutation.isPending}
                          className="mr-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        >
                          Finalize
                        </button>
                      )}
                      {rpt.status === 'finalized' && (
                        <button
                          onClick={() => setFileModalId(rpt.id)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                        >
                          File
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-600">Page {meta.page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={meta.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))} className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">Prev</button>
              <button disabled={meta.page >= meta.totalPages} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))} className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerate && (
        <GenerateReportModal
          onGenerate={(payload) => {
            generateMutation.mutate(payload, { onSuccess: () => setShowGenerate(false) });
          }}
          onClose={() => setShowGenerate(false)}
          generating={generateMutation.isPending}
        />
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}

      {/* File Report Modal */}
      {fileModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">File Tax Report with BIR</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Filing Reference</label>
                <input value={filingRef} onChange={(e) => setFilingRef(e.target.value)} placeholder="BIR-REF-..." className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea value={filingNotes} onChange={(e) => setFilingNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setFileModalId(null); setFilingRef(''); setFilingNotes(''); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleFile} disabled={fileMutation.isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {fileMutation.isPending ? 'Filing...' : 'Confirm Filing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GenerateReportModal({
  onGenerate,
  onClose,
  generating,
}: {
  onGenerate: (payload: { report_type: ReportType; period_year: number; period_month?: number; period_quarter?: number }) => void;
  onClose: () => void;
  generating: boolean;
}) {
  const [reportType, setReportType] = useState<ReportType>('monthly_vat');
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);
  const [quarter, setQuarter] = useState(1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: { report_type: ReportType; period_year: number; period_month?: number; period_quarter?: number } = {
      report_type: reportType,
      period_year: year,
    };
    if (reportType === 'monthly_vat' || reportType === 'ewt_summary') payload.period_month = month;
    if (reportType === 'quarterly_vat') payload.period_quarter = quarter;
    onGenerate(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Generate Tax Report</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="monthly_vat">Monthly VAT</option>
              <option value="quarterly_vat">Quarterly VAT</option>
              <option value="annual_income">Annual Income</option>
              <option value="ewt_summary">EWT Summary</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Year</label>
            <input type="number" min={2020} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          {(reportType === 'monthly_vat' || reportType === 'ewt_summary') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2026, i).toLocaleString('en', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          )}
          {reportType === 'quarterly_vat' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Quarter</label>
              <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value={1}>Q1 (Jan\u2013Mar)</option>
                <option value={2}>Q2 (Apr\u2013Jun)</option>
                <option value={3}>Q3 (Jul\u2013Sep)</option>
                <option value={4}>Q4 (Oct\u2013Dec)</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={generating} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportDetailModal({ report: rpt, onClose }: { report: TaxReport; onClose: () => void }) {
  const categories = rpt.breakdown_by_category as Record<string, { gross: number; vat: number; orders: number }>;
  const zones = rpt.breakdown_by_zone as Record<string, { gross: number; vat: number; orders: number }>;
  const methods = rpt.breakdown_by_method as Record<string, { gross: number; orders: number }>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{rpt.report_number}</h2>
            <p className="text-sm text-gray-500">{reportTypeLabels[rpt.report_type]} Report</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Gross Sales</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(rpt.total_gross_sales)}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-gray-500">VAT Collected</p>
              <p className="mt-1 text-lg font-bold text-blue-600">{formatCurrency(rpt.total_vat_collected)}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <p className="text-xs text-gray-500">EWT Withheld</p>
              <p className="mt-1 text-lg font-bold text-orange-600">{formatCurrency(rpt.total_ewt_withheld)}</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3">
              <p className="text-xs text-gray-500">Commissions</p>
              <p className="mt-1 text-lg font-bold text-purple-600">{formatCurrency(rpt.total_commissions)}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs text-gray-500">Refunds</p>
              <p className="mt-1 text-lg font-bold text-red-600">{formatCurrency(rpt.total_refunds)}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-gray-500">Net Revenue</p>
              <p className="mt-1 text-lg font-bold text-green-600">{formatCurrency(rpt.total_net_revenue)}</p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <div><span className="text-gray-500">Orders:</span> <span className="font-medium">{rpt.total_orders.toLocaleString()}</span></div>
            <div><span className="text-gray-500">Vendors:</span> <span className="font-medium">{rpt.total_vendors}</span></div>
            <div><span className="text-gray-500">Settlements:</span> <span className="font-medium">{rpt.total_settlements}</span></div>
            <div>
              <span className="text-gray-500">Status:</span>{' '}
              <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(rpt.status)}`}>{rpt.status}</span>
            </div>
            {rpt.finalized_at && <div><span className="text-gray-500">Finalized:</span> <span className="font-medium">{formatDate(rpt.finalized_at)}</span></div>}
            {rpt.filed_at && <div><span className="text-gray-500">Filed:</span> <span className="font-medium">{formatDate(rpt.filed_at)}</span></div>}
            {rpt.filing_reference && <div className="col-span-2"><span className="text-gray-500">BIR Ref:</span> <span className="font-mono text-xs font-medium">{rpt.filing_reference}</span></div>}
          </div>

          {/* Breakdown Tables */}
          {Object.keys(categories).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-gray-700">By Category</h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Category</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Gross</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">VAT</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(categories).map(([key, val]) => (
                      <tr key={key}>
                        <td className="px-3 py-2 capitalize text-gray-900">{key}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(val.gross)}</td>
                        <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(val.vat)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{val.orders.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Object.keys(zones).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-gray-700">By Zone</h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Zone</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Gross</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">VAT</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(zones).map(([key, val]) => (
                      <tr key={key}>
                        <td className="px-3 py-2 text-gray-900">{key}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(val.gross)}</td>
                        <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(val.vat)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{val.orders.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Object.keys(methods).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-gray-700">By Payment Method</h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Method</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Gross</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(methods).map(([key, val]) => (
                      <tr key={key}>
                        <td className="px-3 py-2 capitalize text-gray-900">{key}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(val.gross)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{val.orders.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rpt.notes && (
            <div>
              <h3 className="mb-1 text-sm font-bold text-gray-700">Notes</h3>
              <p className="text-sm text-gray-600">{rpt.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────

export default function TaxPage() {
  const [tab, setTab] = useState<'configs' | 'invoices' | 'reports'>('configs');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tax & Compliance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage tax configurations, view invoices, and generate BIR-compliant reports
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(['configs', 'invoices', 'reports'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === t
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {t === 'configs' ? 'Configurations' : t === 'invoices' ? 'Invoices' : 'Reports'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'configs' && <ConfigurationsTab />}
      {tab === 'invoices' && <InvoicesTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}
