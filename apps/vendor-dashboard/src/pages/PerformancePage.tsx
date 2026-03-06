import { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useMyPerformance,
  useMyPerformanceHistory,
  usePerformanceBenchmarks,
  type PerformanceTier,
} from '@/hooks/usePerformance';
import { cn } from '@/lib/cn';

const TIER_CONFIG: Record<PerformanceTier, { label: string; color: string; bg: string }> = {
  excellent: { label: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  good: { label: 'Good', color: 'text-blue-700', bg: 'bg-blue-100' },
  average: { label: 'Average', color: 'text-amber-700', bg: 'bg-amber-100' },
  poor: { label: 'Poor', color: 'text-orange-700', bg: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-100' },
  unrated: { label: 'Unrated', color: 'text-gray-700', bg: 'bg-gray-100' },
};

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function PerformancePage() {
  const [historyDays, setHistoryDays] = useState(30);

  const { data: metrics, isLoading: metricsLoading } = useMyPerformance();
  const { data: history, isLoading: historyLoading } = useMyPerformanceHistory(historyDays);
  const { data: benchmarks, isLoading: benchmarksLoading } = usePerformanceBenchmarks();

  if (metricsLoading || historyLoading || benchmarksLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-500">
        No performance data available yet. Keep fulfilling orders to build your score.
      </div>
    );
  }

  const tier = TIER_CONFIG[metrics.performance_tier];

  // Score gauge data
  const scorePercent = Math.min(100, Math.max(0, metrics.performance_score));

  // Radar chart: compare vendor vs platform benchmarks
  const radarData = benchmarks
    ? [
        {
          metric: 'Fulfillment',
          vendor: metrics.fulfillment_rate,
          platform: benchmarks.avg_fulfillment_rate,
        },
        {
          metric: 'Rating',
          vendor: (metrics.avg_rating / 5) * 100,
          platform: (benchmarks.avg_rating / 5) * 100,
        },
        {
          metric: 'On-time',
          vendor: metrics.on_time_delivery_rate,
          platform: 85, // approximate platform avg
        },
        {
          metric: 'Reviews',
          vendor: metrics.review_response_rate,
          platform: 60, // approximate
        },
        {
          metric: 'Low Cancel',
          vendor: Math.max(0, 100 - metrics.cancellation_rate * 10),
          platform: Math.max(0, 100 - benchmarks.avg_cancellation_rate * 10),
        },
        {
          metric: 'Low Disputes',
          vendor: Math.max(0, 100 - metrics.dispute_rate * 10),
          platform: Math.max(0, 100 - benchmarks.avg_dispute_rate * 10),
        },
      ]
    : [];

  const metricCards = [
    {
      label: 'Performance Score',
      value: `${metrics.performance_score.toFixed(1)}/100`,
      extra: tier.label,
      extraClass: cn(tier.bg, tier.color),
    },
    {
      label: 'Total Orders',
      value: metrics.total_orders.toLocaleString(),
      extra: formatCurrency(metrics.total_revenue),
      extraClass: 'bg-green-50 text-green-700',
    },
    {
      label: 'Fulfillment Rate',
      value: formatPercent(metrics.fulfillment_rate),
      extra: `${metrics.fulfilled_orders} fulfilled`,
      extraClass: metrics.fulfillment_rate >= 90 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Cancellation Rate',
      value: formatPercent(metrics.cancellation_rate),
      extra: `${metrics.cancelled_orders} cancelled`,
      extraClass: metrics.cancellation_rate <= 5 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
    },
    {
      label: 'On-time Delivery',
      value: formatPercent(metrics.on_time_delivery_rate),
      extra: `${metrics.avg_preparation_time_min.toFixed(0)} min avg prep`,
      extraClass: metrics.on_time_delivery_rate >= 85 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Average Rating',
      value: `${metrics.avg_rating.toFixed(2)} / 5`,
      extra: `${metrics.review_count} reviews`,
      extraClass: metrics.avg_rating >= 4.0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Return Rate',
      value: formatPercent(metrics.return_rate),
      extra: `${metrics.total_returns} returns`,
      extraClass: metrics.return_rate <= 3 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
    },
    {
      label: 'Dispute Rate',
      value: formatPercent(metrics.dispute_rate),
      extra: `${metrics.total_disputes} disputes`,
      extraClass: metrics.dispute_rate <= 2 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Performance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your performance metrics over the last {metrics.period_days} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', tier.bg, tier.color)}>
            {tier.label} Tier
          </span>
          <span className="text-sm text-gray-400">
            Updated {new Date(metrics.calculated_at).toLocaleDateString('en-PH')}
          </span>
        </div>
      </div>

      {/* Score Gauge + Tier */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-8">
          {/* Circular score gauge */}
          <div className="relative flex h-36 w-36 flex-shrink-0 items-center justify-center">
            <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={
                  scorePercent >= 85 ? '#10B981' :
                  scorePercent >= 70 ? '#3B82F6' :
                  scorePercent >= 50 ? '#F59E0B' :
                  scorePercent >= 30 ? '#F97316' : '#EF4444'
                }
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(scorePercent / 100) * 314} 314`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{metrics.performance_score.toFixed(1)}</span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
          </div>

          {/* Tier thresholds */}
          <div className="flex-1">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Tier Thresholds</h3>
            <div className="space-y-2">
              {[
                { tier: 'excellent', min: 85, color: 'bg-emerald-500' },
                { tier: 'good', min: 70, color: 'bg-blue-500' },
                { tier: 'average', min: 50, color: 'bg-amber-500' },
                { tier: 'poor', min: 30, color: 'bg-orange-500' },
                { tier: 'critical', min: 0, color: 'bg-red-500' },
              ].map((t) => (
                <div key={t.tier} className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full', t.color)} />
                  <span className={cn(
                    'text-sm capitalize',
                    metrics.performance_tier === t.tier ? 'font-bold text-gray-900' : 'text-gray-500',
                  )}>
                    {t.tier}
                  </span>
                  <span className="text-xs text-gray-400">
                    {t.min > 0 ? `${t.min}+` : `< 30`}
                  </span>
                  {metrics.performance_tier === t.tier && (
                    <span className="text-xs font-medium text-primary-600">You are here</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick improvement tips */}
          <div className="flex-1">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Quick Tips</h3>
            <ul className="space-y-1.5 text-sm text-gray-600">
              {metrics.fulfillment_rate < 90 && (
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-amber-500">!</span>
                  Improve fulfillment rate (currently {formatPercent(metrics.fulfillment_rate)})
                </li>
              )}
              {metrics.avg_rating < 4.0 && (
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-amber-500">!</span>
                  Work on customer satisfaction (rating: {metrics.avg_rating.toFixed(1)})
                </li>
              )}
              {metrics.review_response_rate < 80 && (
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-amber-500">!</span>
                  Respond to more reviews ({formatPercent(metrics.review_response_rate)} response rate)
                </li>
              )}
              {metrics.cancellation_rate > 5 && (
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-red-500">!</span>
                  Reduce cancellations ({formatPercent(metrics.cancellation_rate)})
                </li>
              )}
              {metrics.performance_score >= 85 && (
                <li className="flex items-start gap-1.5 text-emerald-600">
                  <span className="mt-0.5">&#10003;</span>
                  Great job! Maintain your excellent performance.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{card.value}</p>
            <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium', card.extraClass)}>
              {card.extra}
            </span>
          </div>
        ))}
      </div>

      {/* Performance Score Trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Performance Score Trend</h3>
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setHistoryDays(d)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                  historyDays === d
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history || []}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="snapshot_date"
                tickFormatter={formatShortDate}
                tick={{ fontSize: 12 }}
                stroke="#9CA3AF"
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}`, 'Score']}
                labelFormatter={formatShortDate}
              />
              <Area
                type="monotone"
                dataKey="performance_score"
                stroke="#10B981"
                fill="url(#scoreGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fulfillment + Rating Trend + Radar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Fulfillment & Cancellation Trend */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Fulfillment & Cancellation Rate</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history || []}>
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
                  dataKey="fulfillment_rate"
                  name="Fulfillment %"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="cancellation_rate"
                  name="Cancel %"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart: You vs Platform */}
        {benchmarks && radarData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Your Store vs Platform Average</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Your Store"
                    dataKey="vendor"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Platform Avg"
                    dataKey="platform"
                    stroke="#9CA3AF"
                    fill="#9CA3AF"
                    fillOpacity={0.1}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Your Store
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400" /> Platform Avg
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Rating + Revenue Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Average Rating Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="snapshot_date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 11 }}
                  stroke="#9CA3AF"
                />
                <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip labelFormatter={formatShortDate} />
                <Line
                  type="monotone"
                  dataKey="avg_rating"
                  name="Avg Rating"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Daily Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="snapshot_date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 11 }}
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
                <Bar dataKey="total_revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Platform Benchmarks */}
      {benchmarks && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Platform Benchmarks</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {[
              {
                label: 'Avg Fulfillment',
                value: formatPercent(benchmarks.avg_fulfillment_rate),
                yours: formatPercent(metrics.fulfillment_rate),
                better: metrics.fulfillment_rate >= benchmarks.avg_fulfillment_rate,
              },
              {
                label: 'Avg Cancel Rate',
                value: formatPercent(benchmarks.avg_cancellation_rate),
                yours: formatPercent(metrics.cancellation_rate),
                better: metrics.cancellation_rate <= benchmarks.avg_cancellation_rate,
              },
              {
                label: 'Avg Return Rate',
                value: formatPercent(benchmarks.avg_return_rate),
                yours: formatPercent(metrics.return_rate),
                better: metrics.return_rate <= benchmarks.avg_return_rate,
              },
              {
                label: 'Avg Dispute Rate',
                value: formatPercent(benchmarks.avg_dispute_rate),
                yours: formatPercent(metrics.dispute_rate),
                better: metrics.dispute_rate <= benchmarks.avg_dispute_rate,
              },
              {
                label: 'Avg Rating',
                value: benchmarks.avg_rating.toFixed(2),
                yours: metrics.avg_rating.toFixed(2),
                better: metrics.avg_rating >= benchmarks.avg_rating,
              },
              {
                label: 'Avg Score',
                value: benchmarks.avg_performance_score.toFixed(1),
                yours: metrics.performance_score.toFixed(1),
                better: metrics.performance_score >= benchmarks.avg_performance_score,
              },
              {
                label: 'Avg Prep Time',
                value: `${benchmarks.avg_preparation_time.toFixed(0)} min`,
                yours: `${metrics.avg_preparation_time_min.toFixed(0)} min`,
                better: metrics.avg_preparation_time_min <= benchmarks.avg_preparation_time,
              },
            ].map((b) => (
              <div key={b.label} className="text-center">
                <p className="text-xs text-gray-500">{b.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-400">{b.value}</p>
                <p className={cn('mt-0.5 text-sm font-bold', b.better ? 'text-emerald-600' : 'text-red-500')}>
                  {b.yours} {b.better ? '\u2191' : '\u2193'}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-gray-400">
            Based on {benchmarks.total_stores_rated} rated stores on the platform
          </p>
        </div>
      )}
    </div>
  );
}
