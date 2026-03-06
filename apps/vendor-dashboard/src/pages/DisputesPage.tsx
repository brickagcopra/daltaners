import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useVendorDisputes,
  useRespondToDispute,
  DisputeStatus,
  Dispute,
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

const PRIORITY_BADGE_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusTabs: { label: string; value: DisputeStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Customer Reply', value: 'customer_reply' },
  { label: 'Responded', value: 'vendor_response' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'Resolved', value: 'resolved' },
];

export function DisputesPage() {
  const [activeStatus, setActiveStatus] = useState<DisputeStatus | ''>('');
  const [page, setPage] = useState(1);
  const [respondTarget, setRespondTarget] = useState<Dispute | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  const { data, isLoading } = useVendorDisputes({
    page,
    limit: 20,
    status: activeStatus || undefined,
  });

  const respondMutation = useRespondToDispute();

  const disputes = data?.data || [];
  const meta = data?.meta;

  const handleRespond = () => {
    if (!respondTarget || !responseMessage.trim()) return;
    respondMutation.mutate(
      { disputeId: respondTarget.id, message: responseMessage.trim() },
      {
        onSuccess: () => {
          setRespondTarget(null);
          setResponseMessage('');
        },
      },
    );
  };

  const canRespond = (status: DisputeStatus) =>
    ['open', 'customer_reply', 'escalated'].includes(status);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage customer disputes for your store
        </p>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveStatus(tab.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeStatus === tab.value
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      )}

      {/* Table */}
      {!isLoading && disputes.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Dispute #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {disputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link to={`/disputes/${dispute.id}`} className="text-sm font-medium text-primary-600 hover:underline">
                      {dispute.disputeNumber}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_COLORS[dispute.status]}`}>
                      {DISPUTE_STATUS_LABELS[dispute.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE_COLORS[dispute.priority]}`}>
                      {DISPUTE_PRIORITY_LABELS[dispute.priority]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {DISPUTE_CATEGORY_LABELS[dispute.category]}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-900">
                    {dispute.subject}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(dispute.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {canRespond(dispute.status) && (
                      <button
                        onClick={() => setRespondTarget(dispute)}
                        className="rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100"
                      >
                        Respond
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && disputes.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No disputes found</p>
          <p className="mt-1 text-xs text-gray-500">
            {activeStatus ? 'No disputes match the selected filter.' : 'No disputes have been filed against your store.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">Page {page} of {meta.totalPages}</span>
          <button
            disabled={!meta.hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Respond Modal */}
      {respondTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Respond to Dispute</h3>
            <div className="mt-2 rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">{respondTarget.disputeNumber}</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{respondTarget.subject}</p>
              <p className="mt-0.5 text-xs text-gray-600">{DISPUTE_CATEGORY_LABELS[respondTarget.category]}</p>
            </div>
            <textarea
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder="Type your response to the customer..."
              rows={4}
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRespondTarget(null);
                  setResponseMessage('');
                }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={!responseMessage.trim() || respondMutation.isPending}
                className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {respondMutation.isPending ? 'Sending...' : 'Send Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
