import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  useTransactions,
  useTransactionStats,
  useSettlements,
  useSettlementStats,
  useSettlementDetail,
  useGenerateSettlements,
  useApproveSettlement,
  useProcessSettlement,
  useRejectSettlement,
  useAdjustSettlement,
  useWallets,
  useWalletStats,
  type Settlement,
} from '@/hooks/useAccounting';

// ── Helpers ─────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
    case 'processing':
      return 'warning';
    case 'failed':
    case 'reversed':
      return 'destructive';
    default:
      return 'muted';
  }
}

function methodLabel(method: string): string {
  const labels: Record<string, string> = {
    card: 'Card',
    gcash: 'GCash',
    maya: 'Maya',
    grabpay: 'GrabPay',
    cod: 'COD',
    wallet: 'Wallet',
    bank_transfer: 'Bank',
  };
  return labels[method] || method;
}

// ── Stat Card ───────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ────────────────────────────────────────────────────

function OverviewTab() {
  const { data: txnStats, isLoading: txnLoading } = useTransactionStats();
  const { data: settleStats, isLoading: settleLoading } = useSettlementStats();
  const { data: walletStatsData, isLoading: walletLoading } = useWalletStats();

  if (txnLoading || settleLoading || walletLoading) {
    return <LoadingSpinner />;
  }

  const ts = txnStats?.data;
  const ss = settleStats?.data;
  const ws = walletStatsData?.data;

  return (
    <div className="space-y-6">
      {/* Transaction Stats */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Transactions
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(ts?.total_revenue ?? 0)}
            subtitle={`${ts?.completed_count ?? 0} completed transactions`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Pending Amount"
            value={formatCurrency(ts?.pending_amount ?? 0)}
            subtitle="Awaiting confirmation"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Refunds"
            value={formatCurrency(ts?.total_refunds ?? 0)}
            subtitle={`${ts?.refund_count ?? 0} refund transactions`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            }
          />
          <StatCard
            title="Failed"
            value={String(ts?.failed_count ?? 0)}
            subtitle={`of ${ts?.total_transactions ?? 0} total`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Settlement Stats */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Vendor Settlements
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Gross Amount"
            value={formatCurrency(ss?.total_gross ?? 0)}
            subtitle={`${ss?.total_settlements ?? 0} settlements`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
          <StatCard
            title="Commission Earned"
            value={formatCurrency(ss?.total_commission ?? 0)}
            subtitle="Platform revenue share"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            }
          />
          <StatCard
            title="Net Payable"
            value={formatCurrency(ss?.total_net ?? 0)}
            subtitle="After commissions"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <StatCard
            title="Pending Settlements"
            value={String(ss?.pending_count ?? 0)}
            subtitle={`${ss?.completed_count ?? 0} completed`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Wallet Stats */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Digital Wallets
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Wallets"
            value={String(ws?.total_wallets ?? 0)}
            subtitle={`${ws?.active_wallets ?? 0} active`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
          />
          <StatCard
            title="Total Balance"
            value={formatCurrency(ws?.total_balance ?? 0)}
            subtitle="Across all wallets"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Avg. Balance"
            value={formatCurrency(ws?.average_balance ?? 0)}
            subtitle="Per wallet"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            title="Inactive Wallets"
            value={String((ws?.total_wallets ?? 0) - (ws?.active_wallets ?? 0))}
            subtitle="Suspended or deactivated"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

// ── Transactions Tab ────────────────────────────────────────────────

function TransactionsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [type, setType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useTransactions({
    page, limit: 20, search, status, method, type,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const transactions = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by order/user ID..."
          />
        </div>
        <div className="w-40">
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
              { value: 'reversed', label: 'Reversed' },
            ]}
          />
        </div>
        <div className="w-40">
          <Select
            value={method}
            onChange={(e) => { setMethod(e.target.value); setPage(1); }}
            options={[
              { value: 'all', label: 'All Methods' },
              { value: 'card', label: 'Card' },
              { value: 'gcash', label: 'GCash' },
              { value: 'maya', label: 'Maya' },
              { value: 'grabpay', label: 'GrabPay' },
              { value: 'cod', label: 'COD' },
              { value: 'wallet', label: 'Wallet' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
            ]}
          />
        </div>
        <div className="w-36">
          <Select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'charge', label: 'Charge' },
              { value: 'refund', label: 'Refund' },
            ]}
          />
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">
                      {txn.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">
                      {txn.order_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={txn.type === 'refund' ? 'destructive' : 'info'}>
                        {txn.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {methodLabel(txn.method)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(txn.status)}>
                        {txn.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(Number(txn.amount))}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(txn.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        limit={meta.limit}
        onPageChange={setPage}
      />
    </div>
  );
}

// ── Settlement Detail Modal ─────────────────────────────────────────

function SettlementDetailModal({
  settlementId,
  onClose,
}: {
  settlementId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useSettlementDetail(settlementId);
  const settlement = data?.data;

  const approveMutation = useApproveSettlement();
  const processMutation = useProcessSettlement();
  const rejectMutation = useRejectSettlement();
  const adjustMutation = useAdjustSettlement();

  const [actionModal, setActionModal] = useState<'approve' | 'process' | 'reject' | 'adjust' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');

  const handleAction = async () => {
    if (!settlement) return;
    if (actionModal === 'approve') {
      await approveMutation.mutateAsync({ id: settlement.id, notes: actionNotes || undefined });
    } else if (actionModal === 'process') {
      await processMutation.mutateAsync({ id: settlement.id, payment_reference: paymentRef, notes: actionNotes || undefined });
    } else if (actionModal === 'reject') {
      await rejectMutation.mutateAsync({ id: settlement.id, notes: actionNotes });
    } else if (actionModal === 'adjust') {
      await adjustMutation.mutateAsync({ id: settlement.id, adjustment_amount: parseFloat(adjustAmount), notes: actionNotes });
    }
    setActionModal(null);
    setActionNotes('');
    setPaymentRef('');
    setAdjustAmount('');
  };

  const isActionLoading = approveMutation.isPending || processMutation.isPending || rejectMutation.isPending || adjustMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {isLoading || !settlement ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h3 className="text-lg font-bold text-gray-900">Settlement Detail</h3>
              <p className="text-sm text-gray-500">
                {settlement.vendor_name ?? settlement.vendor_id} &middot;{' '}
                {new Date(settlement.period_start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                {' - '}
                {new Date(settlement.period_end).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Gross</p>
                <p className="text-lg font-bold">{formatCurrency(settlement.gross_amount)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Commission</p>
                <p className="text-lg font-bold text-red-600">-{formatCurrency(settlement.commission_amount)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Tax (BIR 2%)</p>
                <p className="text-lg font-bold text-gray-600">-{formatCurrency(settlement.withholding_tax)}</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-gray-500">Final Amount</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(settlement.final_amount)}</p>
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="text-gray-500">Status:</span> <Badge variant={statusBadgeVariant(settlement.status)}>{settlement.status}</Badge></div>
              <div><span className="text-gray-500">Orders:</span> <span className="font-medium">{settlement.order_count ?? '—'}</span></div>
              {settlement.adjustment_amount !== 0 && (
                <div><span className="text-gray-500">Adjustment:</span> <span className="font-medium text-orange-600">{formatCurrency(settlement.adjustment_amount)}</span></div>
              )}
              {settlement.payment_reference && (
                <div><span className="text-gray-500">Ref:</span> <span className="font-mono text-xs">{settlement.payment_reference}</span></div>
              )}
              {settlement.notes && (
                <div className="w-full"><span className="text-gray-500">Notes:</span> <span className="text-gray-700">{settlement.notes}</span></div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {settlement.status === 'pending' && (
                <>
                  <button onClick={() => setActionModal('approve')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Approve</button>
                  <button onClick={() => setActionModal('reject')} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Reject</button>
                  <button onClick={() => setActionModal('adjust')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Adjust</button>
                </>
              )}
              {settlement.status === 'processing' && (
                <button onClick={() => setActionModal('process')} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Mark as Paid</button>
              )}
            </div>

            {/* Order Breakdown */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700">Order Breakdown ({settlement.items?.length ?? 0} orders)</h4>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Order #</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Subtotal</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Rate</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Commission</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Net</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Delivered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(settlement.items ?? []).length === 0 ? (
                      <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400">No items</td></tr>
                    ) : (
                      settlement.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs text-gray-700">{item.order_number}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(item.subtotal)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{item.commission_rate}%</td>
                          <td className="px-3 py-2 text-right text-red-600">-{formatCurrency(item.commission_amount)}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(item.net_amount)}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{new Date(item.delivered_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Action Sub-Modal */}
        {actionModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h4 className="mb-4 text-lg font-semibold capitalize text-gray-900">
                {actionModal === 'approve' && 'Approve Settlement'}
                {actionModal === 'process' && 'Mark as Paid'}
                {actionModal === 'reject' && 'Reject Settlement'}
                {actionModal === 'adjust' && 'Adjust Settlement'}
              </h4>

              {actionModal === 'process' && (
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Payment Reference *</label>
                  <input
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g., REF-20260301-001"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {actionModal === 'adjust' && (
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Adjustment Amount *</label>
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="e.g., -1500 or 500"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-gray-500">Use negative for deductions, positive for additions</p>
                </div>
              )}

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes {actionModal === 'reject' || actionModal === 'adjust' ? '*' : '(optional)'}
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                  placeholder={actionModal === 'reject' ? 'Reason for rejection...' : 'Add notes...'}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setActionModal(null); setActionNotes(''); setPaymentRef(''); setAdjustAmount(''); }}
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={
                    isActionLoading ||
                    (actionModal === 'reject' && !actionNotes) ||
                    (actionModal === 'process' && !paymentRef) ||
                    (actionModal === 'adjust' && (!adjustAmount || !actionNotes))
                  }
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {isActionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settlements Tab ─────────────────────────────────────────────────

function SettlementsTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genFrom, setGenFrom] = useState('');
  const [genTo, setGenTo] = useState('');

  const { data, isLoading } = useSettlements({
    page, limit: 20, status,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const generateMutation = useGenerateSettlements();

  const settlements = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 };

  const handleGenerate = async () => {
    if (!genFrom || !genTo) return;
    await generateMutation.mutateAsync({ period_start: genFrom + 'T00:00:00Z', period_end: genTo + 'T23:59:59Z' });
    setShowGenerate(false);
    setGenFrom('');
    setGenTo('');
  };

  return (
    <div className="space-y-4">
      {/* Filters + Generate button */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'processing', label: 'Processing' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Generate
        </button>
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h4 className="mb-4 text-lg font-semibold text-gray-900">Generate Settlements</h4>
            <p className="mb-4 text-sm text-gray-500">Generate settlements for all vendors with delivered orders in the selected period.</p>
            <div className="mb-3 flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Period Start *</label>
                <input type="date" value={genFrom} onChange={(e) => setGenFrom(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Period End *</label>
                <input type="date" value={genTo} onChange={(e) => setGenTo(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowGenerate(false); setGenFrom(''); setGenTo(''); }} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleGenerate} disabled={!genFrom || !genTo || generateMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                {generateMutation.isPending ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Commission</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Final</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {settlements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    No settlements found
                  </td>
                </tr>
              ) : (
                settlements.map((s: Settlement) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {s.vendor_name ?? s.vendor_id.slice(0, 10) + '...'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(s.period_start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                      {' - '}
                      {new Date(s.period_end).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(s.status)}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {formatCurrency(Number(s.gross_amount))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">
                      -{formatCurrency(Number(s.commission_amount))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(Number(s.final_amount))}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">
                      {s.order_count ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedId(s.id)}
                        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
      )}

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        limit={meta.limit}
        onPageChange={setPage}
      />

      {/* Settlement Detail Modal */}
      {selectedId && (
        <SettlementDetailModal settlementId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

// ── Wallets Tab ─────────────────────────────────────────────────────

function WalletsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const { data, isLoading } = useWallets({ page, limit: 20, search, status });

  const wallets = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-end gap-3">
        <div className="w-64">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by user ID..."
          />
        </div>
        <div className="w-40">
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Wallet ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Balance</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Daily Limit</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Monthly Limit</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {wallets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No wallets found
                  </td>
                </tr>
              ) : (
                wallets.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">
                      {w.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">
                      {w.user_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={w.is_active ? 'success' : 'destructive'}>
                        {w.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(Number(w.balance))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {formatCurrency(Number(w.daily_limit))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {formatCurrency(Number(w.monthly_limit))}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(w.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        limit={meta.limit}
        onPageChange={setPage}
      />
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

export function AccountingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Accounting</h2>
        <p className="text-sm text-gray-500">
          Manage transactions, vendor settlements, and digital wallets
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTab />
        </TabsContent>

        <TabsContent value="settlements">
          <SettlementsTab />
        </TabsContent>

        <TabsContent value="wallets">
          <WalletsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
