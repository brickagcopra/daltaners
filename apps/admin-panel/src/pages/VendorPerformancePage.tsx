import { useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useAdminPerformanceList,
  useAdminPerformanceBenchmarks,
  useAdminTopPerformers,
  useAdminBottomPerformers,
  useAdminStorePerformanceHistory,
  useRecalculateAllPerformance,
  useRecalculateStorePerformance,
  type PerformanceTier,
} from '@/hooks/usePerformance';
import { cn } from '@/lib/cn';

const TIER_CONFIG: Record<PerformanceTier, { label: string; color: string; bg: string; chartColor: string }> = {
  excellent: { label: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-100', chartColor: '#10B981' },
  good: { label: 'Good', color: 'text-blue-700', bg: 'bg-blue-100', chartColor: '#3B82F6' },
  average: { label: 'Average', color: 'text-amber-700', bg: 'bg-amber-100', chartColor: '#F59E0B' },
  poor: { label: 'Poor', color: 'text-orange-700', bg: 'bg-orange-100', chartColor: '#F97316' },
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-100', chartColor: '#EF4444' },
  unrated: { label: 'Unrated', color: 'text-gray-700', bg: 'bg-gray-100', chartColor: '#9CA3AF' },
};

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function VendorPerformancePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('performance_score');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const { data: listData, isLoading: listLoading } = useAdminPerformanceList({
    page,
    limit: 20,
    search: search || undefined,
    tier: tierFilter || undefined,
    category: categoryFilter || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const { data: benchmarks } = useAdminPerformanceBenchmarks();
  const { data: topPerformers } = useAdminTopPerformers(5);
  const { data: bottomPerformers } = useAdminBottomPerformers(5);
  const { data: storeHistory } = useAdminStorePerformanceHistory(selectedStoreId, 30);

  const recalculateAll = useRecalculateAllPerformance();
  const recalculateStore = useRecalculateStorePerformance();

  const stores = listData?.data || [];
  const meta = listData?.meta;

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Performance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage store performance across the platform
          </p>
        </div>
        <button
          onClick={() => recalculateAll.mutate()}
          disabled={recalculateAll.isPending}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {recalculateAll.isPending ? 'Recalculating...' : 'Recalculate All'}
        </button>
      </div>

      {/* Platform Summary Cards */}
      {benchmarks && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Stores Rated</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{benchmarks.total_stores_rated}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Avg Performance Score</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{benchmarks.avg_performance_score.toFixed(1)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Avg Fulfillment Rate</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatPercent(benchmarks.avg_fulfillment_rate)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Avg Rating</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{benchmarks.avg_rating.toFixed(2)} / 5</p>
          </div>
        </div>
      )}

      {/* Tier Distribution + Top/Bottom */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tier Distribution Pie */}
        {benchmarks && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Tier Distribution</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={benchmarks.tier_distribution}
                    dataKey="count"
                    nameKey="tier"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ tier, count }) => `${tier}: ${count}`}
                    labelLine={false}
                  >
                    {benchmarks.tier_distribution.map((entry) => (
                      <Cell
                        key={entry.tier}
                        fill={TIER_CONFIG[entry.tier as PerformanceTier]?.chartColor || '#9CA3AF'}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top Performers */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Top Performers</h3>
          <div className="space-y-2">
            {(topPerformers || []).map((store, i) => (
              <button
                key={store.store_id}
                onClick={() => setSelectedStoreId(store.store_id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50',
                  selectedStoreId === store.store_id && 'bg-primary-50',
                )}
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{store.store_name}</p>
                  <p className="text-xs text-gray-500">{store.store_category}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600">{store.performance_score.toFixed(1)}</span>
              </button>
            ))}
            {(!topPerformers || topPerformers.length === 0) && (
              <p className="py-4 text-center text-sm text-gray-400">No data</p>
            )}
          </div>
        </div>

        {/* Bottom Performers */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Needs Improvement</h3>
          <div className="space-y-2">
            {(bottomPerformers || []).map((store, i) => (
              <button
                key={store.store_id}
                onClick={() => setSelectedStoreId(store.store_id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50',
                  selectedStoreId === store.store_id && 'bg-primary-50',
                )}
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{store.store_name}</p>
                  <p className="text-xs text-gray-500">{store.store_category}</p>
                </div>
                <span className="text-sm font-bold text-red-600">{store.performance_score.toFixed(1)}</span>
              </button>
            ))}
            {(!bottomPerformers || bottomPerformers.length === 0) && (
              <p className="py-4 text-center text-sm text-gray-400">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* Selected Store History Chart */}
      {selectedStoreId && storeHistory && storeHistory.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Performance History: {stores.find((s) => s.store_id === selectedStoreId)?.store_name || selectedStoreId}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  recalculateStore.mutate(selectedStoreId);
                }}
                disabled={recalculateStore.isPending}
                className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                {recalculateStore.isPending ? 'Recalculating...' : 'Recalculate'}
              </button>
              <button
                onClick={() => setSelectedStoreId(null)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={storeHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="snapshot_date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 11 }}
                  stroke="#9CA3AF"
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip labelFormatter={formatShortDate} />
                <Line
                  type="monotone"
                  dataKey="performance_score"
                  name="Score"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="fulfillment_rate"
                  name="Fulfillment %"
                  stroke="#3B82F6"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search store name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Tiers</option>
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="average">Average</option>
          <option value="poor">Poor</option>
          <option value="critical">Critical</option>
          <option value="unrated">Unrated</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Categories</option>
          <option value="grocery">Grocery</option>
          <option value="restaurant">Restaurant</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="electronics">Electronics</option>
          <option value="general">General</option>
        </select>
        {(search || tierFilter || categoryFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setTierFilter('');
              setCategoryFilter('');
              setPage(1);
            }}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Performance Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Store</th>
                <ThSort label="Score" field="performance_score" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Tier</th>
                <ThSort label="Fulfillment" field="fulfillment_rate" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <ThSort label="Cancel" field="cancellation_rate" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <ThSort label="Rating" field="avg_rating" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <ThSort label="Returns" field="return_rate" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <ThSort label="Disputes" field="dispute_rate" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <ThSort label="Orders" field="total_orders" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listLoading && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                  </td>
                </tr>
              )}
              {!listLoading && stores.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    No stores match your filters
                  </td>
                </tr>
              )}
              {stores.map((store) => {
                const t = TIER_CONFIG[store.performance_tier];
                return (
                  <tr
                    key={store.store_id}
                    className={cn(
                      'transition-colors hover:bg-gray-50',
                      selectedStoreId === store.store_id && 'bg-primary-50',
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{store.store_name || store.store_id}</p>
                        <p className="text-xs text-gray-500 capitalize">{store.store_category}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ScoreBar score={store.performance_score} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', t.bg, t.color)}>
                        {t.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {formatPercent(store.fulfillment_rate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className={store.cancellation_rate > 5 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                        {formatPercent(store.cancellation_rate)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {store.avg_rating.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className={store.return_rate > 3 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                        {formatPercent(store.return_rate)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className={store.dispute_rate > 2 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                        {formatPercent(store.dispute_rate)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {store.total_orders.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => setSelectedStoreId(
                          selectedStoreId === store.store_id ? null : store.store_id,
                        )}
                        className="rounded px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                      >
                        {selectedStoreId === store.store_id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="rounded-lg px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= meta.totalPages}
                className="rounded-lg px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Score Distribution Chart */}
      {benchmarks && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Platform Metrics Summary</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { metric: 'Fulfillment', value: benchmarks.avg_fulfillment_rate },
                  { metric: 'Cancel', value: benchmarks.avg_cancellation_rate },
                  { metric: 'Return', value: benchmarks.avg_return_rate },
                  { metric: 'Dispute', value: benchmarks.avg_dispute_rate },
                  { metric: 'Rating', value: (benchmarks.avg_rating / 5) * 100 },
                  { metric: 'Score', value: benchmarks.avg_performance_score },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Platform Avg']} />
                <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper components

function ThSort({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
}: {
  label: string;
  field: string;
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
}) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
      <button
        className="flex items-center gap-1 hover:text-gray-700"
        onClick={() => onSort(field)}
      >
        {label}
        <span className="text-[10px]">
          {sortBy === field ? (sortOrder === 'ASC' ? '\u2191' : '\u2193') : '\u2195'}
        </span>
      </button>
    </th>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 85 ? 'bg-emerald-500' :
    score >= 70 ? 'bg-blue-500' :
    score >= 50 ? 'bg-amber-500' :
    score >= 30 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-900">{score.toFixed(1)}</span>
    </div>
  );
}
