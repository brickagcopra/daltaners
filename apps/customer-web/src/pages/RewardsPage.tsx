import { useState } from 'react';
import { useLoyaltyAccount, useLoyaltyTransactions } from '@/hooks/useLoyalty';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/components/ui/cn';

const TIER_CONFIG = {
  bronze: { label: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300', next: 'Silver', nextMin: 1000 },
  silver: { label: 'Silver', color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-400', next: 'Gold', nextMin: 5000 },
  gold: { label: 'Gold', color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-400', next: 'Platinum', nextMin: 15000 },
  platinum: { label: 'Platinum', color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-400', next: null, nextMin: Infinity },
} as const;

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'] as const;

const FILTER_TABS = [
  { label: 'All', value: undefined },
  { label: 'Earned', value: 'earn' },
  { label: 'Redeemed', value: 'redeem' },
  { label: 'Bonus', value: 'bonus' },
];

export function RewardsPage() {
  const { data: account, isLoading: accountLoading, isError: accountError } = useLoyaltyAccount();
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState(0);
  const filterType = FILTER_TABS[activeFilter].value;
  const { data: txnData, isLoading: txnLoading } = useLoyaltyTransactions(page, 20, filterType);

  const transactions = txnData?.items ?? [];
  const meta = txnData?.meta;

  if (accountLoading) return <LoadingSpinner fullPage />;

  if (accountError) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Failed to load rewards"
          description="Something went wrong while fetching your loyalty account."
          actionLabel="Try again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  const tier = (account?.tier || 'bronze') as keyof typeof TIER_CONFIG;
  const tierInfo = TIER_CONFIG[tier];
  const lifetimePoints = account?.lifetime_points ?? 0;
  const currentTierIndex = TIER_ORDER.indexOf(tier);

  // Calculate progress to next tier
  const currentTierMin = currentTierIndex > 0
    ? TIER_CONFIG[TIER_ORDER[currentTierIndex - 1]]?.nextMin ?? 0
    : 0;
  const nextTierMin = tierInfo.nextMin;
  const progressPercent = nextTierMin === Infinity
    ? 100
    : Math.min(100, ((lifetimePoints - currentTierMin) / (nextTierMin - currentTierMin)) * 100);

  return (
    <div className="container-app py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Rewards</h1>

      {/* Tier Card */}
      <div className={cn('rounded-xl border-2 p-6 mb-6', tierInfo.border, tierInfo.bg)}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <svg className={cn('h-6 w-6', tierInfo.color)} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className={cn('text-lg font-bold', tierInfo.color)}>
                {tierInfo.label} Member
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {account?.tier_expires_at
                ? `Tier valid until ${new Date(account.tier_expires_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`
                : 'Keep earning to level up!'
              }
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              {(account?.points_balance ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Available Points</p>
          </div>
        </div>
      </div>

      {/* Tier Progress */}
      <div className="rounded-lg border border-border p-4 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Tier Progress</h3>

        {/* Progress Bar */}
        <div className="relative mb-3">
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Tier markers */}
          <div className="flex justify-between mt-1">
            {TIER_ORDER.map((t, i) => (
              <div key={t} className="text-center">
                <div className={cn(
                  'mx-auto h-2 w-2 rounded-full',
                  i <= currentTierIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                )} />
                <span className={cn(
                  'text-[10px]',
                  i <= currentTierIndex ? 'text-primary font-medium' : 'text-muted-foreground'
                )}>
                  {TIER_CONFIG[t].label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {tierInfo.next
            ? `Earn ${(nextTierMin - lifetimePoints).toLocaleString()} more lifetime points to reach ${tierInfo.next}`
            : 'You have reached the highest tier!'
          }
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Lifetime points: {lifetimePoints.toLocaleString()}
        </p>
      </div>

      {/* Tier Benefits */}
      <div className="rounded-lg border border-border p-4 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Your Benefits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-primary">1 pt / P1</p>
            <p className="text-xs text-muted-foreground">Base earning rate</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-primary">
              {tier === 'bronze' ? '0%' : tier === 'silver' ? '5%' : tier === 'gold' ? '10%' : '15%'}
            </p>
            <p className="text-xs text-muted-foreground">Bonus points rate</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-primary">P0.50 / pt</p>
            <p className="text-xs text-muted-foreground">Redemption value</p>
          </div>
        </div>
      </div>

      {/* Points History */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Points History</h2>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTER_TABS.map((tab, idx) => (
          <button
            key={tab.label}
            onClick={() => { setActiveFilter(idx); setPage(1); }}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              activeFilter === idx
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {txnLoading ? (
        <LoadingSpinner />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No points activity"
          description="Start shopping to earn reward points!"
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
                    txn.points > 0 ? 'bg-green-100' : 'bg-red-100'
                  )}>
                    {txn.points > 0 ? (
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
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                        txn.type === 'earn' ? 'bg-green-100 text-green-700' :
                        txn.type === 'redeem' ? 'bg-red-100 text-red-700' :
                        txn.type === 'bonus' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {txn.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(txn.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    'text-sm font-semibold',
                    txn.points > 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {txn.points > 0 ? '+' : ''}{txn.points.toLocaleString()} pts
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Bal: {txn.balance_after.toLocaleString()}
                  </p>
                </div>
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
