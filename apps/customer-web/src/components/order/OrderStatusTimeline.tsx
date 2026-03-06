import { cn } from '@/components/ui/cn';
import type { OrderStatus, OrderStatusEvent } from '@/hooks/useOrders';

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  statusHistory: OrderStatusEvent[];
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'Order Placed', color: 'text-muted-foreground' },
  confirmed: { label: 'Confirmed', color: 'text-secondary' },
  preparing: { label: 'Preparing', color: 'text-secondary' },
  ready_for_pickup: { label: 'Ready for Pickup', color: 'text-accent-600' },
  picked_up: { label: 'Picked Up', color: 'text-accent-600' },
  on_the_way: { label: 'On the Way', color: 'text-primary' },
  in_transit: { label: 'In Transit', color: 'text-primary' },
  delivered: { label: 'Delivered', color: 'text-success' },
  cancelled: { label: 'Cancelled', color: 'text-destructive' },
};

const ACTIVE_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'picked_up',
  'on_the_way',
  'in_transit',
  'delivered',
];

export function OrderStatusTimeline({
  currentStatus,
  statusHistory,
}: OrderStatusTimelineProps) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-semibold text-destructive">Order Cancelled</span>
        </div>
        {statusHistory.find((s) => s.status === 'cancelled')?.note && (
          <p className="mt-2 text-sm text-muted-foreground">
            Reason: {statusHistory.find((s) => s.status === 'cancelled')?.note}
          </p>
        )}
      </div>
    );
  }

  const currentIndex = ACTIVE_STATUSES.indexOf(currentStatus);
  const historyMap = new Map(statusHistory.map((s) => [s.status, s]));

  return (
    <div className="space-y-0">
      {ACTIVE_STATUSES.map((status, index) => {
        const config = STATUS_CONFIG[status];
        const event = historyMap.get(status);
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === ACTIVE_STATUSES.length - 1;

        return (
          <div key={status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                  isCompleted
                    ? isCurrent
                      ? 'border-primary bg-primary'
                      : 'border-success bg-success'
                    : 'border-border bg-white',
                )}
              >
                {isCompleted && !isCurrent && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
                {isCurrent && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[24px]',
                    index < currentIndex ? 'bg-success' : 'bg-border',
                  )}
                />
              )}
            </div>
            <div className={cn('pb-4', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-medium',
                  isCompleted ? config.color : 'text-muted-foreground',
                  isCurrent && 'font-semibold',
                )}
              >
                {config.label}
              </p>
              {event && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
