import { useState } from 'react';
import { useWallet, useWalletTransactions, useTopupWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/components/ui/cn';

const TOPUP_AMOUNTS = [100, 500, 1000, 5000];

export function WalletPage() {
  const { data: wallet, isLoading: walletLoading, isError: walletError } = useWallet();
  const [page, setPage] = useState(1);
  const { data: txnData, isLoading: txnLoading } = useWalletTransactions(page, 20);
  const topupMutation = useTopupWallet();
  const [showTopup, setShowTopup] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const transactions = txnData?.items ?? [];
  const meta = txnData?.meta;

  const handleTopup = (amount: number) => {
    if (amount <= 0) return;
    topupMutation.mutate(amount, {
      onSuccess: () => {
        setShowTopup(false);
        setCustomAmount('');
      },
    });
  };

  if (walletLoading) return <LoadingSpinner fullPage />;

  if (walletError) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Failed to load wallet"
          description="Something went wrong while fetching your wallet."
          actionLabel="Try again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Wallet</h1>

      {/* Balance Card */}
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-6 text-white mb-6">
        <p className="text-sm font-medium opacity-90">Available Balance</p>
        <p className="text-3xl font-bold mt-1">
          P{Number(wallet?.balance ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs opacity-75">
            {wallet?.currency || 'PHP'} Wallet
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowTopup(true)}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            Top Up
          </Button>
        </div>
      </div>

      {/* Top Up Modal */}
      {showTopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Top Up Wallet</h2>
              <button
                onClick={() => setShowTopup(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Select an amount or enter a custom amount to top up.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {TOPUP_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTopup(amount)}
                  disabled={topupMutation.isPending}
                  className="rounded-lg border-2 border-border py-3 text-center font-semibold hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  P{amount.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="50000"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                onClick={() => handleTopup(Number(customAmount))}
                disabled={!customAmount || Number(customAmount) <= 0 || topupMutation.isPending}
              >
                {topupMutation.isPending ? 'Processing...' : 'Top Up'}
              </Button>
            </div>

            {topupMutation.isError && (
              <p className="mt-3 text-sm text-destructive">
                Failed to top up. Please try again.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Wallet Limits Info */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">Wallet Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Min Top Up</span>
            <p className="font-medium">P100.00</p>
          </div>
          <div>
            <span className="text-muted-foreground">Max Top Up</span>
            <p className="font-medium">P50,000.00</p>
          </div>
          <div>
            <span className="text-muted-foreground">Max Balance</span>
            <p className="font-medium">P100,000.00</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className={cn('font-medium', wallet?.is_active ? 'text-green-600' : 'text-destructive')}>
              {wallet?.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Transaction History</h2>

      {txnLoading ? (
        <LoadingSpinner />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Your wallet transaction history will appear here."
        />
      ) : (
        <>
          <div className="space-y-3">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    txn.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                  )}>
                    {txn.type === 'credit' ? (
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{txn.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(txn.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'text-sm font-semibold',
                  txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                )}>
                  {txn.type === 'credit' ? '+' : '-'}P{Math.abs(txn.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                Page {page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
