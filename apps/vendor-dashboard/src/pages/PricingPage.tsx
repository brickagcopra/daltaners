import { useState } from 'react';
import {
  usePricingRules,
  usePricingStats,
  useStorePriceHistory,
  useCreatePricingRule,
  useUpdatePricingRule,
  useDeletePricingRule,
  useActivatePricingRule,
  usePausePricingRule,
  useCancelPricingRule,
  useApplyPricingRule,
  useRevertPricingRule,
  RULE_STATUS_LABELS,
  RULE_STATUS_COLORS,
  RULE_TYPE_LABELS,
  RULE_TYPE_COLORS,
  APPLIES_TO_LABELS,
  CHANGE_TYPE_LABELS,
  type PricingRule,
  type PricingRuleStatus,
  type PricingRuleType,
  type PricingDiscountType,
  type PricingAppliesTo,
  type CreatePricingRuleData,
  type PricingSchedule,
  type PricingConditions,
} from '@/hooks/usePricing';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDiscount(rule: PricingRule): string {
  switch (rule.discount_type) {
    case 'percentage':
      return `${rule.discount_value}% off`;
    case 'fixed_amount':
      return `₱${rule.discount_value} off`;
    case 'price_override':
      return `₱${rule.discount_value}`;
    default:
      return String(rule.discount_value);
  }
}

const statusTabs: { label: string; value: PricingRuleStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Paused', value: 'paused' },
  { label: 'Draft', value: 'draft' },
  { label: 'Expired', value: 'expired' },
  { label: 'Cancelled', value: 'cancelled' },
];

const ruleTypeOptions: { label: string; value: PricingRuleType }[] = [
  { label: 'Time-Based', value: 'time_based' },
  { label: 'Happy Hour', value: 'happy_hour' },
  { label: 'Flash Sale', value: 'flash_sale' },
  { label: 'Bulk Discount', value: 'bulk_discount' },
  { label: 'Scheduled Price', value: 'scheduled_price' },
];

const discountTypeOptions: { label: string; value: PricingDiscountType }[] = [
  { label: 'Percentage (%)', value: 'percentage' },
  { label: 'Fixed Amount (₱)', value: 'fixed_amount' },
  { label: 'Price Override (₱)', value: 'price_override' },
];

const appliesToOptions: { label: string; value: PricingAppliesTo }[] = [
  { label: 'All Products', value: 'all_products' },
  { label: 'Specific Products', value: 'specific_products' },
  { label: 'Category', value: 'category' },
  { label: 'Brand', value: 'brand' },
];

// ── Default form state ──────────────────────────────────

interface RuleFormState {
  name: string;
  description: string;
  rule_type: PricingRuleType;
  discount_type: PricingDiscountType;
  discount_value: string;
  applies_to: PricingAppliesTo;
  applies_to_ids: string;
  start_date: string;
  end_date: string;
  priority: string;
  max_uses: string;
  schedule_enabled: boolean;
  schedule_days: number[];
  schedule_start_time: string;
  schedule_end_time: string;
  min_quantity: string;
  min_order_value: string;
}

const defaultForm: RuleFormState = {
  name: '',
  description: '',
  rule_type: 'happy_hour',
  discount_type: 'percentage',
  discount_value: '',
  applies_to: 'all_products',
  applies_to_ids: '',
  start_date: '',
  end_date: '',
  priority: '0',
  max_uses: '',
  schedule_enabled: false,
  schedule_days: [],
  schedule_start_time: '',
  schedule_end_time: '',
  min_quantity: '',
  min_order_value: '',
};

export default function PricingPage() {
  // ── Tab state ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');

  // ── Rules tab state ────────────────────────────────────
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PricingRuleStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // ── History tab state ──────────────────────────────────
  const [historyPage, setHistoryPage] = useState(1);
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>('all');

  // ── Modal state ────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [deleteConfirmRule, setDeleteConfirmRule] = useState<PricingRule | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{ rule: PricingRule; action: string } | null>(null);
  const [detailRule, setDetailRule] = useState<PricingRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(defaultForm);

  // ── Queries ────────────────────────────────────────────
  const { data: rulesData, isLoading } = usePricingRules({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: 15,
  });
  const { data: stats } = usePricingStats();
  const { data: historyData, isLoading: historyLoading } = useStorePriceHistory({
    change_type: changeTypeFilter !== 'all' ? changeTypeFilter as any : undefined,
    page: historyPage,
    limit: 20,
  });

  // ── Mutations ──────────────────────────────────────────
  const createMutation = useCreatePricingRule();
  const updateMutation = useUpdatePricingRule();
  const deleteMutation = useDeletePricingRule();
  const activateMutation = useActivatePricingRule();
  const pauseMutation = usePausePricingRule();
  const cancelMutation = useCancelPricingRule();
  const applyMutation = useApplyPricingRule();
  const revertMutation = useRevertPricingRule();

  const rules = rulesData?.data || [];
  const meta = rulesData?.meta;
  const historyList = historyData?.data || [];
  const historyMeta = historyData?.meta;

  // ── Form helpers ───────────────────────────────────────

  function openCreate() {
    setForm(defaultForm);
    setEditingRule(null);
    setCreateModalOpen(true);
  }

  function openEdit(rule: PricingRule) {
    setForm({
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      discount_type: rule.discount_type,
      discount_value: String(rule.discount_value),
      applies_to: rule.applies_to,
      applies_to_ids: rule.applies_to_ids?.join(', ') || '',
      start_date: rule.start_date.slice(0, 16),
      end_date: rule.end_date?.slice(0, 16) || '',
      priority: String(rule.priority),
      max_uses: rule.max_uses ? String(rule.max_uses) : '',
      schedule_enabled: !!rule.schedule,
      schedule_days: rule.schedule?.days_of_week || [],
      schedule_start_time: rule.schedule?.start_time || '',
      schedule_end_time: rule.schedule?.end_time || '',
      min_quantity: rule.conditions?.min_quantity ? String(rule.conditions.min_quantity) : '',
      min_order_value: rule.conditions?.min_order_value ? String(rule.conditions.min_order_value) : '',
    });
    setEditingRule(rule);
    setCreateModalOpen(true);
  }

  function handleSubmit() {
    const schedule: PricingSchedule | undefined = form.schedule_enabled
      ? {
          days_of_week: form.schedule_days.length > 0 ? form.schedule_days : undefined,
          start_time: form.schedule_start_time || undefined,
          end_time: form.schedule_end_time || undefined,
        }
      : undefined;

    const conditions: PricingConditions | undefined =
      form.min_quantity || form.min_order_value
        ? {
            min_quantity: form.min_quantity ? Number(form.min_quantity) : undefined,
            min_order_value: form.min_order_value ? Number(form.min_order_value) : undefined,
          }
        : undefined;

    const payload: CreatePricingRuleData = {
      name: form.name,
      description: form.description || undefined,
      rule_type: form.rule_type,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      applies_to: form.applies_to,
      applies_to_ids:
        form.applies_to !== 'all_products' && form.applies_to_ids
          ? form.applies_to_ids.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      schedule,
      conditions,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
      priority: Number(form.priority) || 0,
      max_uses: form.max_uses ? Number(form.max_uses) : undefined,
    };

    if (editingRule) {
      updateMutation.mutate(
        { id: editingRule.id, ...payload },
        { onSuccess: () => setCreateModalOpen(false) },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => setCreateModalOpen(false),
      });
    }
  }

  function handleAction(rule: PricingRule, action: string) {
    switch (action) {
      case 'activate':
        activateMutation.mutate(rule.id, { onSuccess: () => setActionConfirm(null) });
        break;
      case 'pause':
        pauseMutation.mutate(rule.id, { onSuccess: () => setActionConfirm(null) });
        break;
      case 'cancel':
        cancelMutation.mutate(rule.id, { onSuccess: () => setActionConfirm(null) });
        break;
      case 'apply':
        applyMutation.mutate(rule.id, { onSuccess: () => setActionConfirm(null) });
        break;
      case 'revert':
        revertMutation.mutate(rule.id, { onSuccess: () => setActionConfirm(null) });
        break;
    }
  }

  function toggleScheduleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter((d) => d !== day)
        : [...prev.schedule_days, day].sort(),
    }));
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dynamic Pricing</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage pricing rules, happy hours, flash sales, and bulk discounts
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Create Rule
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Active', value: stats.active, color: 'text-green-600' },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-600' },
            { label: 'Paused', value: stats.paused, color: 'text-yellow-600' },
            { label: 'Draft', value: stats.draft, color: 'text-gray-500' },
            { label: 'Expired', value: stats.expired, color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('rules')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'rules'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pricing Rules
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Price History
        </button>
      </div>

      {/* ─── Rules Tab ──────────────────────────────────── */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Search + Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search rules..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            <div className="flex gap-1">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rules Table */}
          {isLoading ? (
            <div className="py-16 text-center text-gray-400">Loading pricing rules...</div>
          ) : rules.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500">No pricing rules found</p>
              <button onClick={openCreate} className="mt-2 text-sm text-primary-500 hover:underline">
                Create your first pricing rule
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Discount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Applies To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Uses</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailRule(rule)}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          {rule.name}
                        </button>
                        {rule.description && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{rule.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RULE_TYPE_COLORS[rule.rule_type]}`}>
                          {RULE_TYPE_LABELS[rule.rule_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDiscount(rule)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{APPLIES_TO_LABELS[rule.applies_to]}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RULE_STATUS_COLORS[rule.status]}`}>
                          {RULE_STATUS_LABELS[rule.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div>{formatDate(rule.start_date)}</div>
                        {rule.end_date && <div className="text-gray-400">to {formatDate(rule.end_date)}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {rule.current_uses}{rule.max_uses ? ` / ${rule.max_uses}` : ''}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit (draft/scheduled/paused) */}
                          {['draft', 'scheduled', 'paused'].includes(rule.status) && (
                            <button
                              onClick={() => openEdit(rule)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              title="Edit"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {/* Activate */}
                          {['draft', 'scheduled', 'paused'].includes(rule.status) && (
                            <button
                              onClick={() => setActionConfirm({ rule, action: 'activate' })}
                              className="rounded p-1 text-green-400 hover:bg-green-50 hover:text-green-600"
                              title="Activate"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                          )}
                          {/* Pause */}
                          {rule.status === 'active' && (
                            <button
                              onClick={() => setActionConfirm({ rule, action: 'pause' })}
                              className="rounded p-1 text-yellow-400 hover:bg-yellow-50 hover:text-yellow-600"
                              title="Pause"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                          )}
                          {/* Apply to products */}
                          {rule.status === 'active' && (
                            <button
                              onClick={() => setActionConfirm({ rule, action: 'apply' })}
                              className="rounded p-1 text-blue-400 hover:bg-blue-50 hover:text-blue-600"
                              title="Apply to Products"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                          )}
                          {/* Revert */}
                          {['active', 'paused', 'expired'].includes(rule.status) && (
                            <button
                              onClick={() => setActionConfirm({ rule, action: 'revert' })}
                              className="rounded p-1 text-orange-400 hover:bg-orange-50 hover:text-orange-600"
                              title="Revert Prices"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            </button>
                          )}
                          {/* Cancel */}
                          {!['expired', 'cancelled'].includes(rule.status) && (
                            <button
                              onClick={() => setActionConfirm({ rule, action: 'cancel' })}
                              className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                              title="Cancel"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            </button>
                          )}
                          {/* Delete (draft/cancelled only) */}
                          {['draft', 'cancelled'].includes(rule.status) && (
                            <button
                              onClick={() => setDeleteConfirmRule(rule)}
                              className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && (meta.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {meta.page} of {meta.totalPages} ({meta.total} rules)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page >= (meta.totalPages ?? 0)}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── History Tab ────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={changeTypeFilter}
              onChange={(e) => { setChangeTypeFilter(e.target.value); setHistoryPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="manual">Manual</option>
              <option value="rule_applied">Rule Applied</option>
              <option value="rule_expired">Rule Expired</option>
              <option value="bulk_update">Bulk Update</option>
              <option value="csv_import">CSV Import</option>
            </select>
          </div>

          {historyLoading ? (
            <div className="py-16 text-center text-gray-400">Loading price history...</div>
          ) : historyList.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No price history found</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Old Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">New Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Rule</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historyList.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {entry.product_name || entry.product_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {CHANGE_TYPE_LABELS[entry.change_type] || entry.change_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.old_sale_price != null ? formatCurrency(entry.old_sale_price) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {entry.new_sale_price != null ? (
                          <span className={entry.new_sale_price < (entry.old_sale_price ?? entry.old_base_price ?? 0) ? 'text-green-600 font-medium' : 'text-gray-900'}>
                            {formatCurrency(entry.new_sale_price)}
                          </span>
                        ) : (
                          <span className="text-gray-400">Reverted</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {entry.rule_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(entry.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {historyMeta && (historyMeta.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {historyMeta.page} of {historyMeta.totalPages} ({historyMeta.total} entries)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage(historyPage - 1)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={historyPage >= (historyMeta.totalPages ?? 0)}
                  onClick={() => setHistoryPage(historyPage + 1)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Create/Edit Modal ──────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreateModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {editingRule ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Rule Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Happy Hour — Snacks 20% Off"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              {/* Rule Type + Discount */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Rule Type *</label>
                  <select
                    value={form.rule_type}
                    onChange={(e) => setForm({ ...form, rule_type: e.target.value as PricingRuleType })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {ruleTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Discount Type *</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as PricingDiscountType })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {discountTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {form.discount_type === 'percentage' ? 'Discount (%)' : 'Amount (₱)'} *
                  </label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    min="0"
                    max={form.discount_type === 'percentage' ? '100' : undefined}
                    step="0.01"
                  />
                </div>
              </div>

              {/* Applies To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Applies To *</label>
                  <select
                    value={form.applies_to}
                    onChange={(e) => setForm({ ...form, applies_to: e.target.value as PricingAppliesTo })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {appliesToOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {form.applies_to !== 'all_products' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {form.applies_to === 'specific_products' ? 'Product' : form.applies_to === 'category' ? 'Category' : 'Brand'} IDs
                    </label>
                    <input
                      type="text"
                      value={form.applies_to_ids}
                      onChange={(e) => setForm({ ...form, applies_to_ids: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Comma-separated UUIDs"
                    />
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Date *</label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Priority + Max Uses */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    min="0"
                  />
                  <p className="mt-0.5 text-xs text-gray-400">Higher = applied first</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Max Uses</label>
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    min="1"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              {/* Schedule Toggle */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.schedule_enabled}
                    onChange={(e) => setForm({ ...form, schedule_enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Enable Time-of-Day Schedule
                </label>
              </div>

              {form.schedule_enabled && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Days of Week</label>
                    <div className="flex gap-1">
                      {DAY_NAMES.map((name, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleScheduleDay(i)}
                          className={`rounded px-2.5 py-1 text-xs font-medium ${
                            form.schedule_days.includes(i)
                              ? 'bg-primary-500 text-white'
                              : 'bg-white text-gray-500 border border-gray-300'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Start Time</label>
                      <input
                        type="time"
                        value={form.schedule_start_time}
                        onChange={(e) => setForm({ ...form, schedule_start_time: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">End Time</label>
                      <input
                        type="time"
                        value={form.schedule_end_time}
                        onChange={(e) => setForm({ ...form, schedule_end_time: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Min Quantity</label>
                  <input
                    type="number"
                    value={form.min_quantity}
                    onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    min="1"
                    placeholder="No minimum"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Min Order Value (₱)</label>
                  <input
                    type="number"
                    value={form.min_order_value}
                    onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    min="0"
                    step="0.01"
                    placeholder="No minimum"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.discount_value || !form.start_date || createMutation.isPending || updateMutation.isPending}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ───────────────────────────────── */}
      {detailRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailRule(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-gray-900">{detailRule.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RULE_STATUS_COLORS[detailRule.status]}`}>
                {RULE_STATUS_LABELS[detailRule.status]}
              </span>
            </div>
            {detailRule.description && (
              <p className="mt-1 text-sm text-gray-500">{detailRule.description}</p>
            )}

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Type:</span> <span className="font-medium">{RULE_TYPE_LABELS[detailRule.rule_type]}</span></div>
                <div><span className="text-gray-500">Discount:</span> <span className="font-medium">{formatDiscount(detailRule)}</span></div>
                <div><span className="text-gray-500">Applies To:</span> <span className="font-medium">{APPLIES_TO_LABELS[detailRule.applies_to]}</span></div>
                <div><span className="text-gray-500">Priority:</span> <span className="font-medium">{detailRule.priority}</span></div>
                <div><span className="text-gray-500">Uses:</span> <span className="font-medium">{detailRule.current_uses}{detailRule.max_uses ? ` / ${detailRule.max_uses}` : ''}</span></div>
                <div><span className="text-gray-500">Start:</span> <span className="font-medium">{formatDate(detailRule.start_date)}</span></div>
                {detailRule.end_date && (
                  <div><span className="text-gray-500">End:</span> <span className="font-medium">{formatDate(detailRule.end_date)}</span></div>
                )}
              </div>

              {detailRule.schedule && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="mb-1 text-xs font-medium text-gray-600">Schedule</p>
                  {detailRule.schedule.days_of_week && (
                    <p className="text-sm text-gray-700">
                      Days: {detailRule.schedule.days_of_week.map((d) => DAY_NAMES[d]).join(', ')}
                    </p>
                  )}
                  {detailRule.schedule.start_time && detailRule.schedule.end_time && (
                    <p className="text-sm text-gray-700">Time: {detailRule.schedule.start_time} — {detailRule.schedule.end_time}</p>
                  )}
                </div>
              )}

              {(detailRule.conditions?.min_quantity || detailRule.conditions?.min_order_value) && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="mb-1 text-xs font-medium text-gray-600">Conditions</p>
                  {detailRule.conditions.min_quantity && (
                    <p className="text-sm text-gray-700">Min Quantity: {detailRule.conditions.min_quantity}</p>
                  )}
                  {detailRule.conditions.min_order_value && (
                    <p className="text-sm text-gray-700">Min Order: {formatCurrency(detailRule.conditions.min_order_value)}</p>
                  )}
                </div>
              )}

              {detailRule.applies_to_ids && detailRule.applies_to_ids.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="mb-1 text-xs font-medium text-gray-600">Target IDs</p>
                  <p className="text-xs text-gray-500 break-all">{detailRule.applies_to_ids.join(', ')}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-gray-200 pt-3">
              <button
                onClick={() => setDetailRule(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Action Confirm Modal ───────────────────────── */}
      {actionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setActionConfirm(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 capitalize">{actionConfirm.action} Rule</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to <strong>{actionConfirm.action}</strong> the rule{' '}
              <strong>"{actionConfirm.rule.name}"</strong>?
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setActionConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                No, Cancel
              </button>
              <button
                onClick={() => handleAction(actionConfirm.rule, actionConfirm.action)}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                Yes, {actionConfirm.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ───────────────────────── */}
      {deleteConfirmRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirmRule(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-600">Delete Rule</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to permanently delete <strong>"{deleteConfirmRule.name}"</strong>? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmRule(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(deleteConfirmRule.id, {
                    onSuccess: () => setDeleteConfirmRule(null),
                  });
                }}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
