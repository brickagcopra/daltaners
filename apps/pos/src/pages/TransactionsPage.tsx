import { useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useTerminalStore } from '@/stores/terminal.store';
import { useTransactionsByStore, useVoidTransaction } from '@/hooks/useTransactions';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Transaction } from '@/types/pos';

export function TransactionsPage() {
  const user = useAuthStore((s) => s.user);
  const activeShift = useTerminalStore((s) => s.activeShift);
  const storeId = user?.vendorId;

  const { data: transactions, isLoading } = useTransactionsByStore(storeId ?? undefined);
  const voidTx = useVoidTransaction();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const filtered = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          tx.transaction_number.toLowerCase().includes(q) ||
          tx.items.some((i) => i.product_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [transactions, search, filterType, filterStatus]);

  const handleVoid = async (txId: string) => {
    if (!voidReason.trim()) return;
    try {
      await voidTx.mutateAsync({ id: txId, void_reason: voidReason });
      setVoidConfirmId(null);
      setVoidReason('');
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-pos-border bg-pos-surface px-4 py-3">
        <h1 className="text-lg font-bold text-white">Transactions</h1>
        <p className="text-xs text-gray-500">
          {activeShift ? `Current shift: ${activeShift.total_transactions} transactions` : 'All store transactions'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-pos-border bg-pos-surface px-4 py-2">
        <div className="w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by TX# or product..."
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            }
          />
        </div>

        <div className="flex gap-1">
          {['all', 'sale', 'refund', 'exchange'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterType === t
                  ? 'bg-primary-500/15 text-primary-400'
                  : 'text-gray-400 hover:bg-pos-hover hover:text-gray-300'
              }`}
            >
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {['all', 'completed', 'voided', 'pending'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-primary-500/15 text-primary-400'
                  : 'text-gray-400 hover:bg-pos-hover hover:text-gray-300'
              }`}
            >
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-gray-500">
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Transaction list + detail split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-pos-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <svg className="h-12 w-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
              </svg>
              <p className="text-sm text-gray-500">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-pos-border/50">
              {filtered.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTx(selectedTx?.id === tx.id ? null : tx)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    selectedTx?.id === tx.id
                      ? 'bg-primary-500/5'
                      : 'hover:bg-pos-hover'
                  }`}
                >
                  {/* Type icon */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      tx.type === 'sale'
                        ? 'bg-green-500/15 text-green-400'
                        : tx.type === 'refund'
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-blue-500/15 text-blue-400'
                    }`}
                  >
                    {tx.type === 'sale' ? 'S' : tx.type === 'refund' ? 'R' : 'X'}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-200">{tx.transaction_number}</span>
                      <StatusBadge status={tx.status} />
                    </div>
                    <p className="truncate text-[10px] text-gray-500">
                      {tx.items.map((i) => i.product_name).join(', ')}
                    </p>
                  </div>

                  {/* Amount + time */}
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.status === 'voided'
                          ? 'text-gray-500 line-through'
                          : tx.type === 'refund'
                            ? 'text-red-400'
                            : 'text-green-400'
                      }`}
                    >
                      {tx.type === 'refund' ? '-' : ''}
                      {formatCurrency(tx.total)}
                    </p>
                    <p className="text-[10px] text-gray-600">{formatDateTime(tx.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedTx && (
          <div className="w-[360px] shrink-0 overflow-y-auto border-l border-pos-border bg-pos-surface p-4">
            <div className="space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{selectedTx.transaction_number}</h3>
                  <StatusBadge status={selectedTx.status} />
                </div>
                <p className="text-xs text-gray-500">{formatDateTime(selectedTx.created_at)}</p>
              </div>

              {/* Type + Payment */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-pos-card p-2">
                  <p className="text-[10px] text-gray-500">Type</p>
                  <p className="text-xs font-medium capitalize text-gray-300">{selectedTx.type}</p>
                </div>
                <div className="rounded-lg bg-pos-card p-2">
                  <p className="text-[10px] text-gray-500">Payment</p>
                  <p className="text-xs font-medium uppercase text-gray-300">{selectedTx.payment_method}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="mb-1.5 text-xs font-semibold text-gray-400">
                  Items ({selectedTx.items.length})
                </h4>
                <div className="space-y-1">
                  {selectedTx.items.map((item) => (
                    <div key={item.id} className="rounded bg-pos-card px-2 py-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="truncate text-gray-300">{item.product_name}</span>
                        <span className="ml-2 shrink-0 text-gray-300">{formatCurrency(item.total)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {item.quantity} x {formatCurrency(item.unit_price)}
                        {item.discount_amount > 0 && (
                          <span className="text-red-400"> (-{formatCurrency(item.discount_amount)})</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 rounded-lg bg-pos-card p-3 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedTx.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax (12%)</span>
                  <span>{formatCurrency(selectedTx.tax_amount)}</span>
                </div>
                {selectedTx.discount_amount > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedTx.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-pos-border pt-1 text-sm font-bold text-white">
                  <span>Total</span>
                  <span>{formatCurrency(selectedTx.total)}</span>
                </div>
                {selectedTx.payment_method === 'cash' && (
                  <>
                    <div className="flex justify-between text-gray-400">
                      <span>Tendered</span>
                      <span>{formatCurrency(selectedTx.amount_tendered)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Change</span>
                      <span>{formatCurrency(selectedTx.change_amount)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Void reason */}
              {selectedTx.status === 'voided' && selectedTx.void_reason && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2">
                  <p className="text-[10px] font-medium text-red-400">Void Reason</p>
                  <p className="text-xs text-gray-300">{selectedTx.void_reason}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setReceiptTx(selectedTx)}
                >
                  <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                  </svg>
                  Receipt
                </Button>
                {selectedTx.status === 'completed' && activeShift?.status === 'open' && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => setVoidConfirmId(selectedTx.id)}
                  >
                    <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Void
                  </Button>
                )}
              </div>

              {/* Void confirmation */}
              {voidConfirmId === selectedTx.id && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <p className="mb-2 text-xs font-medium text-red-400">Confirm void transaction?</p>
                  <Input
                    label="Reason"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Enter reason for voiding..."
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setVoidConfirmId(null);
                        setVoidReason('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleVoid(selectedTx.id)}
                      disabled={!voidReason.trim()}
                      loading={voidTx.isPending}
                    >
                      Confirm Void
                    </Button>
                  </div>
                  {voidTx.isError && (
                    <p className="mt-1 text-[10px] text-red-400">
                      {voidTx.error instanceof Error ? voidTx.error.message : 'Failed to void'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        open={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx}
      />
    </div>
  );
}
