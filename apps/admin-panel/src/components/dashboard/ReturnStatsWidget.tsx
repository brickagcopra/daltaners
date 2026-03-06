import { useReturnStats, RETURN_STATUS_LABELS, type ReturnStatus } from '@/hooks/useReturns';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  denied: 'bg-red-500',
  cancelled: 'bg-gray-400',
  received: 'bg-blue-500',
  refunded: 'bg-emerald-500',
  escalated: 'bg-orange-500',
};

export function ReturnStatsWidget() {
  const { data: statsData, isLoading } = useReturnStats();
  const stats = statsData?.data;

  if (isLoading || !stats) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Returns Overview</h3>
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    `P${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const statusEntries = Object.entries(stats.by_status || {}).sort(
    ([, a], [, b]) => (b as number) - (a as number),
  );
  const total = stats.total || 1;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Returns Overview</h3>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">total returns</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Total Refunds</p>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(stats.total_refund_amount)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Avg Resolution</p>
          <p className="text-sm font-bold text-gray-900">{stats.avg_resolution_hours.toFixed(1)}h</p>
        </div>
      </div>

      {/* Status breakdown */}
      {statusEntries.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">No return data</p>
      ) : (
        <div className="space-y-2.5">
          {statusEntries.map(([status, count]) => {
            const pct = ((count as number) / total * 100).toFixed(1);
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="w-20 text-xs text-gray-600">
                  {RETURN_STATUS_LABELS[status as ReturnStatus] || status}
                </span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${statusColors[status] || 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-xs font-medium text-gray-700">
                  {count as number}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
