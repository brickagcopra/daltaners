import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useDispute,
  useAddDisputeMessage,
  useEscalateDispute,
  DISPUTE_STATUS_LABELS,
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_PRIORITY_LABELS,
  DISPUTE_RESOLUTION_LABELS,
  DisputeStatus,
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
  customer: 'You',
  vendor_owner: 'Vendor',
  vendor_staff: 'Vendor Staff',
  admin: 'Daltaners Support',
};

export function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: dispute, isLoading } = useDispute(id || '');
  const addMessage = useAddDisputeMessage();
  const escalateDispute = useEscalateDispute();

  const [newMessage, setNewMessage] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-gray-500">Dispute not found.</p>
        <Link to="/disputes" className="mt-2 text-sm text-primary-500 hover:underline">
          Back to Disputes
        </Link>
      </div>
    );
  }

  const canSendMessage = !['resolved', 'closed'].includes(dispute.status);
  const canEscalate = ['open', 'vendor_response', 'customer_reply'].includes(dispute.status);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    addMessage.mutate(
      { disputeId: dispute.id, message: newMessage.trim() },
      { onSuccess: () => setNewMessage('') },
    );
  };

  const handleEscalate = () => {
    escalateDispute.mutate(
      { id: dispute.id, escalation_reason: escalationReason || undefined },
      { onSuccess: () => setShowEscalateModal(false) },
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Back link */}
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
            <span className="text-xs font-medium text-gray-500">{dispute.dispute_number}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_COLORS[dispute.status]}`}>
              {DISPUTE_STATUS_LABELS[dispute.status]}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-gray-900">{dispute.subject}</h1>
        </div>
        {canEscalate && (
          <button
            onClick={() => setShowEscalateModal(true)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Escalate
          </button>
        )}
      </div>

      {/* Dispute Details Card */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
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
            <p className="font-medium text-gray-900">{DISPUTE_RESOLUTION_LABELS[dispute.requested_resolution]}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Order</span>
            <Link to={`/orders/${dispute.order_id}`} className="font-medium text-primary-500 hover:underline">
              {dispute.order_id}
            </Link>
          </div>
          <div>
            <span className="text-xs text-gray-500">Submitted</span>
            <p className="font-medium text-gray-900">
              {new Date(dispute.created_at).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Last Updated</span>
            <p className="font-medium text-gray-900">
              {new Date(dispute.updated_at).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-xs text-gray-500">Description</span>
          <p className="mt-0.5 text-sm text-gray-700">{dispute.description}</p>
        </div>
      </div>

      {/* Evidence */}
      {dispute.evidence_urls.length > 0 && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Evidence</h2>
          <div className="grid grid-cols-3 gap-2">
            {dispute.evidence_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`Evidence ${i + 1}`}
                  className="h-24 w-full rounded-lg border border-gray-200 object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Resolution (if resolved) */}
      {dispute.resolution_type && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-green-800">Resolution</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-xs text-green-600">Resolution Type</span>
              <p className="font-medium capitalize text-green-900">
                {dispute.resolution_type.replace(/_/g, ' ')}
              </p>
            </div>
            {dispute.resolution_amount > 0 && (
              <div>
                <span className="text-xs text-green-600">Amount</span>
                <p className="font-semibold text-green-900">P{dispute.resolution_amount.toFixed(2)}</p>
              </div>
            )}
          </div>
          {dispute.resolution_notes && (
            <div className="mt-2">
              <span className="text-xs text-green-600">Notes</span>
              <p className="mt-0.5 text-sm text-green-800">{dispute.resolution_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Messages / Conversation */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Conversation</h2>
        <div className="space-y-3">
          {dispute.messages.map((msg) => {
            const isCustomer = msg.sender_role === 'customer';
            return (
              <div
                key={msg.id}
                className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 ${
                    isCustomer
                      ? 'bg-primary-500 text-white'
                      : msg.sender_role === 'admin'
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className={`text-[10px] font-semibold ${isCustomer ? 'text-primary-100' : 'text-gray-500'}`}>
                    {SENDER_ROLE_LABELS[msg.sender_role] || msg.sender_role}
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
                  <p className={`mt-1 text-[10px] ${isCustomer ? 'text-primary-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleString('en-PH', {
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

        {/* Send message input */}
        {canSendMessage && (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || addMessage.isPending}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addMessage.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        )}
      </div>

      {/* Escalate Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Escalate Dispute</h3>
            <p className="mt-1 text-sm text-gray-500">
              This will escalate your dispute to Daltaners support for review. Please provide a reason for escalation.
            </p>
            <textarea
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="Why are you escalating this dispute? (optional)"
              rows={3}
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalate}
                disabled={escalateDispute.isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {escalateDispute.isPending ? 'Escalating...' : 'Escalate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
