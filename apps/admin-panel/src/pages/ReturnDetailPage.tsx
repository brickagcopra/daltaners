import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useReturnDetail,
  useEscalateReturn,
  useOverrideApproveReturn,
  useOverrideDenyReturn,
  RETURN_STATUS_LABELS,
  RETURN_REASON_LABELS,
  type ReturnStatus,
} from '@/hooks/useReturns';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const statusVariant: Record<ReturnStatus, 'success' | 'destructive' | 'warning' | 'info' | 'muted' | 'default' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  denied: 'destructive',
  cancelled: 'muted',
  received: 'info',
  refunded: 'success',
  escalated: 'warning',
};

type AdminAction = 'escalate' | 'override-approve' | 'override-deny' | null;

export function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ret, isLoading, isError } = useReturnDetail(id || '');

  const [actionType, setActionType] = useState<AdminAction>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [refundOverride, setRefundOverride] = useState('');

  const escalateMutation = useEscalateReturn();
  const overrideApproveMutation = useOverrideApproveReturn();
  const overrideDenyMutation = useOverrideDenyReturn();

  const formatCurrency = (amount: number) =>
    `P${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !ret) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500">
        <p className="mb-4 text-sm">Return request not found</p>
        <Button variant="outline" onClick={() => navigate('/returns')}>Back to Returns</Button>
      </div>
    );
  }

  const canEscalate = ret.status === 'pending' || ret.status === 'approved';
  const canOverrideApprove = ret.status === 'denied';
  const canOverrideDeny = ret.status === 'pending' || ret.status === 'escalated';

  const openAction = (type: AdminAction) => {
    setActionType(type);
    setAdminNotes('');
    setRefundOverride('');
  };

  const closeAction = () => {
    setActionType(null);
    setAdminNotes('');
    setRefundOverride('');
  };

  const handleAction = () => {
    if (!id || !actionType) return;
    const onSuccess = () => closeAction();
    const refundAmount = refundOverride ? parseFloat(refundOverride) : undefined;

    if (actionType === 'escalate') {
      escalateMutation.mutate({ id, admin_notes: adminNotes || undefined, refund_amount: refundAmount }, { onSuccess });
    } else if (actionType === 'override-approve') {
      overrideApproveMutation.mutate({ id, admin_notes: adminNotes || undefined, refund_amount: refundAmount }, { onSuccess });
    } else if (actionType === 'override-deny') {
      overrideDenyMutation.mutate({ id, admin_notes: adminNotes || undefined }, { onSuccess });
    }
  };

  const isActioning = escalateMutation.isPending || overrideApproveMutation.isPending || overrideDenyMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/returns')}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Returns
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{ret.request_number}</h1>
            <Badge variant={statusVariant[ret.status] || 'muted'}>
              {RETURN_STATUS_LABELS[ret.status]}
            </Badge>
          </div>
          <div className="flex gap-2">
            {canEscalate && (
              <Button variant="outline" onClick={() => openAction('escalate')}>
                Escalate
              </Button>
            )}
            {canOverrideApprove && (
              <Button variant="success" onClick={() => openAction('override-approve')}>
                Override Approve
              </Button>
            )}
            {canOverrideDeny && (
              <Button variant="destructive" onClick={() => openAction('override-deny')}>
                Override Deny
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Return Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Return Details</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Order ID</dt>
                <dd className="font-mono font-medium">{ret.order_id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Customer ID</dt>
                <dd className="font-mono font-medium">{ret.customer_id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Store ID</dt>
                <dd className="font-mono font-medium">{ret.store_id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Resolution Requested</dt>
                <dd className="font-medium capitalize">{ret.requested_resolution}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Reason</dt>
                <dd className="font-medium">{RETURN_REASON_LABELS[ret.reason_category]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Submitted</dt>
                <dd className="font-medium">
                  {new Date(ret.created_at).toLocaleDateString('en-PH', {
                    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </dd>
              </div>
            </dl>
            {ret.reason_details && (
              <div className="mt-4 border-t pt-4">
                <h4 className="mb-1 text-sm text-gray-500">Customer's Description</h4>
                <p className="text-sm text-gray-900">{ret.reason_details}</p>
              </div>
            )}
          </div>

          {/* Evidence */}
          {ret.evidence_urls && ret.evidence_urls.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-900">Evidence Photos</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ret.evidence_urls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Evidence ${idx + 1}`}
                    className="aspect-[4/3] w-full rounded-lg border object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Return Items ({ret.items?.length || 0})
            </h3>
            <div className="divide-y">
              {(ret.items || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span>Qty: {item.quantity}</span>
                      <span>Condition: {item.condition}</span>
                      <span>Restockable: {item.restockable ? 'Yes' : 'No'}</span>
                      <span>Inventory Adj: {item.inventory_adjusted ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(item.refund_amount)}</p>
                    <p className="text-xs text-gray-500">Unit: {formatCurrency(item.unit_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Refund Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-gray-900">Refund Summary</h3>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(ret.refund_amount)}</p>
            <p className="mt-1 text-sm text-gray-500">Total refund amount</p>
          </div>

          {/* Vendor Response */}
          {ret.vendor_response && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Vendor Response</h3>
              <p className="text-sm text-gray-700">{ret.vendor_response}</p>
              {ret.vendor_responded_at && (
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(ret.vendor_responded_at).toLocaleDateString('en-PH', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              )}
            </div>
          )}

          {/* Admin Notes */}
          {ret.admin_notes && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-orange-800">Admin Notes</h3>
              <p className="text-sm text-orange-700">{ret.admin_notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(ret.created_at).toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              {ret.vendor_responded_at && (
                <div className="flex items-start gap-2">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">Vendor Responded</p>
                    <p className="text-xs text-gray-500">
                      {new Date(ret.vendor_responded_at).toLocaleDateString('en-PH', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Last Updated</p>
                  <p className="text-xs text-gray-500">
                    {new Date(ret.updated_at).toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Action Modal */}
      <Modal
        isOpen={!!actionType}
        onClose={closeAction}
        title={
          actionType === 'escalate' ? 'Escalate Return Request' :
          actionType === 'override-approve' ? 'Override: Approve Return' :
          'Override: Deny Return'
        }
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <p><strong>Request:</strong> {ret.request_number}</p>
            <p><strong>Current Status:</strong> {RETURN_STATUS_LABELS[ret.status]}</p>
            <p><strong>Refund:</strong> {formatCurrency(ret.refund_amount)}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Admin Notes {actionType === 'override-deny' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={
                actionType === 'escalate'
                  ? 'Explain why this return is being escalated...'
                  : actionType === 'override-approve'
                    ? 'Reason for overriding vendor denial...'
                    : 'Reason for overriding and denying this return...'
              }
              rows={3}
            />
          </div>

          {actionType !== 'override-deny' && (
            <Input
              label="Refund Amount Override (optional)"
              type="number"
              value={refundOverride}
              onChange={(e) => setRefundOverride(e.target.value)}
              placeholder={String(ret.refund_amount)}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeAction}>Cancel</Button>
            <Button
              variant={actionType === 'override-deny' ? 'destructive' : actionType === 'override-approve' ? 'success' : 'default'}
              onClick={handleAction}
              disabled={isActioning || (actionType === 'override-deny' && !adminNotes.trim())}
              loading={isActioning}
            >
              {actionType === 'escalate' ? 'Escalate' :
               actionType === 'override-approve' ? 'Override Approve' :
               'Override Deny'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
