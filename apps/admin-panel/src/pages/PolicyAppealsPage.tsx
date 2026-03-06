import { useState } from 'react';
import {
  useAdminAppeals,
  useAppealStats,
  useReviewAppeal,
  useApproveAppeal,
  useDenyAppeal,
  useEscalateAppeal,
  AppealStatus,
  Appeal,
  APPEAL_STATUS_LABELS,
  APPEAL_STATUS_COLORS,
  VIOLATION_STATUS_LABELS,
  POLICY_SEVERITY_LABELS,
  SEVERITY_COLORS,
} from '@/hooks/usePolicy';

type ActionType = 'review' | 'approve' | 'deny' | 'escalate';

const statusTabs: { label: string; value: AppealStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Denied', value: 'denied' },
  { label: 'Escalated', value: 'escalated' },
];

export function PolicyAppealsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<AppealStatus | ''>('');
  const [actionTarget, setActionTarget] = useState<Appeal | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading } = useAdminAppeals({
    page,
    limit: 20,
    search: search || undefined,
    status: activeStatus || undefined,
  });
  const { data: stats } = useAppealStats();

  const reviewMutation = useReviewAppeal();
  const approveMutation = useApproveAppeal();
  const denyMutation = useDenyAppeal();
  const escalateMutation = useEscalateAppeal();

  const appeals = data?.data || [];
  const meta = data?.meta;

  const openAction = (a: Appeal, type: ActionType) => {
    setActionTarget(a);
    setActionType(type);
    setAdminNotes('');
  };

  const closeAction = () => { setActionTarget(null); setActionType(null); };

  const handleAction = () => {
    if (!actionTarget) return;
    switch (actionType) {
      case 'review':
        reviewMutation.mutate({ id: actionTarget.id, admin_notes: adminNotes }, { onSuccess: closeAction });
        break;
      case 'approve':
        approveMutation.mutate({ id: actionTarget.id, admin_notes: adminNotes || undefined }, { onSuccess: closeAction });
        break;
      case 'deny':
        denyMutation.mutate({ id: actionTarget.id, admin_notes: adminNotes }, { onSuccess: closeAction });
        break;
      case 'escalate':
        escalateMutation.mutate(actionTarget.id, { onSuccess: closeAction });
        break;
    }
  };

  const isPending = reviewMutation.isPending || approveMutation.isPending || denyMutation.isPending || escalateMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendor Appeals</h1>
        <p className="text-gray-500 mt-1">Review and manage vendor appeals against policy violations</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Appeals</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600">
              {(stats.by_status?.pending || 0) + (stats.by_status?.under_review || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Approval Rate</p>
            <p className="text-2xl font-bold text-green-600">{stats.approval_rate}%</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Escalated</p>
            <p className="text-2xl font-bold text-orange-600">{stats.by_status?.escalated || 0}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by appeal number, reason, or store..."
        className="w-full md:w-96 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
      />

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveStatus(tab.value); setPage(1); }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeStatus === tab.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {/* Appeals table */}
      {!isLoading && appeals.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appeal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Violation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appeals.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{a.appeal_number}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.store_name || a.store_id}</td>
                    <td className="px-4 py-3">
                      {a.violation ? (
                        <div>
                          <span className="text-sm text-blue-600">{a.violation.violation_number}</span>
                          <div className="flex gap-1 mt-0.5">
                            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${SEVERITY_COLORS[a.violation.severity]}`}>
                              {POLICY_SEVERITY_LABELS[a.violation.severity]}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {VIOLATION_STATUS_LABELS[a.violation.status]}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${APPEAL_STATUS_COLORS[a.status]}`}>
                        {APPEAL_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{a.reason}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {a.status === 'pending' && (
                          <button onClick={() => openAction(a, 'review')} className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100">
                            Review
                          </button>
                        )}
                        {['pending', 'under_review'].includes(a.status) && (
                          <>
                            <button onClick={() => openAction(a, 'approve')} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100">
                              Approve
                            </button>
                            <button onClick={() => openAction(a, 'deny')} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">
                              Deny
                            </button>
                          </>
                        )}
                        {['pending', 'under_review'].includes(a.status) && (
                          <button onClick={() => openAction(a, 'escalate')} className="px-2 py-1 text-xs bg-orange-50 text-orange-600 rounded hover:bg-orange-100">
                            Escalate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && appeals.length === 0 && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500">No appeals found</p>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages} ({meta.total} total)</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page <= 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={!meta.hasMore} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-2 capitalize">{actionType} Appeal</h3>
            <p className="text-sm text-gray-600 mb-1">{actionTarget.appeal_number}</p>
            <p className="text-xs text-gray-500 mb-4">{actionTarget.store_name}</p>

            {/* Appeal reason */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Vendor's Reason</p>
              <p className="text-sm text-gray-700">{actionTarget.reason}</p>
            </div>

            {actionType === 'escalate' ? (
              <p className="text-sm text-gray-500">Escalate this appeal for higher-level review?</p>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes {actionType === 'deny' ? '(required)' : '(optional)'}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder={
                    actionType === 'approve' ? 'Reason for approval...'
                    : actionType === 'deny' ? 'Reason for denial...'
                    : 'Review notes...'
                  }
                />
              </div>
            )}

            {actionType === 'approve' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                <p className="text-xs text-green-700">
                  Approving this appeal will automatically dismiss the linked violation.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeAction} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleAction}
                disabled={isPending || (actionType === 'deny' && !adminNotes.trim())}
                className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${
                  actionType === 'approve' ? 'bg-green-600 hover:bg-green-700'
                  : actionType === 'deny' ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
