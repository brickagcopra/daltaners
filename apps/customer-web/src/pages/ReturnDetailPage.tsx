import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useReturn,
  useCancelReturn,
  RETURN_STATUS_LABELS,
  RETURN_REASON_LABELS,
  RETURN_RESOLUTION_LABELS,
  RETURN_CONDITION_LABELS,
  type ReturnStatus,
} from '@/hooks/useReturns';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const STATUS_BADGE_VARIANT: Record<ReturnStatus, 'default' | 'success' | 'destructive' | 'warning' | 'muted' | 'secondary'> = {
  pending: 'default',
  approved: 'success',
  denied: 'destructive',
  cancelled: 'muted',
  received: 'secondary',
  refunded: 'success',
  escalated: 'warning',
};

export function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: returnReq, isLoading, isError } = useReturn(id!);
  const cancelReturn = useCancelReturn();
  const [showCancelModal, setShowCancelModal] = useState(false);

  if (isLoading) return <LoadingSpinner fullPage />;
  if (isError || !returnReq) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Return request not found"
          description="The return request you're looking for doesn't exist or has been removed."
          actionLabel="Back to Returns"
          onAction={() => window.location.href = '/returns'}
        />
      </div>
    );
  }

  const canCancel = returnReq.status === 'pending';

  const handleCancel = async () => {
    try {
      await cancelReturn.mutateAsync(returnReq.id);
      setShowCancelModal(false);
    } catch {
      // error handled by React Query
    }
  };

  return (
    <div className="container-app py-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/returns" className="text-sm text-muted-foreground hover:text-foreground mb-1 inline-block">
            &larr; Back to Returns
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{returnReq.request_number}</h1>
            <Badge variant={STATUS_BADGE_VARIANT[returnReq.status]}>
              {RETURN_STATUS_LABELS[returnReq.status]}
            </Badge>
          </div>
        </div>
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCancelModal(true)}
            className="text-destructive border-destructive hover:bg-destructive/10"
          >
            Cancel Return
          </Button>
        )}
      </div>

      {/* Status Timeline */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Return Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="font-medium">{RETURN_REASON_LABELS[returnReq.reason_category]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Resolution Requested</dt>
              <dd className="font-medium">{RETURN_RESOLUTION_LABELS[returnReq.requested_resolution]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Refund Amount</dt>
              <dd className="font-medium text-lg">
                ₱{returnReq.refund_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd className="font-medium">
                {new Date(returnReq.created_at).toLocaleString('en-PH', {
                  month: 'long', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Order ID</dt>
              <dd>
                <Link to={`/orders/${returnReq.order_id}`} className="text-primary hover:underline font-medium">
                  {returnReq.order_id}
                </Link>
              </dd>
            </div>
          </dl>

          {returnReq.reason_details && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm text-muted-foreground mb-1">Additional Details</h4>
              <p className="text-sm">{returnReq.reason_details}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence Photos */}
      {returnReq.evidence_urls.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Evidence Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {returnReq.evidence_urls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Evidence ${idx + 1}`}
                  className="rounded-lg border object-cover aspect-[4/3] w-full"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Items ({returnReq.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {returnReq.items.map((item) => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.product_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                    <Badge variant="outline" className="text-xs">
                      {RETURN_CONDITION_LABELS[item.condition]}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">
                    ₱{item.refund_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₱{item.unit_price.toFixed(2)} x {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vendor Response */}
      {returnReq.vendor_response && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vendor Response</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{returnReq.vendor_response}</p>
            {returnReq.vendor_responded_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Responded on {new Date(returnReq.vendor_responded_at).toLocaleString('en-PH', {
                  month: 'long', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Cancel Return Request?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to cancel this return request? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
                Keep Return
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={cancelReturn.isPending}
              >
                {cancelReturn.isPending ? 'Cancelling...' : 'Yes, Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
