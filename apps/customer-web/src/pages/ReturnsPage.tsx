import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyReturns, RETURN_STATUS_LABELS, RETURN_REASON_LABELS, type ReturnStatus } from '@/hooks/useReturns';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/components/ui/cn';

const STATUS_BADGE_VARIANT: Record<ReturnStatus, 'default' | 'success' | 'destructive' | 'warning' | 'muted' | 'secondary'> = {
  pending: 'default',
  approved: 'success',
  denied: 'destructive',
  cancelled: 'muted',
  received: 'secondary',
  refunded: 'success',
  escalated: 'warning',
};

const FILTER_TABS: { label: string; status: ReturnStatus | null }[] = [
  { label: 'All', status: null },
  { label: 'Pending', status: 'pending' },
  { label: 'Approved', status: 'approved' },
  { label: 'Refunded', status: 'refunded' },
  { label: 'Denied', status: 'denied' },
];

export function ReturnsPage() {
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState(0);

  const selectedStatus = FILTER_TABS[activeFilter].status;
  const { data, isLoading, isError } = useMyReturns({
    page,
    limit: 10,
    status: selectedStatus ?? undefined,
  });

  const returns = data?.data ?? [];
  const meta = data?.meta;

  if (isLoading) return <LoadingSpinner fullPage />;

  if (isError) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Failed to load returns"
          description="Something went wrong while fetching your return requests."
          actionLabel="Try again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Returns</h1>
        <Link to="/orders">
          <Button variant="outline" size="sm">Back to Orders</Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {FILTER_TABS.map((tab, idx) => (
          <button
            key={tab.label}
            onClick={() => { setActiveFilter(idx); setPage(1); }}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              activeFilter === idx
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {returns.length === 0 ? (
        <EmptyState
          title="No return requests"
          description={
            activeFilter === 0
              ? "You haven't submitted any return requests yet."
              : `No ${FILTER_TABS[activeFilter].label.toLowerCase()} returns.`
          }
          actionLabel="View Orders"
          onAction={() => window.location.href = '/orders'}
        />
      ) : (
        <>
          <div className="space-y-4">
            {returns.map((ret) => (
              <Link key={ret.id} to={`/returns/${ret.id}`}>
                <Card className="p-4 hover:border-primary/30 cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{ret.request_number}</span>
                        <Badge variant={STATUS_BADGE_VARIANT[ret.status]}>
                          {RETURN_STATUS_LABELS[ret.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {RETURN_REASON_LABELS[ret.reason_category]}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{ret.items.length} item{ret.items.length !== 1 ? 's' : ''}</span>
                        <span>Order: {ret.order_id.slice(0, 8)}...</span>
                        <span>{new Date(ret.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      {ret.items.length > 0 && (
                        <p className="mt-2 text-sm truncate">
                          {ret.items.map((i) => i.product_name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-lg">
                        ₱{ret.refund_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">refund amount</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {meta && meta.total > meta.limit && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(meta.total / meta.limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(meta.total / meta.limit)}
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
