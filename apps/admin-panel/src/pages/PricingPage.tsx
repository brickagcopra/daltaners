import { useState } from 'react';
import {
  useAdminPricingRules,
  useAdminPricingStats,
  useAdminPriceHistory,
  useForceExpirePricingRule,
  useForceCancelPricingRule,
  RULE_STATUS_LABELS,
  RULE_STATUS_COLORS,
  RULE_TYPE_LABELS,
  RULE_TYPE_COLORS,
  APPLIES_TO_LABELS,
  CHANGE_TYPE_LABELS,
  type PricingRule,
  type PriceHistoryEntry,
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

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Paused', value: 'paused' },
  { label: 'Draft', value: 'draft' },
  { label: 'Expired', value: 'expired' },
  { label: 'Cancelled', value: 'cancelled' },
];

const ruleTypeFilterOptions = [
  { label: 'All Types', value: 'all' },
  { label: 'Time-Based', value: 'time_based' },
  { label: 'Happy Hour', value: 'happy_hour' },
  { label: 'Flash Sale', value: 'flash_sale' },
  { label: 'Bulk Discount', value: 'bulk_discount' },
  { label: 'Scheduled Price', value: 'scheduled_price' },
];

export function PricingPage() {
  // ── Tab state ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');

  // ── Rules state ────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // ── History state ──────────────────────────────────────
  const [historyPage, setHistoryPage] = useState(1);
  const [changeTypeFilter, setChangeTypeFilter] = useState('all');

  // ── Modal state ────────────────────────────────────────
  const [detailRule, setDetailRule] = useState<PricingRule | null>(null);
  const [actionModal, setActionModal] = useState<{ rule: PricingRule; action: 'force-expire' | 'force-cancel' } | null>(null);

  // ── Queries ────────────────────────────────────────────
  const { data: rulesData, isLoading } = useAdminPricingRules({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    rule_type: typeFilter !== 'all' ? typeFilter : undefined,
    page,
    limit: 20,
  });
  const { data: stats } = useAdminPricingStats();
  const { data: historyData, isLoading: historyLoading } = useAdminPriceHistory({
    change_type: changeTypeFilter !== 'all' ? changeTypeFilter : undefined,
    page: historyPage,
    limit: 20,
  });

  // ── Mutations ──────────────────────────────────────────
  const forceExpireMutation = useForceExpirePricingRule();
  const forceCancelMutation = useForceCancelPricingRule();

  const rules: PricingRule[] = rulesData?.data?.data || [];
  const meta = rulesData?.data?.meta as { page?: number; totalPages?: number; total?: number } | undefined;
  const historyList: PriceHistoryEntry[] = historyData?.data?.data || [];
  const historyMeta = historyData?.data?.meta as { page?: number; totalPages?: number; total?: number } | undefined;

  function handleAdminAction(rule: PricingRule, action: 'force-expire' | 'force-cancel') {
    if (action === 'force-expire') {
      forceExpireMutation.mutate(rule.id, { onSuccess: () => setActionModal(null) });
    } else {
      forceCancelMutation.mutate(rule.id, { onSuccess: () => setActionModal(null) });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pricing Oversight</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and manage dynamic pricing rules across all vendor stores
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: 'Total Rules', value: stats.total, color: 'text-gray-900' },
            { label: 'Active', value: stats.active, color: 'text-green-600' },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-600' },
            { label: 'Paused', value: stats.paused, color: 'text-yellow-600' },
            { label: 'Draft', value: stats.draft, color: 'text-gray-500' },
            { label: 'Expired', value: stats.expired, color: 'text-red-600' },
            { label: 'Cancelled', value: stats.cancelled, color: 'text-gray-400' },
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
          All Rules
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
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search rules..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {ruleTypeFilterOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Rules Table */}
          {isLoading ? (
            <div className="py-16 text-center text-gray-400">Loading pricing rules...</div>
          ) : rules.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No pricing rules found</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Store</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Discount</th>
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
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{rule.store_id.slice(0, 12)}...</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RULE_TYPE_COLORS[rule.rule_type] || 'bg-gray-100 text-gray-700'}`}>
                          {RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDiscount(rule)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RULE_STATUS_COLORS[rule.status] || 'bg-gray-100 text-gray-700'}`}>
                          {RULE_STATUS_LABELS[rule.status] || rule.status}
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
                          {/* View detail */}
                          <button
                            onClick={() => setDetailRule(rule)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="View Details"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          {/* Force expire */}
                          {['active', 'scheduled', 'paused'].includes(rule.status) && (
                            <button
                              onClick={() => setActionModal({ rule, action: 'force-expire' })}
                              className="rounded p-1 text-orange-400 hover:bg-orange-50 hover:text-orange-600"
                              title="Force Expire"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                          )}
                          {/* Force cancel */}
                          {!['expired', 'cancelled'].includes(rule.status) && (
                            <button
                              onClick={() => setActionModal({ rule, action: 'force-cancel' })}
                              className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                              title="Force Cancel"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
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
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Store</th>
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
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{entry.store_id.slice(0, 12)}...</td>
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
                          <span className="font-medium text-gray-900">
                            {formatCurrency(entry.new_sale_price)}
                          </span>
                        ) : (
                          <span className="text-gray-400">Reverted</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{entry.rule_name || '—'}</td>
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

      {/* ─── Detail Modal ───────────────────────────────── */}
      {detailRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailRule(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-gray-900">{detailRule.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RULE_STATUS_COLORS[detailRule.status] || ''}`}>
                {RULE_STATUS_LABELS[detailRule.status] || detailRule.status}
              </span>
            </div>
            {detailRule.description && (
              <p className="mt-1 text-sm text-gray-500">{detailRule.description}</p>
            )}

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Store:</span> <span className="font-mono text-xs">{detailRule.store_id}</span></div>
                <div><span className="text-gray-500">Type:</span> <span className="font-medium">{RULE_TYPE_LABELS[detailRule.rule_type] || detailRule.rule_type}</span></div>
                <div><span className="text-gray-500">Discount:</span> <span className="font-medium">{formatDiscount(detailRule)}</span></div>
                <div><span className="text-gray-500">Applies To:</span> <span className="font-medium">{APPLIES_TO_LABELS[detailRule.applies_to] || detailRule.applies_to}</span></div>
                <div><span className="text-gray-500">Priority:</span> <span className="font-medium">{detailRule.priority}</span></div>
                <div><span className="text-gray-500">Uses:</span> <span className="font-medium">{detailRule.current_uses}{detailRule.max_uses ? ` / ${detailRule.max_uses}` : ''}</span></div>
                <div><span className="text-gray-500">Start:</span> <span className="font-medium">{formatDate(detailRule.start_date)}</span></div>
                {detailRule.end_date && (
                  <div><span className="text-gray-500">End:</span> <span className="font-medium">{formatDate(detailRule.end_date)}</span></div>
                )}
                <div><span className="text-gray-500">Created:</span> <span className="font-medium">{formatDate(detailRule.created_at)}</span></div>
                <div><span className="text-gray-500">Updated:</span> <span className="font-medium">{formatDate(detailRule.updated_at)}</span></div>
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
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
              <div className="flex gap-2">
                {['active', 'scheduled', 'paused'].includes(detailRule.status) && (
                  <button
                    onClick={() => { setDetailRule(null); setActionModal({ rule: detailRule, action: 'force-expire' }); }}
                    className="rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50"
                  >
                    Force Expire
                  </button>
                )}
                {!['expired', 'cancelled'].includes(detailRule.status) && (
                  <button
                    onClick={() => { setDetailRule(null); setActionModal({ rule: detailRule, action: 'force-cancel' }); }}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Force Cancel
                  </button>
                )}
              </div>
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
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setActionModal(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-bold ${actionModal.action === 'force-cancel' ? 'text-red-600' : 'text-orange-600'}`}>
              {actionModal.action === 'force-expire' ? 'Force Expire Rule' : 'Force Cancel Rule'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to <strong>{actionModal.action === 'force-expire' ? 'force expire' : 'force cancel'}</strong> the rule{' '}
              <strong>"{actionModal.rule.name}"</strong> (store: {actionModal.rule.store_id.slice(0, 12)}...)?
            </p>
            <p className="mt-1 text-xs text-gray-400">This is an admin override action and cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAdminAction(actionModal.rule, actionModal.action)}
                disabled={forceExpireMutation.isPending || forceCancelMutation.isPending}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  actionModal.action === 'force-cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {forceExpireMutation.isPending || forceCancelMutation.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PricingPage;
