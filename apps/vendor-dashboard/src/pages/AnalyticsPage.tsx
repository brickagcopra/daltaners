import { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/stores/auth.store';
import { useVendorAnalytics } from '@/hooks/useAnalytics';
import { cn } from '@/lib/cn';

const STATUS_COLORS: Record<string, string> = {
  pending: '#FBBF24',
  confirmed: '#60A5FA',
  preparing: '#A78BFA',
  ready: '#34D399',
  picked_up: '#2DD4BF',
  in_transit: '#818CF8',
  delivered: '#10B981',
  cancelled: '#F87171',
  returned: '#FB923C',
  refunded: '#94A3B8',
};

const PIE_COLORS = ['#10B981', '#60A5FA', '#A78BFA', '#FBBF24', '#F87171', '#2DD4BF', '#818CF8', '#FB923C', '#94A3B8', '#34D399'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function AnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const storeId = user?.vendorId || null;

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });

  const { data: analytics, isLoading } = useVendorAnalytics(
    storeId,
    dateRange.from || undefined,
    dateRange.to || undefined,
  );

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-500">
        No analytics data available.
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Today's Orders",
      value: analytics.orders.today.toString(),
      subtitle: `${analytics.orders.week} this week`,
      color: 'bg-blue-50 text-blue-700',
      iconColor: 'text-blue-500',
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(analytics.revenue.today),
      subtitle: `${formatCurrency(analytics.revenue.week)} this week`,
      color: 'bg-green-50 text-green-700',
      iconColor: 'text-green-500',
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(analytics.average_order_value),
      subtitle: `${analytics.orders.all_time} total orders`,
      color: 'bg-purple-50 text-purple-700',
      iconColor: 'text-purple-500',
    },
    {
      label: 'Fulfillment Rate',
      value: `${analytics.fulfillment_rate}%`,
      subtitle: `${analytics.avg_preparation_time_minutes} min avg prep`,
      color: 'bg-amber-50 text-amber-700',
      iconColor: 'text-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + date picker */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Store performance metrics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {(dateRange.from || dateRange.to) && (
            <button
              onClick={() => setDateRange({ from: '', to: '' })}
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className={cn('mt-1 text-2xl font-bold', card.color.split(' ')[1])}>
              {card.value}
            </p>
            <p className="mt-1 text-xs text-gray-400">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Revenue (Last 30 Days)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.revenue_by_day}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fontSize: 12 }}
                stroke="#9CA3AF"
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                stroke="#9CA3AF"
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelFormatter={formatShortDate}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders Chart + Orders by Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Orders (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.orders_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 12 }}
                  stroke="#9CA3AF"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  formatter={(value: number) => [value, 'Orders']}
                  labelFormatter={formatShortDate}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Orders by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.orders_by_status}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, count }) => `${status}: ${count}`}
                  labelLine={false}
                >
                  {analytics.orders_by_status.map((entry, index) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products + Peak Hours */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Top Selling Products</h3>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-left font-medium text-gray-500">#</th>
                  <th className="py-2 text-left font-medium text-gray-500">Product</th>
                  <th className="py-2 text-right font-medium text-gray-500">Qty</th>
                  <th className="py-2 text-right font-medium text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {analytics.top_products.map((product, index) => (
                  <tr key={product.product_id} className="border-b border-gray-50">
                    <td className="py-2.5 text-gray-400">{index + 1}</td>
                    <td className="py-2.5 font-medium text-gray-900">{product.product_name}</td>
                    <td className="py-2.5 text-right text-gray-600">{product.quantity}</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(product.revenue)}
                    </td>
                  </tr>
                ))}
                {analytics.top_products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400">
                      No product data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Peak Ordering Hours</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.peak_hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={formatHour}
                  tick={{ fontSize: 11 }}
                  stroke="#9CA3AF"
                  interval={2}
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  formatter={(value: number) => [value, 'Orders']}
                  labelFormatter={(hour: number) => formatHour(hour)}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* All-time summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Period Summary</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Month Revenue</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(analytics.revenue.month)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">All-time Revenue</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(analytics.revenue.all_time)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Month Orders</p>
            <p className="text-lg font-bold text-gray-900">{analytics.orders.month}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">All-time Orders</p>
            <p className="text-lg font-bold text-gray-900">{analytics.orders.all_time}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
