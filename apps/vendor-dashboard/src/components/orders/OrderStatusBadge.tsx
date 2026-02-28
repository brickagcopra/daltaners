import { Badge } from '@/components/ui/Badge';
import type { OrderStatus } from '@/hooks/useOrders';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'warning' | 'info' | 'success' | 'danger' | 'primary' | 'secondary' }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'info' },
  preparing: { label: 'Preparing', variant: 'info' },
  ready_for_pickup: { label: 'Ready for Pickup', variant: 'primary' },
  picked_up: { label: 'Picked Up', variant: 'secondary' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'default' as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
