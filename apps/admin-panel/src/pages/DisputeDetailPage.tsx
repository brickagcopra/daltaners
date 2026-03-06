import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useDisputeDetail,
  useDisputeMessages,
  useAssignDispute,
  useEscalateDispute,
  useResolveDispute,
  useCloseDispute,
  useAddDisputeMessage,
  DISPUTE_STATUS_LABELS,
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_PRIORITY_LABELS,
  DISPUTE_PRIORITY_COLORS,
  DISPUTE_RESOLUTION_LABELS,
  type DisputeStatus,
  type DisputeResolutionType,
} from '@/hooks/useDisputes';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const statusVariant: Record<DisputeStatus, 'success' | 'destructive' | 'warning' | 'info' | 'muted' | 'default' | 'secondary'> = {
  open: 'info',
  vendor_response: 'warning',
  customer_reply: 'warning',
  under_review: 'secondary',
  escalated: 'destructive',
  resolved: 'success',
  closed: 'muted',
};

const SENDER_ROLE_LABELS: Record<string, string> = {
  customer: 'Customer',
  vendor_owner: 'Vendor (Owner)',
  vendor_staff: 'Vendor (Staff)',
  admin: 'Admin',
};

const resolutionOptions: { value: DisputeResolutionType; label: string }[] = [
  { value: 'refund', label: 'Full Refund' },
  { value: 'partial_refund', label: 'Partial Refund' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'no_action', label: 'No Action' },
  { value: 'warning_issued', label: 'Warning Issued' },
];

type AdminAction = 'assign' | 'escalate' | 'resolve' | 'close' | null;

export function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dispute, isLoading, isError } = useDisputeDetail(id || '');
  const { data: messages } = useDisputeMessages(id || '');

  // Action modal
  const [actionType, setActionType] = useState<AdminAction>(null);
  const [assignAdminId, setAssignAdminId] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [resolutionType, setResolutionType] = useState<DisputeResolutionType>('refund');
  const [resolutionAmount, setResolutionAmount] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [closeReason, setCloseReason] = useState('');

  // Message form
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const assignMutation = useAssignDispute();
  const escalateMutation = useEscalateDispute();
  const resolveMutation = useResolveDispute();
  const closeMutation = useCloseDispute();
  const addMessageMutation = useAddDisputeMessage();

  const formatCurrency = (amount: number) =>
    `P${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !dispute) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500">
        <p className="mb-4 text-sm">Dispute not found</p>
        <Button variant="outline" onClick={() => navigate('/disputes')}>Back to Disputes</Button>
      </div>
    );
  }

  const isActive = !['resolved', 'closed'].includes(dispute.status);
  const canEscalate = ['open', 'vendor_response', 'customer_reply', 'under_review'].includes(dispute.status);
  const canResolve = ['open', 'vendor_response', 'customer_reply', 'under_review', 'escalated'].includes(dispute.status);
  const canClose = dispute.status === 'resolved';

  const openAction = (type: AdminAction) => {
    setActionType(type);
    setAssignAdminId('');
    setEscalationReason('');
    setResolutionType('refund');
    setResolutionAmount('');
    setResolutionNotes('');
    setCloseReason('');
  };

  const closeAction = () => setActionType(null);

  const handleAction = () => {
    if (!id || !actionType) return;
    const onSuccess = () => closeAction();

    if (actionType === 'assign') {
      assignMutation.mutate({ id, admin_id: assignAdminId.trim() }, { onSuccess });
    } else if (actionType === 'escalate') {
      escalateMutation.mutate({ id, reason: escalationReason.trim() }, { onSuccess });
    } else if (actionType === 'resolve') {
      resolveMutation.mutate({
        id,
        resolution_type: resolutionType,
        resolution_amount: resolutionAmount ? parseFloat(resolutionAmount) : undefined,
        resolution_notes: resolutionNotes.trim() || undefined,
      }, { onSuccess });
    } else if (actionType === 'close') {
      closeMutation.mutate({ id, reason: closeReason.trim() || undefined }, { onSuccess });
    }
  };

  const handleSendMessage = () => {
    if (!id || !newMessage.trim()) return;
    addMessageMutation.mutate(
      { disputeId: id, message: newMessage.trim(), is_internal: isInternal },
      { onSuccess: () => { setNewMessage(''); setIsInternal(false); } },
    );
  };

  const isActioning = assignMutation.isPending || escalateMutation.isPending || resolveMutation.isPending || closeMutation.isPending;

  // Use inline messages from dispute, or separate messages query
  const allMessages = messages || dispute.messages || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/disputes')}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Disputes
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{dispute.dispute_number}</h1>
              <Badge variant={statusVariant[dispute.status] || 'muted'}>
                {DISPUTE_STATUS_LABELS[dispute.status]}
              </Badge>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${DISPUTE_PRIORITY_COLORS[dispute.priority]}`}>
                {DISPUTE_PRIORITY_LABELS[dispute.priority]}
              </span>
            </div>
            <p className="mt-1 text-base text-gray-700">{dispute.subject}</p>
          </div>
          <div className="flex gap-2">
            {isActive && (
              <Button variant="outline" size="sm" onClick={() => openAction('assign')}>
                Assign
              </Button>
            )}
            {canEscalate && (
              <Button variant="outline" size="sm" onClick={() => openAction('escalate')}>
                Escalate
              </Button>
            )}
            {canResolve && (
              <Button variant="success" size="sm" onClick={() => openAction('resolve')}>
                Resolve
              </Button>
            )}
            {canClose && (
              <Button variant="default" size="sm" onClick={() => openAction('close')}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Dispute Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Dispute Details</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium">{DISPUTE_CATEGORY_LABELS[dispute.category]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Priority</dt>
                <dd className="font-medium">{DISPUTE_PRIORITY_LABELS[dispute.priority]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Order ID</dt>
                <dd className="font-mono font-medium">{dispute.order_id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Customer ID</dt>
                <dd className="font-mono font-medium">{dispute.customer_id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Store ID</dt>
                <dd className="font-mono font-medium">{dispute.store_id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Requested Resolution</dt>
                <dd className="font-medium capitalize">{dispute.requested_resolution.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Assigned To</dt>
                <dd className="font-mono font-medium">{dispute.admin_assigned_to || 'Unassigned'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium">
                  {new Date(dispute.created_at).toLocaleDateString('en-PH', {
                    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t pt-4">
              <h4 className="mb-1 text-sm text-gray-500">Customer's Description</h4>
              <p className="text-sm text-gray-900">{dispute.description}</p>
            </div>
          </div>

          {/* Evidence */}
          {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-900">Evidence</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {dispute.evidence_urls.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="aspect-[4/3] w-full rounded-lg border object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Conversation */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Conversation ({allMessages.length} messages)
            </h3>
            <div className="space-y-3">
              {allMessages.map((msg) => {
                const isAdmin = msg.sender_role === 'admin';
                const isVendor = msg.sender_role === 'vendor_owner' || msg.sender_role === 'vendor_staff';
                return (
                  <div
                    key={msg.id}
                    className={`rounded-lg px-4 py-3 ${
                      msg.is_internal
                        ? 'border border-dashed border-yellow-300 bg-yellow-50'
                        : isAdmin
                          ? 'bg-purple-50 border border-purple-200'
                          : isVendor
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${
                        msg.is_internal ? 'text-yellow-700' :
                        isAdmin ? 'text-purple-700' :
                        isVendor ? 'text-blue-700' :
                        'text-gray-600'
                      }`}>
                        {SENDER_ROLE_LABELS[msg.sender_role] || msg.sender_role}
                        {msg.is_internal && ' (Internal Note)'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.created_at).toLocaleString('en-PH', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-gray-900">{msg.message}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {msg.attachments.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt="" className="h-16 w-16 rounded border object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {allMessages.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-400">No messages yet.</p>
              )}
            </div>

            {/* Send message */}
            {isActive && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message to the conversation..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Internal note (hidden from customer/vendor)
                  </label>
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || addMessageMutation.isPending}
                    loading={addMessageMutation.isPending}
                  >
                    Send
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">Dispute Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(dispute.created_at).toLocaleString('en-PH')}
                  </p>
                </div>
              </div>
              {dispute.escalated_at && (
                <div className="flex items-start gap-2">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                  <div>
                    <p className="font-medium text-gray-900">Escalated</p>
                    <p className="text-xs text-gray-500">
                      {new Date(dispute.escalated_at).toLocaleString('en-PH')}
                    </p>
                    {dispute.escalation_reason && (
                      <p className="mt-0.5 text-xs text-gray-600">{dispute.escalation_reason}</p>
                    )}
                  </div>
                </div>
              )}
              {dispute.resolved_at && (
                <div className="flex items-start gap-2">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">Resolved</p>
                    <p className="text-xs text-gray-500">
                      {new Date(dispute.resolved_at).toLocaleString('en-PH')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Last Updated</p>
                  <p className="text-xs text-gray-500">
                    {new Date(dispute.updated_at).toLocaleString('en-PH')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Response Deadline */}
          {dispute.vendor_response_deadline && !['resolved', 'closed', 'vendor_response'].includes(dispute.status) && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-orange-800">Vendor Response Deadline</h3>
              <p className="text-sm font-medium text-orange-900">
                {new Date(dispute.vendor_response_deadline).toLocaleString('en-PH')}
              </p>
              {new Date(dispute.vendor_response_deadline) < new Date() && (
                <p className="mt-1 text-xs font-semibold text-red-600">OVERDUE</p>
              )}
            </div>
          )}

          {/* Resolution */}
          {dispute.resolution_type && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-green-800">Resolution</h3>
              <p className="text-sm font-medium text-green-900">
                {DISPUTE_RESOLUTION_LABELS[dispute.resolution_type] || dispute.resolution_type}
              </p>
              {dispute.resolution_amount > 0 && (
                <p className="mt-1 text-lg font-bold text-green-900">
                  {formatCurrency(dispute.resolution_amount)}
                </p>
              )}
              {dispute.resolution_notes && (
                <p className="mt-1 text-xs text-green-700">{dispute.resolution_notes}</p>
              )}
              {dispute.resolved_by && (
                <p className="mt-2 text-[10px] text-green-600 font-mono">
                  Resolved by: {dispute.resolved_by.slice(0, 8)}
                </p>
              )}
            </div>
          )}

          {/* Return Request Link */}
          {dispute.return_request_id && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-gray-900">Linked Return</h3>
              <button
                className="text-sm text-primary hover:underline font-mono"
                onClick={() => navigate(`/returns/${dispute.return_request_id}`)}
              >
                {dispute.return_request_id.slice(0, 8)}...
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Action Modal */}
      <Modal
        isOpen={!!actionType}
        onClose={closeAction}
        title={
          actionType === 'assign' ? 'Assign Dispute' :
          actionType === 'escalate' ? 'Escalate Dispute' :
          actionType === 'resolve' ? 'Resolve Dispute' :
          'Close Dispute'
        }
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <p><strong>Dispute:</strong> {dispute.dispute_number}</p>
            <p><strong>Status:</strong> {DISPUTE_STATUS_LABELS[dispute.status]}</p>
            <p><strong>Category:</strong> {DISPUTE_CATEGORY_LABELS[dispute.category]}</p>
          </div>

          {actionType === 'assign' && (
            <Input
              label="Admin User ID"
              value={assignAdminId}
              onChange={(e) => setAssignAdminId(e.target.value)}
              placeholder="Enter admin user UUID to assign..."
            />
          )}

          {actionType === 'escalate' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Escalation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Explain why this dispute needs escalation..."
                rows={3}
              />
            </div>
          )}

          {actionType === 'resolve' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Resolution Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value as DisputeResolutionType)}
                >
                  {resolutionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {(resolutionType === 'refund' || resolutionType === 'partial_refund' || resolutionType === 'store_credit') && (
                <Input
                  label="Amount"
                  type="number"
                  value={resolutionAmount}
                  onChange={(e) => setResolutionAmount(e.target.value)}
                  placeholder="0.00"
                />
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Resolution Notes</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Notes about the resolution..."
                  rows={3}
                />
              </div>
            </>
          )}

          {actionType === 'close' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reason for Closing</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Optional reason for closing..."
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeAction}>Cancel</Button>
            <Button
              variant={
                actionType === 'escalate' ? 'destructive' :
                actionType === 'resolve' ? 'success' :
                'default'
              }
              onClick={handleAction}
              disabled={
                isActioning ||
                (actionType === 'assign' && !assignAdminId.trim()) ||
                (actionType === 'escalate' && !escalationReason.trim())
              }
              loading={isActioning}
            >
              {actionType === 'assign' ? 'Assign' :
               actionType === 'escalate' ? 'Escalate' :
               actionType === 'resolve' ? 'Resolve' :
               'Close Dispute'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
