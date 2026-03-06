import { useState } from 'react';
import {
  useRevenueSummary,
  useRevenueByPeriod,
  useRevenueByCategory,
  useRevenueByZone,
  useRevenueByPaymentMethod,
  useSettlementSummary,
  useFeeSummary,
  useRefundSummary,
  useExportReport,
  REFUND_REASON_LABELS,
  PAYMENT_METHOD_LABELS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '@/hooks/useReports';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const formatNumber = (v: number) => new Intl.NumberFormat('en-PH').format(v);
const formatPercent = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

const PIE_COLORS = ['#27AE60', '#FF6B35', '#004E89', '#F2994A', '#FFD700', '#9B59B6'];

type Tab = 'revenue' | 'settlements' | 'fees' | 'refunds';

export function FinancialReportsPage() {
  const [tab, setTab] = useState<Tab>('revenue');
  const exportReport = useExportReport();

  const handleExport = (section: string, format: 'csv' | 'pdf') => {
    exportReport.mutate(
      { format, section },
      {
        onSuccess: (data) => {
          window.open(data.download_url, '_blank');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-sm text-gray-500">Revenue analytics, settlements, fees, and refund reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport(tab, 'csv')}
            disabled={exportReport.isPending}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport(tab, 'pdf')}
            disabled={exportReport.isPending}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {([
            { key: 'revenue', label: 'Revenue' },
            { key: 'settlements', label: 'Settlements' },
            { key: 'fees', label: 'Platform Fees' },
            { key: 'refunds', label: 'Refunds' },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'revenue' && <RevenueTab />}
      {tab === 'settlements' && <SettlementsTab />}
      {tab === 'fees' && <FeesTab />}
      {tab === 'refunds' && <RefundsTab />}
    </div>
  );
}

// ==================== REVENUE TAB ====================
function RevenueTab() {
  const { data: summary, isLoading: summaryLoading } = useRevenueSummary();
  const { data: byPeriod } = useRevenueByPeriod();
  const { data: byCategory } = useRevenueByCategory();
  const { data: byZone } = useRevenueByZone();
  const { data: byPayment } = useRevenueByPaymentMethod();

  if (summaryLoading) return <div className="py-12 text-center text-gray-500">Loading revenue data...</div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Total Revenue" value={formatCurrency(summary.total_revenue)} subtitle={formatPercent(summary.growth_rate)} positive={summary.growth_rate > 0} />
          <StatCard title="Total Orders" value={formatNumber(summary.total_orders)} subtitle={`AOV: ${formatCurrency(summary.average_order_value)}`} />
          <StatCard title="Net Revenue" value={formatCurrency(summary.net_revenue)} subtitle="After fees & refunds" />
          <StatCard title="Total Refunds" value={formatCurrency(summary.total_refunds)} subtitle={`${((summary.total_refunds / summary.total_revenue) * 100).toFixed(1)}% of revenue`} negative />
        </div>
      )}

      {/* Revenue Trend Chart */}
      {byPeriod?.data && byPeriod.data.length > 0 && (
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Daily Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={byPeriod.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tickFormatter={(v: string) => v.slice(5)} fontSize={12} />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} fontSize={12} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l: string) => `Date: ${l}`} />
              <Bar dataKey="revenue" fill="#FF6B35" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net_revenue" fill="#004E89" name="Net Revenue" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue by Category + Payment Method */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Category */}
        {byCategory && byCategory.length > 0 && (
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Revenue by Category</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byCategory.map((c) => ({ ...c, name: CATEGORY_LABELS[c.category] || c.category }))}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percentage }: { name: string; percentage: number }) => `${name} (${percentage}%)`}
                >
                  {byCategory.map((c) => (
                    <Cell key={c.category} fill={CATEGORY_COLORS[c.category] || '#888'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {byCategory.map((c) => (
                <div key={c.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c.category] || '#888' }} />
                    <span>{CATEGORY_LABELS[c.category] || c.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{formatNumber(c.orders)} orders</span>
                    <span className="font-medium">{formatCurrency(c.revenue)}</span>
                    <span className={`text-xs ${c.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(c.growth_rate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Payment Method */}
        {byPayment && byPayment.length > 0 && (
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Revenue by Payment Method</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byPayment.map((p) => ({ ...p, name: PAYMENT_METHOD_LABELS[p.method] || p.method }))}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percentage }: { name: string; percentage: number }) => `${name} (${percentage}%)`}
                >
                  {byPayment.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {byPayment.map((p, i) => (
                <div key={p.method} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span>{PAYMENT_METHOD_LABELS[p.method] || p.method}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{formatNumber(p.transactions)} txns</span>
                    <span className="font-medium">{formatCurrency(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Revenue by Zone */}
      {byZone && byZone.length > 0 && (
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Revenue by Zone</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">Zone</th>
                  <th className="pb-3 font-medium">City</th>
                  <th className="pb-3 text-right font-medium">Revenue</th>
                  <th className="pb-3 text-right font-medium">Orders</th>
                  <th className="pb-3 text-right font-medium">Share</th>
                  <th className="pb-3 text-right font-medium">Avg Delivery Time</th>
                </tr>
              </thead>
              <tbody>
                {byZone.map((z) => (
                  <tr key={z.zone_id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{z.zone_name}</td>
                    <td className="py-3 text-gray-500">{z.city}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(z.revenue)}</td>
                    <td className="py-3 text-right">{formatNumber(z.orders)}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 rounded-full bg-gray-200">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${z.percentage}%` }} />
                        </div>
                        <span>{z.percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">{z.avg_delivery_time_minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SETTLEMENTS TAB ====================
function SettlementsTab() {
  const { data: summary, isLoading } = useSettlementSummary();

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading settlement data...</div>;
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Settled" value={formatCurrency(summary.total_settled)} subtitle={`${summary.settlement_count} settlements`} positive />
        <StatCard title="Pending" value={formatCurrency(summary.total_pending)} subtitle="Awaiting approval" />
        <StatCard title="Processing" value={formatCurrency(summary.total_processing)} subtitle="Bank transfer in progress" />
        <StatCard title="Failed" value={formatCurrency(summary.total_failed)} subtitle="Requires attention" negative />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Settlement Overview</h3>
          <div className="space-y-4">
            <MetricRow label="Average Settlement Amount" value={formatCurrency(summary.avg_settlement_amount)} />
            <MetricRow label="Total Commission Collected" value={formatCurrency(summary.total_commission_collected)} />
            <MetricRow label="Total Tax Withheld (EWT)" value={formatCurrency(summary.total_tax_withheld)} />
            <MetricRow label="Settlement Count" value={formatNumber(summary.settlement_count)} />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Settlement Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Settled', value: summary.total_settled },
                  { name: 'Pending', value: summary.total_pending },
                  { name: 'Processing', value: summary.total_processing },
                  { name: 'Failed', value: summary.total_failed },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                <Cell fill="#27AE60" />
                <Cell fill="#F2994A" />
                <Cell fill="#004E89" />
                <Cell fill="#EB5757" />
              </Pie>
              <Legend />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ==================== FEES TAB ====================
function FeesTab() {
  const { data: fees, isLoading } = useFeeSummary();

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading fee data...</div>;
  if (!fees) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Platform Fees" value={formatCurrency(fees.total_platform_fees)} subtitle="All fee types combined" />
        <StatCard title="Commission Earned" value={formatCurrency(fees.total_commission_earned)} subtitle={`Avg rate: ${fees.avg_commission_rate}%`} />
        <StatCard title="Delivery Fees" value={formatCurrency(fees.total_delivery_fees)} subtitle="Charged to customers" />
        <StatCard title="Service Fees" value={formatCurrency(fees.total_service_fees)} subtitle="Platform service charge" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Commission by Category Bar Chart */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Commission by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fees.commission_by_category} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} fontSize={12} />
              <YAxis type="category" dataKey="category" width={120} fontSize={12} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="amount" fill="#FF6B35" name="Commission" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fee Breakdown Table */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Fee Breakdown</h3>
          <div className="space-y-4">
            {fees.commission_by_category.map((c) => (
              <div key={c.category} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.category}</p>
                  <p className="text-sm text-gray-500">{c.percentage}% of total commission</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(c.amount)}</p>
                  <div className="mt-1 h-2 w-24 rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Average Commission Rate</span>
              <span className="text-lg font-bold text-primary">{fees.avg_commission_rate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== REFUNDS TAB ====================
function RefundsTab() {
  const { data: refunds, isLoading } = useRefundSummary();

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading refund data...</div>;
  if (!refunds) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Refunds" value={formatNumber(refunds.total_refunds)} subtitle={`${refunds.refund_rate}% refund rate`} negative />
        <StatCard title="Refund Amount" value={formatCurrency(refunds.total_refund_amount)} subtitle="Total refunded" negative />
        <StatCard title="Avg Refund" value={formatCurrency(refunds.avg_refund_amount)} subtitle="Per refund transaction" />
        <StatCard title="Refund Rate" value={`${refunds.refund_rate}%`} subtitle="Of all orders" negative />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Refunds by Reason */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Refunds by Reason</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={refunds.refunds_by_reason} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={12} />
              <YAxis
                type="category"
                dataKey="reason"
                width={140}
                fontSize={11}
                tickFormatter={(v: string) => REFUND_REASON_LABELS[v] || v}
              />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === 'count' ? `${v} refunds` : formatCurrency(v)
                }
                labelFormatter={(l: string) => REFUND_REASON_LABELS[l] || l}
              />
              <Bar dataKey="count" fill="#EB5757" name="count" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Refunds by Method */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Refunds by Method</h3>
          <div className="space-y-4">
            {refunds.refunds_by_method.map((m) => (
              <div key={m.method} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{m.method}</p>
                  <p className="text-sm text-gray-500">{m.count} refunds</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(m.amount)}</p>
                  <div className="mt-1 h-2 w-24 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-red-400"
                      style={{ width: `${(m.amount / refunds.total_refund_amount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-500">Top Refund Reasons</h4>
            <div className="space-y-2">
              {refunds.refunds_by_reason.slice(0, 4).map((r) => (
                <div key={r.reason} className="flex items-center justify-between text-sm">
                  <span>{REFUND_REASON_LABELS[r.reason] || r.reason}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{r.percentage}%</span>
                    <span className="font-medium">{formatCurrency(r.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SHARED COMPONENTS ====================
function StatCard({
  title,
  value,
  subtitle,
  positive,
  negative,
}: {
  title: string;
  value: string;
  subtitle?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {subtitle && (
        <p
          className={`mt-1 text-xs ${
            positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export default FinancialReportsPage;
