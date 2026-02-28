import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOrder, useCancelOrder } from '@/hooks/useOrders';
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatPHP } from '@/components/product/PriceDisplay';

const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError } = useOrder(id || '');
  const cancelOrder = useCancelOrder();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (isError || !order) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Order not found"
          description="The order you're looking for doesn't exist or has been removed."
          actionLabel="Back to orders"
          onAction={() => navigate('/orders')}
        />
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  const handleCancel = async () => {
    if (!cancelReason.trim() || !id) return;
    try {
      await cancelOrder.mutateAsync({ id, reason: cancelReason });
      setShowCancelModal(false);
      setCancelReason('');
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="container-app py-6">
      <Link to="/orders" className="text-sm text-primary hover:underline">
        &larr; Back to orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">{order.order_number}</h1>
        <Badge
          variant={
            order.status === 'delivered'
              ? 'success'
              : order.status === 'cancelled'
                ? 'destructive'
                : 'default'
          }
        >
          {order.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusTimeline
                currentStatus={order.status}
                statusHistory={order.status_history}
              />
              {order.estimated_delivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="mt-4 rounded-md bg-primary/5 p-3">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Estimated Delivery:</span>{' '}
                    {new Date(order.estimated_delivery).toLocaleString('en-PH', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 py-3">
                    <img
                      src={item.image_url || '/placeholder-product.png'}
                      alt={item.name}
                      className="h-16 w-16 rounded-lg border border-border object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPHP(item.price)} x {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatPHP(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cancel Button */}
          {canCancel && (
            <div>
              {showCancelModal ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-destructive">Cancel Order</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Please tell us why you want to cancel this order.
                    </p>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Reason for cancellation..."
                      rows={3}
                      className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20"
                    />
                    <div className="mt-3 flex gap-3">
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        isLoading={cancelOrder.isPending}
                        disabled={!cancelReason.trim()}
                      >
                        Confirm Cancellation
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                      >
                        Keep Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(true)}
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  Cancel Order
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Delivery Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delivery Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Store</p>
                    <p className="mt-0.5 text-foreground">{order.store_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Delivery Address</p>
                    <p className="mt-0.5 text-foreground">{order.delivery_address}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Delivery Type</p>
                    <p className="mt-0.5 text-foreground capitalize">{order.delivery_type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Payment Method</p>
                    <p className="mt-0.5 text-foreground capitalize">
                      {order.payment_method.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Order Date</p>
                    <p className="mt-0.5 text-foreground">
                      {new Date(order.created_at).toLocaleString('en-PH', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {order.delivered_at && (
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Delivered At</p>
                      <p className="mt-0.5 text-foreground">
                        {new Date(order.delivered_at).toLocaleString('en-PH', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Price Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatPHP(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    {order.delivery_fee === 0 ? (
                      <span className="font-medium text-success">Free</span>
                    ) : (
                      <span className="font-medium">{formatPHP(order.delivery_fee)}</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="font-medium">{formatPHP(order.service_fee)}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatPHP(order.total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reorder */}
            {order.status === 'delivered' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/search')}
              >
                Order Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
