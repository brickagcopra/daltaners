import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useVendorReturn,
  useApproveReturn,
  useDenyReturn,
  useMarkReturnReceived,
  RETURN_STATUS_LABELS,
  RETURN_REASON_LABELS,
  type ReturnStatus,
} from '@/hooks/useReturns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const STATUS_BADGE_MAP: Record<ReturnStatus, 'default' | 'success' | 'danger' | 'warning' | 'secondary' | 'info'> = {
  pending: 'default',
  approved: 'success',
  denied: 'danger',
  cancelled: 'info',
  received: 'secondary',
  refunded: 'success',
  escalated: 'warning',
};

export function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ret, isLoading, isError } = useVendorReturn(id);

  const [modalType, setModalType] = useState<'approve' | 'deny' | 'receive' | null>(null);
  const [vendorResponse, setVendorResponse] = useState('');

  const approveMutation = useApproveReturn();
  const denyMutation = useDenyReturn();
  const receiveMutation = useMarkReturnReceived();

  if (isLoading) return <LoadingSpinner fullPage size="lg" />;
  if (isError || !ret) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Return request not found</h2>
        <Button variant="outline" onClick={() => navigate('/returns')}>Back to Returns</Button>
      </div>
    );
  }

  const canApprove = ret.status === 'pending' || ret.status === 'escalated';
  const canDeny = ret.status === 'pending';
  const canReceive = ret.status === 'approved';

  const handleAction = () => {
    if (!id) return;
    if (modalType === 'approve') {
      approveMutation.mutate(
        { returnId: id, vendorResponse: vendorResponse || undefined },
        { onSuccess: () => { setModalType(null); setVendorResponse(''); } },
      );
    } else if (modalType === 'deny') {
      if (!vendorResponse.trim()) return;
      denyMutation.mutate(
        { returnId: id, vendorResponse },
        { onSuccess: () => { setModalType(null); setVendorResponse(''); } },
      );
    } else if (modalType === 'receive') {
      receiveMutation.mutate(
        { returnId: id, vendorResponse: vendorResponse || undefined },
        { onSuccess: () => { setModalType(null); setVendorResponse(''); } },
      );
    }
  };

  const isPending = approveMutation.isPending || denyMutation.isPending || receiveMutation.isPending;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/returns')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Returns
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{ret.requestNumber}</h1>
            <Badge variant={STATUS_BADGE_MAP[ret.status]}>
              {RETURN_STATUS_LABELS[ret.status]}
            </Badge>
          </div>
          <div className="flex gap-2">
            {canApprove && (
              <Button variant="success" onClick={() => { setModalType('approve'); setVendorResponse(''); }}>
                Approve
              </Button>
            )}
            {canDeny && (
              <Button variant="danger" onClick={() => { setModalType('deny'); setVendorResponse(''); }}>
                Deny
              </Button>
            )}
            {canReceive && (
              <Button variant="secondary" onClick={() => { setModalType('receive'); setVendorResponse(''); }}>
                Mark Received
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Return Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Return Details</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Reason</dt>
                <dd className="font-medium">{RETURN_REASON_LABELS[ret.reasonCategory]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Resolution Requested</dt>
                <dd className="font-medium capitalize">{ret.requestedResolution}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Order ID</dt>
                <dd className="font-medium">{ret.orderId}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Submitted</dt>
                <dd className="font-medium">
                  {new Date(ret.createdAt).toLocaleDateString('en-PH', {
                    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </dd>
              </div>
            </dl>
            {ret.reasonDetails && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm text-gray-500 mb-1">Customer's Description</h4>
                <p className="text-sm text-gray-900">{ret.reasonDetails}</p>
              </div>
            )}
          </Card>

          {/* Evidence */}
          {ret.evidenceUrls && ret.evidenceUrls.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Evidence Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ret.evidenceUrls.map((url: string, idx: number) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Evidence ${idx + 1}`}
                    className="rounded-lg border object-cover aspect-[4/3] w-full"
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Items */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Return Items ({ret.items?.length || 0})
            </h3>
            <div className="divide-y">
              {(ret.items || []).map((item: any) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {item.productName || item.product_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>Qty: {item.quantity}</span>
                      <span>Condition: {item.condition}</span>
                      <span>Restockable: {item.restockable ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      ₱{(item.refundAmount ?? item.refund_amount ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Refund Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Refund Summary</h3>
            <p className="text-3xl font-bold text-gray-900">
              ₱{(ret.refundAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total refund amount</p>
          </Card>

          {/* Vendor Response */}
          {ret.vendorResponse && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Your Response</h3>
              <p className="text-sm text-gray-700">{ret.vendorResponse}</p>
              {ret.vendorRespondedAt && (
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(ret.vendorRespondedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </Card>
          )}

          {/* Admin Notes */}
          {ret.adminNotes && (
            <Card className="p-6 border-orange-200 bg-orange-50">
              <h3 className="text-sm font-semibold text-orange-800 mb-2">Admin Notes</h3>
              <p className="text-sm text-orange-700">{ret.adminNotes}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        title={
          modalType === 'approve' ? 'Approve Return Request' :
          modalType === 'deny' ? 'Deny Return Request' :
          'Mark Items as Received'
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {modalType === 'deny' ? 'Reason for denial *' : 'Response to customer (optional)'}
            </label>
            <Textarea
              value={vendorResponse}
              onChange={(e) => setVendorResponse(e.target.value)}
              placeholder={
                modalType === 'deny'
                  ? 'Explain why this return is being denied...'
                  : 'Add a note for the customer...'
              }
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
            <Button
              variant={modalType === 'deny' ? 'danger' : modalType === 'approve' ? 'success' : 'secondary'}
              onClick={handleAction}
              disabled={isPending || (modalType === 'deny' && !vendorResponse.trim())}
              isLoading={isPending}
            >
              {modalType === 'approve' ? 'Approve' :
               modalType === 'deny' ? 'Deny' :
               'Confirm Received'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
