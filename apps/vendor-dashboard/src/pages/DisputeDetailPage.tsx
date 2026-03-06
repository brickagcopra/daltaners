import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useVendorDispute,
  useRespondToDispute,
  DisputeStatus,
  DISPUTE_STATUS_LABELS,
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_PRIORITY_LABELS,
} from '@/hooks/useDisputes';

const STATUS_BADGE_COLORS: Record<DisputeStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  vendor_response: 'bg-yellow-100 text-yellow-700',
  customer_reply: 'bg-orange-100 text-orange-700',
  under_review: 'bg-purple-100 text-purple-700',
  escalated: 'bg-red-100 text-red-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const SENDER_ROLE_LABELS: Record<string, string> = {
  customer: 'Customer',
  vendor_owner: 'You (Vendor)',
  vendor_staff: 'Staff',
  admin: 'Daltaners Admin',
};

export function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: dispute, isLoading } = useVendorDispute(id || '');
  const respondMutation = useRespondToDispute();

  const [responseMessage, setResponseMessage] = useState('');
  const [showRespondForm, setShowRespondForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Dispute not found.</p>
        <Link to="/disputes" className="mt-2 text-sm text-primary-500 hover:underline">
          Back to Disputes
        </Link>
      </div>
    );
  }

  const canRespond = ['open', 'customer_reply', 'escalated'].includes(dispute.status);

  const handleRespond = () => {
    if (!responseMessage.trim()) return;
    respondMutation.mutate(
      { disputeId: dispute.id, message: responseMessage.trim() },
      {
        onSuccess: () => {
          setResponseMessage('');
          setShowRespondForm(false);
        },
      },
    );
  };

  return (
    <div>
      {/* Back */}
      <Link to="/disputes" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Disputes
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">{dispute.disputeNumber}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_COLORS[dispute.status]}`}>
              {DISPUTE_STATUS_LABELS[dispute.status]}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-gray-900">{dispute.subject}</h1>
        </div>
        {canRespond && !showRespondForm && (
          <button
            onClick={() => setShowRespondForm(true)}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            Respond
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Details & Messages */}
        <div className="space-y-4 lg:col-span-2">
          {/* Dispute Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Dispute Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-gray-500">Category</span>
                <p className="font-medium text-gray-900">{DISPUTE_CATEGORY_LABELS[dispute.category]}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Priority</span>
                <p className="font-medium text-gray-900">{DISPUTE_PRIORITY_LABELS[dispute.priority]}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Requested Resolution</span>
                <p className="font-medium capitalize text-gray-900">
                  {dispute.requestedResolution.replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Order ID</span>
                <p className="font-medium text-gray-900">{dispute.orderId}</p>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xs text-gray-500">Customer Description</span>
              <p className="mt-0.5 text-sm text-gray-700">{dispute.description}</p>
            </div>
          </div>

          {/* Evidence */}
          {dispute.evidenceUrls.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Evidence</h2>
              <div className="grid grid-cols-3 gap-2">
                {dispute.evidenceUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Evidence ${i + 1}`} className="h-28 w-full rounded-lg border border-gray-200 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Conversation */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Conversation</h2>
            <div className="space-y-3">
              {dispute.messages.map((msg) => {
                const isVendor = msg.senderRole === 'vendor_owner' || msg.senderRole === 'vendor_staff';
                return (
                  <div key={msg.id} className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-xl px-3 py-2 ${
                        isVendor
                          ? 'bg-primary-500 text-white'
                          : msg.senderRole === 'admin'
                            ? 'bg-purple-100 text-purple-900'
                            : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className={`text-[10px] font-semibold ${isVendor ? 'text-primary-100' : 'text-gray-500'}`}>
                        {SENDER_ROLE_LABELS[msg.senderRole] || msg.senderRole}
                      </p>
                      <p className="mt-0.5 text-sm whitespace-pre-wrap">{msg.message}</p>
                      {msg.attachments.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {msg.attachments.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="" className="h-12 w-12 rounded border object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                      <p className={`mt-1 text-[10px] ${isVendor ? 'text-primary-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Respond form */}
            {showRespondForm && canRespond && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Type your response to the customer..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowRespondForm(false);
                      setResponseMessage('');
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRespond}
                    disabled={!responseMessage.trim() || respondMutation.isPending}
                    className="rounded-lg bg-primary-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50"
                  >
                    {respondMutation.isPending ? 'Sending...' : 'Send Response'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Summary */}
        <div className="space-y-4">
          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Timeline</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">Dispute Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(dispute.createdAt).toLocaleString('en-PH')}
                  </p>
                </div>
              </div>
              {dispute.escalatedAt && (
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-red-500" />
                  <div>
                    <p className="font-medium text-gray-900">Escalated</p>
                    <p className="text-xs text-gray-500">
                      {new Date(dispute.escalatedAt).toLocaleString('en-PH')}
                    </p>
                    {dispute.escalationReason && (
                      <p className="mt-0.5 text-xs text-gray-600">{dispute.escalationReason}</p>
                    )}
                  </div>
                </div>
              )}
              {dispute.resolvedAt && (
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">Resolved</p>
                    <p className="text-xs text-gray-500">
                      {new Date(dispute.resolvedAt).toLocaleString('en-PH')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Response Deadline */}
          {dispute.vendorResponseDeadline && !['resolved', 'closed', 'vendor_response'].includes(dispute.status) && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
              <h2 className="mb-1 text-sm font-semibold text-orange-800">Response Deadline</h2>
              <p className="text-sm font-medium text-orange-900">
                {new Date(dispute.vendorResponseDeadline).toLocaleString('en-PH')}
              </p>
              <p className="mt-1 text-xs text-orange-600">
                Please respond before the deadline to avoid auto-escalation.
              </p>
            </div>
          )}

          {/* Resolution */}
          {dispute.resolutionType && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <h2 className="mb-2 text-sm font-semibold text-green-800">Resolution</h2>
              <p className="text-sm capitalize text-green-900">
                {dispute.resolutionType.replace(/_/g, ' ')}
              </p>
              {dispute.resolutionAmount > 0 && (
                <p className="mt-1 text-lg font-bold text-green-900">
                  P{dispute.resolutionAmount.toFixed(2)}
                </p>
              )}
              {dispute.resolutionNotes && (
                <p className="mt-1 text-xs text-green-700">{dispute.resolutionNotes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
