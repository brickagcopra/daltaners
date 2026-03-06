import { useState } from 'react';
import {
  useSettlementSummary,
  useSettlements,
  useSettlementDetail,
  type SettlementFilters,
  type Settlement,
  type SettlementItem,
} from '@/hooks/useFinancials';
import { cn } from '@/lib/cn';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ── Settlement Detail Modal ─────────────────────────────────────── */

function SettlementDetailModal({
  settlementId,
  onClose,
}: {
  settlementId: string;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useSettlementDetail(settlementId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Settlement Detail</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading || !detail ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6 px-6 py-5">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Gross Amount</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(detail.gross_amount)}</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-xs text-gray-500">Commission</p>
                <p className="mt-1 text-lg font-bold text-red-600">-{formatCurrency(detail.commission_amount)}</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <p className="text-xs text-gray-500">Withholding Tax</p>
                <p className="mt-1 text-lg font-bold text-orange-600">-{formatCurrency(detail.withholding_tax)}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-gray-500">Final Amount</p>
                <p className="mt-1 text-lg font-bold text-green-600">{formatCurrency(detail.final_amount)}</p>
              </div>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <span className="text-gray-500">Period:</span>{' '}
                <span className="font-medium text-gray-900">{formatDate(detail.period_start)} — {formatDate(detail.period_end)}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{' '}
                <span className={cn('ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusColors[detail.status])}>
                  {detail.status}
                </span>
              </div>
              {detail.order_count != null && (
                <div>
                  <span className="text-gray-500">Orders:</span>{' '}
                  <span className="font-medium text-gray-900">{detail.order_count}</span>
                </div>
              )}
              {detail.adjustment_amount !== 0 && (
                <div>
                  <span className="text-gray-500">Adjustment:</span>{' '}
                  <span className={cn('font-medium', detail.adjustment_amount > 0 ? 'text-green-600' : 'text-red-600')}>
                    {detail.adjustment_amount > 0 ? '+' : ''}{formatCurrency(detail.adjustment_amount)}
                  </span>
                </div>
              )}
              {detail.payment_reference && (
                <div>
                  <span className="text-gray-500">Reference:</span>{' '}
                  <span className="font-mono text-xs font-medium text-gray-900">{detail.payment_reference}</span>
                </div>
              )}
              {detail.settlement_date && (
                <div>
                  <span className="text-gray-500">Settled:</span>{' '}
                  <span className="font-medium text-gray-900">{formatDate(detail.settlement_date)}</span>
                </div>
              )}
              {detail.notes && (
                <div className="col-span-full">
                  <span className="text-gray-500">Notes:</span>{' '}
                  <span className="text-gray-700">{detail.notes}</span>
                </div>
              )}
            </div>

            {/* Order Breakdown Table */}
            {detail.items && detail.items.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Order Breakdown</h3>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Order</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Subtotal</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Rate</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Commission</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Net</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Delivered</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.items.map((item: SettlementItem) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-900">{item.order_number}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-gray-900">{formatCurrency(item.subtotal)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-gray-500">{item.commission_rate}%</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-red-600">-{formatCurrency(item.commission_amount)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(item.net_amount)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-500">{formatDate(item.delivered_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */

export function FinancialsPage() {
  const [filters, setFilters] = useState<SettlementFilters>({
    status: 'all',
    page: 1,
    limit: 10,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: summary, isLoading: summaryLoading } = useSettlementSummary();
  const { data: settlementsResp, isLoading: settlementsLoading } = useSettlements(filters);

  const settlements = settlementsResp?.data ?? [];
  const meta = settlementsResp?.meta;

  const summaryCards = [
    { label: 'Total Earned', value: summary?.total_earned ?? 0, color: 'text-green-600' },
    { label: 'Paid Out', value: summary?.total_paid_out ?? 0, color: 'text-blue-600' },
    { label: 'Pending', value: summary?.total_pending ?? 0, color: 'text-yellow-600' },
    { label: 'Commission', value: summary?.total_commission ?? 0, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
        <p className="mt-1 text-sm text-gray-500">Track your earnings, settlements, and commission.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            {summaryLoading ? (
              <div className="mt-2 h-8 w-32 animate-pulse rounded bg-gray-100" />
            ) : (
              <p className={cn('mt-2 text-2xl font-bold', card.color)}>
                {formatCurrency(card.value)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <input
          type="date"
          value={filters.period_start ?? ''}
          onChange={(e) => setFilters({ ...filters, period_start: e.target.value || undefined, page: 1 })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="From"
        />

        <input
          type="date"
          value={filters.period_end ?? ''}
          onChange={(e) => setFilters({ ...filters, period_end: e.target.value || undefined, page: 1 })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="To"
        />
      </div>

      {/* Settlements Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Gross</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Commission</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tax</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Final</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Settlement Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {settlementsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                    No settlements found.
                  </td>
                </tr>
              ) : (
                (settlements as Settlement[]).map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedId(s.id)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {formatDate(s.period_start)} — {formatDate(s.period_end)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {formatCurrency(s.gross_amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-red-600">
                      -{formatCurrency(s.commission_amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      -{formatCurrency(s.withholding_tax)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(s.final_amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusColors[s.status] || 'bg-gray-100 text-gray-600')}>
                        {s.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDate(s.settlement_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(s.id);
                        }}
                        className="rounded-lg bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100"
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
        {meta && (meta.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages ?? 1} ({meta.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) - 1 })}
                disabled={(filters.page ?? 1) <= 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) + 1 })}
                disabled={(filters.page ?? 1) >= (meta.totalPages ?? 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settlement Detail Modal */}
      {selectedId && (
        <SettlementDetailModal
          settlementId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
