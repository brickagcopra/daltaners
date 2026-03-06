import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, StatCard } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyTable } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  useSalesSummary,
  useProductSales,
  useHourlySales,
  useCashierPerformance,
  usePaymentBreakdown,
} from '@/hooks/useReports';
import { useShiftsByStore } from '@/hooks/useShifts';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Shift } from '@/types/pos';

const REPORT_TABS = [
  { id: 'x-report', label: 'X-Report (Current)' },
  { id: 'z-report', label: 'Z-Report (End of Day)' },
  { id: 'history', label: 'Shift History' },
];

const PIE_COLORS = ['#FF6B35', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

function getDateRange(period: string): { start_date: string; end_date: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(today);
  end.setDate(end.getDate() + 1);

  switch (period) {
    case 'yesterday': {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      return { start_date: start.toISOString(), end_date: today.toISOString() };
    }
    case 'week': {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay());
      return { start_date: start.toISOString(), end_date: end.toISOString() };
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start_date: start.toISOString(), end_date: end.toISOString() };
    }
    default: {
      return { start_date: today.toISOString(), end_date: end.toISOString() };
    }
  }
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('x-report');
  const [period, setPeriod] = useState('today');
  const user = useAuthStore((s) => s.user);
  const storeId = user?.vendorId;

  const dateRange = useMemo(() => getDateRange(period), [period]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-pos-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Sales reports and shift analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={PERIOD_OPTIONS}
            className="w-40"
          />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            Print Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex-shrink-0">
        <Tabs tabs={REPORT_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {activeTab === 'x-report' && <XReportView storeId={storeId} dateRange={dateRange} />}
        {activeTab === 'z-report' && <ZReportView storeId={storeId} dateRange={dateRange} />}
        {activeTab === 'history' && <ShiftHistoryView storeId={storeId} />}
      </div>
    </div>
  );
}

/* ---- X-Report: Live / current period report ---- */
function XReportView({ storeId, dateRange }: { storeId: string | undefined; dateRange: { start_date: string; end_date: string } }) {
  const { data: summary, isLoading: summaryLoading } = useSalesSummary(storeId, dateRange);
  const { data: hourly, isLoading: hourlyLoading } = useHourlySales(storeId, dateRange);
  const { data: products, isLoading: productsLoading } = useProductSales(storeId, { ...dateRange, limit: 10 });
  const { data: payments, isLoading: paymentsLoading } = usePaymentBreakdown(storeId, dateRange);

  const isLoading = summaryLoading || hourlyLoading || productsLoading || paymentsLoading;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Net Sales"
          value={formatCurrency(summary?.net_sales ?? 0)}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Total Sales"
          value={formatCurrency(summary?.total_sales ?? 0)}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>}
        />
        <StatCard
          label="Transactions"
          value={summary?.total_transactions ?? 0}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          label="Avg Transaction"
          value={formatCurrency(summary?.average_transaction ?? 0)}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>}
        />
        <StatCard
          label="Refunds"
          value={formatCurrency(summary?.total_refunds ?? 0)}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly Sales Chart */}
        <Card className="lg:col-span-2" padding="lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Hourly Sales</h3>
          {hourly && hourly.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#363b44" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={formatHour}
                  stroke="#9ca3af"
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#23272f', border: '1px solid #363b44', borderRadius: 8, color: '#e5e7eb' }}
                  labelFormatter={formatHour}
                  formatter={(value: number) => [formatCurrency(value), 'Sales']}
                />
                <Bar dataKey="sales" fill="#FF6B35" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-500 text-sm">No hourly data</div>
          )}
        </Card>

        {/* Payment Breakdown Pie */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Payment Methods</h3>
          {payments && payments.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={payments}
                  dataKey="total"
                  nameKey="method"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={3}
                  label={({ method, percentage }) => `${method} ${percentage}%`}
                  labelLine={{ stroke: '#9ca3af' }}
                >
                  {payments.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
                  formatter={(value: string) => <span className="text-gray-400 capitalize">{value}</span>}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#23272f', border: '1px solid #363b44', borderRadius: 8, color: '#e5e7eb' }}
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-500 text-sm">No payment data</div>
          )}
        </Card>
      </div>

      {/* Bottom row: Product Sales + Tax/Discount */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products */}
        <Card className="lg:col-span-2" padding="none">
          <div className="px-4 py-3 border-b border-pos-border">
            <h3 className="text-sm font-semibold text-gray-300">Top Products</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead align="right">Qty Sold</TableHead>
                <TableHead align="right">Total Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && products.length > 0 ? (
                products.map((p, i) => (
                  <TableRow key={p.product_id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <span className="text-white font-medium">{p.product_name}</span>
                    </TableCell>
                    <TableCell align="right">{p.quantity_sold}</TableCell>
                    <TableCell align="right">{formatCurrency(p.total_sales)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyTable colSpan={4} message="No product sales data" />
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Tax & Discount Summary */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Breakdown</h3>
          <div className="space-y-3">
            <SummaryRow label="Gross Sales" value={formatCurrency(summary?.total_sales ?? 0)} />
            <SummaryRow label="Refunds" value={`-${formatCurrency(summary?.total_refunds ?? 0)}`} negative />
            <SummaryRow label="Voids" value={`-${formatCurrency(summary?.total_voids ?? 0)}`} negative />
            <div className="border-t border-pos-border pt-3">
              <SummaryRow label="Net Sales" value={formatCurrency(summary?.net_sales ?? 0)} bold />
            </div>
            <div className="border-t border-pos-border pt-3 space-y-3">
              <SummaryRow label="Tax Collected" value={formatCurrency(summary?.total_tax ?? 0)} />
              <SummaryRow label="Discounts Given" value={formatCurrency(summary?.total_discount ?? 0)} />
              <SummaryRow label="Items Sold" value={String(summary?.total_items_sold ?? 0)} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---- Z-Report: End of day with cashier performance ---- */
function ZReportView({ storeId, dateRange }: { storeId: string | undefined; dateRange: { start_date: string; end_date: string } }) {
  const { data: summary, isLoading: summaryLoading } = useSalesSummary(storeId, dateRange);
  const { data: cashiers, isLoading: cashiersLoading } = useCashierPerformance(storeId, dateRange);
  const { data: payments, isLoading: paymentsLoading } = usePaymentBreakdown(storeId, dateRange);
  const { data: products, isLoading: productsLoading } = useProductSales(storeId, { ...dateRange, limit: 20 });

  const isLoading = summaryLoading || cashiersLoading || paymentsLoading || productsLoading;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Z-Report Header */}
      <Card padding="lg" className="border-primary-500/30 bg-gradient-to-r from-pos-card to-pos-surface">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Z-Report (End of Day)</h2>
            <p className="text-sm text-gray-400 mt-1">Complete sales summary for the selected period</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Net Sales</p>
            <p className="text-3xl font-bold text-primary-400">{formatCurrency(summary?.net_sales ?? 0)}</p>
          </div>
        </div>
      </Card>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Transactions" value={summary?.total_transactions ?? 0} />
        <StatCard label="Average Transaction" value={formatCurrency(summary?.average_transaction ?? 0)} />
        <StatCard label="Total Tax" value={formatCurrency(summary?.total_tax ?? 0)} />
        <StatCard label="Total Discounts" value={formatCurrency(summary?.total_discount ?? 0)} />
      </div>

      {/* Cashier Performance */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-pos-border">
          <h3 className="text-sm font-semibold text-gray-300">Cashier Performance</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cashier</TableHead>
              <TableHead align="right">Transactions</TableHead>
              <TableHead align="right">Total Sales</TableHead>
              <TableHead align="right">Avg Transaction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashiers && cashiers.length > 0 ? (
              cashiers.map((c) => (
                <TableRow key={c.cashier_id}>
                  <TableCell>
                    <span className="text-white font-medium">{c.cashier_name}</span>
                  </TableCell>
                  <TableCell align="right">{c.transactions}</TableCell>
                  <TableCell align="right">{formatCurrency(c.total_sales)}</TableCell>
                  <TableCell align="right">{formatCurrency(c.avg_transaction)}</TableCell>
                </TableRow>
              ))
            ) : (
              <EmptyTable colSpan={4} message="No cashier data" />
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Payment Methods + Full Product List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods Table */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-pos-border">
            <h3 className="text-sm font-semibold text-gray-300">Payment Method Summary</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead align="right">Count</TableHead>
                <TableHead align="right">Total</TableHead>
                <TableHead align="right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments && payments.length > 0 ? (
                payments.map((p) => (
                  <TableRow key={p.method}>
                    <TableCell>
                      <span className="text-white font-medium capitalize">{p.method}</span>
                    </TableCell>
                    <TableCell align="right">{p.count}</TableCell>
                    <TableCell align="right">{formatCurrency(p.total)}</TableCell>
                    <TableCell align="right">{p.percentage}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyTable colSpan={4} message="No payment data" />
              )}
            </TableBody>
          </Table>
        </Card>

        {/* All Products Sold */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-pos-border">
            <h3 className="text-sm font-semibold text-gray-300">All Products Sold</h3>
          </div>
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead align="right">Qty</TableHead>
                  <TableHead align="right">Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products && products.length > 0 ? (
                  products.map((p) => (
                    <TableRow key={p.product_id}>
                      <TableCell>
                        <span className="text-white">{p.product_name}</span>
                      </TableCell>
                      <TableCell align="right">{p.quantity_sold}</TableCell>
                      <TableCell align="right">{formatCurrency(p.total_sales)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <EmptyTable colSpan={3} message="No product data" />
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---- Shift History ---- */
function ShiftHistoryView({ storeId }: { storeId: string | undefined }) {
  const { data: shifts, isLoading } = useShiftsByStore(storeId);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const sortedShifts = useMemo(() => {
    if (!shifts) return [];
    return [...shifts].sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
  }, [shifts]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Shift List */}
      <Card className="lg:col-span-2" padding="none">
        <div className="px-4 py-3 border-b border-pos-border">
          <h3 className="text-sm font-semibold text-gray-300">All Shifts</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opened</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Transactions</TableHead>
              <TableHead align="right">Sales</TableHead>
              <TableHead align="right">Cash Diff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedShifts.length > 0 ? (
              sortedShifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>
                    <button
                      onClick={() => setSelectedShift(shift)}
                      className="text-primary-400 hover:text-primary-300 hover:underline text-left"
                    >
                      {formatDateTime(shift.opened_at)}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="text-white">{shift.cashier_name || 'Unknown'}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      shift.status === 'open'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {shift.status}
                    </span>
                  </TableCell>
                  <TableCell align="right">{shift.total_transactions}</TableCell>
                  <TableCell align="right">{formatCurrency(shift.total_sales)}</TableCell>
                  <TableCell align="right">
                    {shift.cash_difference != null ? (
                      <span className={shift.cash_difference >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {shift.cash_difference >= 0 ? '+' : ''}{formatCurrency(shift.cash_difference)}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <EmptyTable colSpan={6} message="No shift history" />
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Selected Shift Detail */}
      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Shift Details</h3>
        {selectedShift ? (
          <div className="space-y-3">
            <SummaryRow label="Cashier" value={selectedShift.cashier_name || 'Unknown'} />
            <SummaryRow label="Opened" value={formatDateTime(selectedShift.opened_at)} />
            {selectedShift.closed_at && (
              <SummaryRow label="Closed" value={formatDateTime(selectedShift.closed_at)} />
            )}
            <div className="border-t border-pos-border pt-3 space-y-3">
              <SummaryRow label="Opening Cash" value={formatCurrency(selectedShift.opening_cash)} />
              {selectedShift.closing_cash != null && (
                <SummaryRow label="Closing Cash" value={formatCurrency(selectedShift.closing_cash)} />
              )}
              {selectedShift.expected_cash != null && (
                <SummaryRow label="Expected Cash" value={formatCurrency(selectedShift.expected_cash)} />
              )}
              {selectedShift.cash_difference != null && (
                <SummaryRow
                  label="Difference"
                  value={`${selectedShift.cash_difference >= 0 ? '+' : ''}${formatCurrency(selectedShift.cash_difference)}`}
                  negative={selectedShift.cash_difference < 0}
                />
              )}
            </div>
            <div className="border-t border-pos-border pt-3 space-y-3">
              <SummaryRow label="Transactions" value={String(selectedShift.total_transactions)} />
              <SummaryRow label="Total Sales" value={formatCurrency(selectedShift.total_sales)} bold />
              <SummaryRow label="Total Refunds" value={formatCurrency(selectedShift.total_refunds)} />
              <SummaryRow label="Total Voids" value={formatCurrency(selectedShift.total_voids)} />
            </div>
            {selectedShift.payment_totals && Object.keys(selectedShift.payment_totals).length > 0 && (
              <div className="border-t border-pos-border pt-3 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Payment Methods</p>
                {Object.entries(selectedShift.payment_totals).map(([method, total]) => (
                  <SummaryRow key={method} label={method} value={formatCurrency(total as number)} />
                ))}
              </div>
            )}
            {selectedShift.close_notes && (
              <div className="border-t border-pos-border pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Close Notes</p>
                <p className="text-sm text-gray-300">{selectedShift.close_notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-sm">Select a shift to view details</p>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---- Helper Components ---- */

function SummaryRow({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-white' : negative ? 'text-red-400' : 'text-gray-200'}`}>
        {value}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-20 bg-pos-border rounded" />
              <div className="h-7 w-28 bg-pos-border rounded" />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="animate-pulse h-[260px] bg-pos-border/30 rounded" />
        </Card>
        <Card>
          <div className="animate-pulse h-[260px] bg-pos-border/30 rounded" />
        </Card>
      </div>
    </div>
  );
}
