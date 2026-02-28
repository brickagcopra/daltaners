import { useParams, Link } from 'react-router-dom';
import { useOrder, useUpdateOrderStatus, type OrderStatus } from '@/hooks/useOrders';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusFlow: Record<string, { next: OrderStatus; label: string }> = {
  accepted: { next: 'preparing', label: 'Start Preparing' },
  preparing: { next: 'ready_for_pickup', label: 'Mark Ready for Pickup' },
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError } = useOrder(id);
  const updateStatusMutation = useUpdateOrderStatus();

  if (isLoading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  if (isError || !order) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500">
        <p className="text-sm">Order not found.</p>
        <Link to="/orders" className="mt-2 text-sm text-primary-500 hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  const nextStatus = statusFlow[order.status];

  const handleStatusAdvance = () => {
    if (!nextStatus) return;
    updateStatusMutation.mutate({ orderId: order.id, status: nextStatus.next });
  };

  const handleAccept = () => {
    updateStatusMutation.mutate({ orderId: order.id, status: 'accepted' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/orders" className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 ml-8 text-sm text-gray-500">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {order.status === 'pending' && (
            <Button
              variant="success"
              onClick={handleAccept}
              isLoading={updateStatusMutation.isPending}
            >
              Accept Order
            </Button>
          )}
          {nextStatus && (
            <Button
              onClick={handleStatusAdvance}
              isLoading={updateStatusMutation.isPending}
            >
              {nextStatus.label}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Items ({order.items.length})
            </h3>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    {item.variantName && (
                      <p className="text-xs text-gray-500">{item.variantName}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.unitPrice)} x {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery Fee</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Service Fee</span>
                <span>{formatCurrency(order.serviceFee)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Customer
            </h3>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{order.customerName}</p>
              <p className="text-sm text-gray-600">{order.customerPhone}</p>
            </div>
          </Card>

          {/* Delivery Info */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Delivery Address
            </h3>
            <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
            {order.estimatedDeliveryTime && (
              <p className="mt-2 text-xs text-gray-500">
                Est. delivery: {formatDate(order.estimatedDeliveryTime)}
              </p>
            )}
          </Card>

          {/* Payment Info */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Payment
            </h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-700">
                Method: <span className="font-medium uppercase">{order.paymentMethod}</span>
              </p>
              <p className="text-sm text-gray-700">
                Status: <span className="font-medium capitalize">{order.paymentStatus}</span>
              </p>
            </div>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Order Notes
              </h3>
              <p className="text-sm text-gray-700">{order.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
