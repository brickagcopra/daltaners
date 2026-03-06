import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useMyDisputes,
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

const PRIORITY_BADGE_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusTabs: { label: string; value: DisputeStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Vendor Responded', value: 'vendor_response' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

export function DisputesPage() {
  const [activeStatus, setActiveStatus] = useState<DisputeStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMyDisputes({
    page,
    limit: 10,
    status: activeStatus || undefined,
  });

  const disputes = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Disputes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage your order disputes
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
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

      {/* Empty state */}
      {!isLoading && disputes.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-900">No disputes found</p>
          <p className="mt-1 text-xs text-gray-500">
            {activeStatus ? 'No disputes match the selected filter.' : 'You haven\'t filed any disputes yet.'}
          </p>
        </div>
      )}

      {/* Dispute cards */}
      <div className="space-y-3">
        {disputes.map((dispute) => (
          <Link
            key={dispute.id}
            to={`/disputes/${dispute.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-primary-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">
                    {dispute.dispute_number}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_COLORS[dispute.status]}`}>
                    {DISPUTE_STATUS_LABELS[dispute.status]}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE_COLORS[dispute.priority]}`}>
                    {DISPUTE_PRIORITY_LABELS[dispute.priority]}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-semibold text-gray-900 truncate">
                  {dispute.subject}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                  {dispute.description}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>{DISPUTE_CATEGORY_LABELS[dispute.category]}</span>
                  <span>Order: {dispute.order_id}</span>
                  <span>{new Date(dispute.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="ml-3 flex-shrink-0">
                {dispute.resolution_amount > 0 && (
                  <span className="text-sm font-semibold text-green-600">
                    +P{dispute.resolution_amount.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            {/* Message count indicator */}
            {dispute.messages && dispute.messages.length > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{dispute.messages.length} message{dispute.messages.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {page} of {meta.totalPages}
          </span>
          <button
            disabled={!meta.hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
