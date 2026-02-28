import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { formatPHP } from '@/components/product/PriceDisplay';
import type { Order, OrderStatus } from '@/hooks/useOrders';

interface OrderCardProps {
  order: Order;
}

const STATUS_BADGE: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'muted' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'secondary' },
  preparing: { label: 'Preparing', variant: 'secondary' },
  ready_for_pickup: { label: 'Ready', variant: 'default' },
  picked_up: { label: 'Picked Up', variant: 'default' },
  on_the_way: { label: 'On the Way', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export function OrderCard({ order }: OrderCardProps) {
  const statusConfig = STATUS_BADGE[order.status];
  const previewItems = order.items.slice(0, 3);
  const remainingCount = order.items.length - 3;

  return (
    <Link
      to={`/orders/${order.id}`}
      className="block rounded-lg border border-border bg-white p-4 transition-shadow hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {order.order_number}
          </p>
          <p className="text-xs text-muted-foreground">{order.store_name}</p>
        </div>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>

      {/* Items Preview */}
      <div className="mt-3 flex items-center gap-2">
        {previewItems.map((item, idx) => (
          <img
            key={idx}
            src={item.image_url || '/placeholder-product.png'}
            alt={item.name}
            className="h-12 w-12 rounded-md border border-border object-cover"
          />
        ))}
        {remainingCount > 0 && (
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted">
            <span className="text-xs font-medium text-muted-foreground">
              +{remainingCount}
            </span>
          </div>
        )}
        <div className="ml-auto text-right">
          <p className="text-sm font-bold text-foreground">{formatPHP(order.total)}</p>
          <p className="text-xs text-muted-foreground">
            {order.items.reduce((sum, i) => sum + i.quantity, 0)} items
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
        {order.status === 'on_the_way' && order.estimated_delivery && (
          <p className="text-xs font-medium text-primary">
            ETA:{' '}
            {new Date(order.estimated_delivery).toLocaleTimeString('en-PH', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
        <span className="text-xs font-medium text-primary">View details &rarr;</span>
      </div>
    </Link>
  );
}
