import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyOrders, type OrderStatus } from '@/hooks/useOrders';
import { OrderCard } from '@/components/order/OrderCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/components/ui/cn';

const FILTER_TABS: { label: string; statuses: OrderStatus[] | null }[] = [
  { label: 'All', statuses: null },
  { label: 'Active', statuses: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'] },
  { label: 'Delivered', statuses: ['delivered'] },
  { label: 'Cancelled', statuses: ['cancelled'] },
];

export function OrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState(0);
  const { data, isLoading, isError } = useMyOrders(page, 20);

  const orders = data?.data ?? [];
  const meta = data?.meta;

  // Client-side filter (ideally server-side, but works for now)
  const filterStatuses = FILTER_TABS[activeFilter].statuses;
  const filteredOrders = filterStatuses
    ? orders.filter((o) => filterStatuses.includes(o.status))
    : orders;

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (isError) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Failed to load orders"
          description="Something went wrong while fetching your orders."
          actionLabel="Try again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Orders</h1>

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

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={
            activeFilter === 0
              ? "You haven't placed any orders yet."
              : `No ${FILTER_TABS[activeFilter].label.toLowerCase()} orders.`
          }
          actionLabel="Start shopping"
          onAction={() => navigate('/search')}
        />
      ) : (
        <>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>

          {/* Pagination */}
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
