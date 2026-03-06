import { useState } from 'react';
import {
  useCustomerOverview,
  useDemographics,
  useAcquisitionChannels,
  useRetentionCohorts,
  useCustomerSegments,
  useCustomerGrowth,
  CHURN_RISK_COLORS,
} from '@/hooks/useCustomerAnalytics';

type Tab = 'overview' | 'demographics' | 'acquisition' | 'retention' | 'segments';

export function CustomerAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'demographics', label: 'Demographics' },
    { key: 'acquisition', label: 'Acquisition' },
    { key: 'retention', label: 'Retention' },
    { key: 'segments', label: 'Segments' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Understand customer behavior, demographics, acquisition, and retention
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'demographics' && <DemographicsTab />}
      {activeTab === 'acquisition' && <AcquisitionTab />}
      {activeTab === 'retention' && <RetentionTab />}
      {activeTab === 'segments' && <SegmentsTab />}
    </div>
  );
}

// ── Overview Tab ────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: overview, isLoading: overviewLoading } = useCustomerOverview();
  const { data: growth, isLoading: growthLoading } = useCustomerGrowth();

  if (overviewLoading) return <div className="py-12 text-center text-gray-500">Loading overview...</div>;
  if (!overview) return <div className="py-12 text-center text-gray-500">No data available</div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Customers" value={overview.total_customers.toLocaleString()} change={overview.total_customers_change} />
        <KpiCard title="Active Customers" value={overview.active_customers.toLocaleString()} change={overview.active_customers_change} />
        <KpiCard title="New (30d)" value={overview.new_customers_30d.toLocaleString()} change={overview.new_customers_change} />
        <KpiCard title="Avg Order Value" value={`P${overview.avg_order_value.toLocaleString()}`} change={overview.avg_order_value_change} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Orders / Customer" value={overview.avg_orders_per_customer.toFixed(1)} change={overview.avg_orders_per_customer_change} />
        <KpiCard title="Lifetime Value" value={`P${overview.customer_lifetime_value.toLocaleString()}`} change={overview.customer_lifetime_value_change} />
        <KpiCard title="Churn Rate" value={`${overview.churn_rate}%`} change={overview.churn_rate_change} invertColor />
        <KpiCard title="NPS Score" value={String(overview.nps_score)} change={overview.nps_score_change} />
      </div>

      {/* Customer Growth Chart */}
      {!growthLoading && growth && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Customer Growth (30 days)</h3>
          <div className="h-48 flex items-end gap-1">
            {growth.map((day) => {
              const maxVal = Math.max(...growth.map((d) => d.new_customers + d.returning_customers));
              const totalHeight = ((day.new_customers + day.returning_customers) / maxVal) * 100;
              const newHeight = (day.new_customers / (day.new_customers + day.returning_customers)) * totalHeight;
              return (
                <div
                  key={day.date}
                  className="group relative flex-1 flex flex-col justify-end"
                  title={`${day.date}: ${day.new_customers} new, ${day.returning_customers} returning`}
                >
                  <div className="rounded-t-sm bg-primary/40" style={{ height: `${totalHeight - newHeight}%` }} />
                  <div className="bg-primary/80" style={{ height: `${newHeight}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-primary/80" /> New</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-primary/40" /> Returning</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Demographics Tab ────────────────────────────────────────────────────

function DemographicsTab() {
  const { data: demographics, isLoading } = useDemographics();

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading demographics...</div>;
  if (!demographics) return <div className="py-12 text-center text-gray-500">No data available</div>;

  const barColors = ['bg-primary', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Age Distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Age Distribution</h3>
          <div className="space-y-3">
            {demographics.age_groups.map((g, i) => (
              <div key={g.group}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-700">{g.group}</span>
                  <span className="text-gray-500">{g.count.toLocaleString()} ({g.percentage}%)</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100">
                  <div className={`h-3 rounded-full ${barColors[i % barColors.length]}`} style={{ width: `${g.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Gender</h3>
          <div className="space-y-3">
            {demographics.gender.map((g, i) => (
              <div key={g.gender}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-700">{g.gender}</span>
                  <span className="text-gray-500">{g.count.toLocaleString()} ({g.percentage}%)</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100">
                  <div className={`h-3 rounded-full ${barColors[i % barColors.length]}`} style={{ width: `${g.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Cities</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">City</th>
                  <th className="pb-2 pr-4 text-right">Customers</th>
                  <th className="pb-2 pr-4 text-right">%</th>
                  <th className="pb-2 text-right">Avg Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {demographics.cities.map((c) => (
                  <tr key={c.city} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-900">{c.city}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{c.count.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{c.percentage}%</td>
                    <td className="py-2 text-right text-gray-600">P{c.avg_order_value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Types */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Device Types</h3>
          <div className="space-y-3">
            {demographics.device_types.map((d, i) => (
              <div key={d.device}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-700">{d.device}</span>
                  <span className="text-gray-500">{d.count.toLocaleString()} ({d.percentage}%)</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100">
                  <div className={`h-3 rounded-full ${barColors[i % barColors.length]}`} style={{ width: `${d.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Preferred Payment Methods</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {demographics.preferred_payment.map((p) => (
              <div key={p.method} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{p.percentage}%</p>
                <p className="mt-1 text-sm text-gray-500">{p.method}</p>
                <p className="text-xs text-gray-400">{p.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Acquisition Tab ─────────────────────────────────────────────────────

function AcquisitionTab() {
  const { data: channels, isLoading } = useAcquisitionChannels();

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading acquisition data...</div>;
  if (!channels) return <div className="py-12 text-center text-gray-500">No data available</div>;

  return (
    <div className="space-y-6">
      {/* Channel Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {channels.map((ch) => (
          <div key={ch.channel} className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{ch.channel}</h4>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {ch.percentage}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Customers</span>
                <p className="font-medium text-gray-900">{ch.customers.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">CPA</span>
                <p className="font-medium text-gray-900">
                  {ch.cost_per_acquisition === 0 ? 'Free' : `P${ch.cost_per_acquisition}`}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Conv. Rate</span>
                <p className="font-medium text-gray-900">{ch.conversion_rate}%</p>
              </div>
              <div>
                <span className="text-gray-500">Avg 1st Order</span>
                <p className="font-medium text-gray-900">P{ch.avg_first_order_value.toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">30-day Retention</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full ${ch.retention_30d >= 50 ? 'bg-green-500' : ch.retention_30d >= 35 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${ch.retention_30d}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{ch.retention_30d}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Channel Comparison</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                <th className="pb-2 pr-4">Channel</th>
                <th className="pb-2 pr-4 text-right">Customers</th>
                <th className="pb-2 pr-4 text-right">Share</th>
                <th className="pb-2 pr-4 text-right">CPA</th>
                <th className="pb-2 pr-4 text-right">Conv.</th>
                <th className="pb-2 pr-4 text-right">1st Order</th>
                <th className="pb-2 text-right">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {channels.map((ch) => (
                <tr key={ch.channel} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">{ch.channel}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{ch.customers.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{ch.percentage}%</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{ch.cost_per_acquisition === 0 ? '-' : `P${ch.cost_per_acquisition}`}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{ch.conversion_rate}%</td>
                  <td className="py-2 pr-4 text-right text-gray-600">P{ch.avg_first_order_value.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-600">{ch.retention_30d}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Retention Tab ───────────────────────────────────────────────────────

function RetentionTab() {
  const { data: cohorts, isLoading } = useRetentionCohorts();

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading retention data...</div>;
  if (!cohorts) return <div className="py-12 text-center text-gray-500">No data available</div>;

  const getCellColor = (value: number): string => {
    if (value === 0) return 'bg-gray-50 text-gray-300';
    if (value >= 60) return 'bg-green-100 text-green-800';
    if (value >= 40) return 'bg-green-50 text-green-700';
    if (value >= 30) return 'bg-yellow-50 text-yellow-800';
    return 'bg-red-50 text-red-700';
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Cohort Retention (%)</h3>
        <p className="mb-4 text-sm text-gray-500">
          Percentage of customers from each cohort who made a purchase in subsequent months
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                <th className="pb-3 pr-4">Cohort</th>
                <th className="pb-3 pr-4 text-right">Users</th>
                <th className="pb-3 px-2 text-center">M1</th>
                <th className="pb-3 px-2 text-center">M2</th>
                <th className="pb-3 px-2 text-center">M3</th>
                <th className="pb-3 px-2 text-center">M4</th>
                <th className="pb-3 px-2 text-center">M5</th>
                <th className="pb-3 px-2 text-center">M6</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cohorts.map((c) => (
                <tr key={c.cohort_month}>
                  <td className="py-2 pr-4 font-medium text-gray-900">{c.cohort_month}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{c.total_users.toLocaleString()}</td>
                  {[c.month_1, c.month_2, c.month_3, c.month_4, c.month_5, c.month_6].map((val, i) => (
                    <td key={i} className="py-2 px-1 text-center">
                      <span className={`inline-block min-w-[3rem] rounded px-2 py-1 text-xs font-medium ${getCellColor(val)}`}>
                        {val > 0 ? `${val}%` : '-'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retention Insights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-center">
          <p className="text-sm text-gray-500">Avg M1 Retention</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {(cohorts.reduce((sum, c) => sum + c.month_1, 0) / cohorts.length).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-center">
          <p className="text-sm text-gray-500">Best Cohort</p>
          <p className="mt-1 text-3xl font-bold text-green-600">
            {cohorts.reduce((best, c) => c.month_1 > best.month_1 ? c : best).cohort_month}
          </p>
          <p className="text-xs text-gray-400">
            {cohorts.reduce((best, c) => c.month_1 > best.month_1 ? c : best).month_1}% M1
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-center">
          <p className="text-sm text-gray-500">Latest Cohort Size</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {cohorts[cohorts.length - 1].total_users.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Segments Tab ────────────────────────────────────────────────────────

function SegmentsTab() {
  const { data: segments, isLoading } = useCustomerSegments();

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading segments...</div>;
  if (!segments) return <div className="py-12 text-center text-gray-500">No data available</div>;

  return (
    <div className="space-y-6">
      {/* Segment Distribution Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Customer Segments Distribution</h3>
        <div className="h-8 flex rounded-lg overflow-hidden">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${seg.percentage}%`, backgroundColor: seg.color }}
              title={`${seg.name}: ${seg.percentage}%`}
            >
              {seg.percentage >= 8 && `${seg.percentage}%`}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {segments.map((seg) => (
            <span key={seg.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: seg.color }} />
              {seg.name}
            </span>
          ))}
        </div>
      </div>

      {/* Segment Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {segments.map((seg) => (
          <div key={seg.id} className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: seg.color }} />
                <h4 className="font-semibold text-gray-900">{seg.name}</h4>
              </div>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CHURN_RISK_COLORS[seg.churn_risk]}`}>
                {seg.churn_risk} risk
              </span>
            </div>
            <p className="mb-3 text-xs text-gray-500">{seg.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Customers</span>
                <p className="font-medium text-gray-900">{seg.customer_count.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Share</span>
                <p className="font-medium text-gray-900">{seg.percentage}%</p>
              </div>
              <div>
                <span className="text-gray-500">Avg Order</span>
                <p className="font-medium text-gray-900">P{seg.avg_order_value.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Orders/Month</span>
                <p className="font-medium text-gray-900">{seg.avg_orders_per_month}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Avg Lifetime Value</span>
                <p className="text-lg font-bold text-gray-900">P{seg.avg_lifetime_value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared Components ───────────────────────────────────────────────────

function KpiCard({ title, value, change, invertColor = false }: { title: string; value: string; change: number; invertColor?: boolean }) {
  const isPositive = invertColor ? change < 0 : change > 0;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className={`mt-1 text-xs font-medium ${isPositive ? 'text-green-600' : change === 0 ? 'text-gray-400' : 'text-red-600'}`}>
        {change > 0 ? '+' : ''}{change}% vs last period
      </p>
    </div>
  );
}

export default CustomerAnalyticsPage;
