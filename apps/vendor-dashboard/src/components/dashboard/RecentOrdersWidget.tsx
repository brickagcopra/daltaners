import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

interface RecentOrdersWidgetProps {
  orders: RecentOrder[];
  className?: string;
}

const statusVariantMap: Record<string, 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  accepted: 'info',
  preparing: 'info',
  ready_for_pickup: 'primary' as 'info',
  picked_up: 'info',
  delivered: 'success',
  cancelled: 'danger',
  rejected: 'danger',
};

const statusLabelMap: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

export function RecentOrdersWidget({ orders, className }: RecentOrdersWidgetProps) {
  return (
    <Card className={cn(className)} noPadding>
      <CardHeader className="px-6 pt-6">
        <CardTitle>Recent Orders</CardTitle>
        <Link to="/orders" className="text-sm font-medium text-primary-500 hover:text-primary-600">
          View all
        </Link>
      </CardHeader>
      <div className="divide-y divide-gray-100">
        {orders.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No recent orders
          </div>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    #{order.orderNumber}
                  </span>
                  <Badge variant={statusVariantMap[order.status] || 'default'}>
                    {statusLabelMap[order.status] || order.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{order.customerName}</p>
              </div>
              <div className="ml-4 text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(order.total)}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{formatTime(order.createdAt)}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}
