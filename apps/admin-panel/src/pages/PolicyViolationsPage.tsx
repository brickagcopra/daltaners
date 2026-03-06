import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useAdminViolations,
  useViolationStats,
  useReviewViolation,
  useApplyPenalty,
  useResolveViolation,
  useDismissViolation,
  ViolationStatus,
  PolicyViolation,
  PenaltyType,
  VIOLATION_STATUS_LABELS,
  VIOLATION_STATUS_COLORS,
  POLICY_CATEGORY_LABELS,
  POLICY_SEVERITY_LABELS,
  SEVERITY_COLORS,
  PENALTY_TYPE_LABELS,
  DETECTED_BY_LABELS,
} from '@/hooks/usePolicy';

type ActionType = 'review' | 'penalty' | 'resolve' | 'dismiss';

const statusTabs: { label: string; value: ViolationStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Appealed', value: 'appealed' },
  { label: 'Penalty Applied', value: 'penalty_applied' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Dismissed', value: 'dismissed' },
];

export function PolicyViolationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<ViolationStatus | ''>('');
  const [actionTarget, setActionTarget] = useState<PolicyViolation | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [penaltyForm, setPenaltyForm] = useState({ penalty_type: 'warning' as PenaltyType, penalty_value: 0, suspension_days: 0, notes: '' });
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { data, isLoading } = useAdminViolations({
    page,
    limit: 20,
    search: search || undefined,
    status: activeStatus || undefined,
  });
  const { data: stats } = useViolationStats();

  const reviewMutation = useReviewViolation();
  const penaltyMutation = useApplyPenalty();
  const resolveMutation = useResolveViolation();
  const dismissMutation = useDismissViolation();

  const violations = data?.data || [];
  const meta = data?.meta;

  const openAction = (v: PolicyViolation, type: ActionType) => {
    setActionTarget(v);
    setActionType(type);
    setResolutionNotes('');
    setPenaltyForm({ penalty_type: 'warning', penalty_value: 0, suspension_days: 0, notes: '' });
  };

  const closeAction = () => { setActionTarget(null); setActionType(null); };

  const handleAction = () => {
    if (!actionTarget) return;
    switch (actionType) {
      case 'review':
        reviewMutation.mutate(actionTarget.id, { onSuccess: closeAction });
        break;
      case 'penalty':
        penaltyMutation.mutate({ id: actionTarget.id, ...penaltyForm }, { onSuccess: closeAction });
        break;
      case 'resolve':
        resolveMutation.mutate({ id: actionTarget.id, resolution_notes: resolutionNotes }, { onSuccess: closeAction });
        break;
      case 'dismiss':
        dismissMutation.mutate({ id: actionTarget.id, resolution_notes: resolutionNotes }, { onSuccess: closeAction });
        break;
    }
  };

  const isPending = reviewMutation.isPending || penaltyMutation.isPending || resolveMutation.isPending || dismissMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policy Violations</h1>
          <p className="text-gray-500 mt-1">Manage vendor policy violations across the platform</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.by_status?.pending || 0}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Under Review</p>
            <p className="text-2xl font-bold text-purple-600">{stats.by_status?.under_review || 0}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Penalty Applied</p>
            <p className="text-2xl font-bold text-red-600">{stats.by_status?.penalty_applied || 0}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{(stats.by_status?.resolved || 0) + (stats.by_status?.dismissed || 0)}</p>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by violation number, subject, or store..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

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

      {/* Violations table */}
      {!isLoading && violations.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Violation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detected</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {violations.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/policy/violations/${v.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {v.violation_number}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{v.subject}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.store_name || v.store_id}</td>
                    <td className="px-4 py-3 text-sm">{POLICY_CATEGORY_LABELS[v.category]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${SEVERITY_COLORS[v.severity]}`}>
                        {POLICY_SEVERITY_LABELS[v.severity]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${VIOLATION_STATUS_COLORS[v.status]}`}>
                        {VIOLATION_STATUS_LABELS[v.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{DETECTED_BY_LABELS[v.detected_by]}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(v.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {['pending', 'acknowledged'].includes(v.status) && (
                          <button onClick={() => openAction(v, 'review')} className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100">
                            Review
                          </button>
                        )}
                        {['under_review', 'acknowledged'].includes(v.status) && (
                          <button onClick={() => openAction(v, 'penalty')} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">
                            Penalty
                          </button>
                        )}
                        {!['resolved', 'dismissed'].includes(v.status) && (
                          <>
                            <button onClick={() => openAction(v, 'resolve')} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100">
                              Resolve
                            </button>
                            <button onClick={() => openAction(v, 'dismiss')} className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100">
                              Dismiss
                            </button>
                          </>
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
      {!isLoading && violations.length === 0 && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500">No violations found</p>
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
            <h3 className="text-lg font-semibold mb-2 capitalize">{actionType} Violation</h3>
            <p className="text-sm text-gray-600 mb-4">
              {actionTarget.violation_number} — {actionTarget.subject}
            </p>

            {actionType === 'review' && (
              <p className="text-sm text-gray-500">Mark this violation as under review?</p>
            )}

            {actionType === 'penalty' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Type</label>
                  <select
                    value={penaltyForm.penalty_type}
                    onChange={(e) => setPenaltyForm({ ...penaltyForm, penalty_type: e.target.value as PenaltyType })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(PENALTY_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                {penaltyForm.penalty_type === 'fine' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fine Amount (₱)</label>
                    <input
                      type="number"
                      value={penaltyForm.penalty_value}
                      onChange={(e) => setPenaltyForm({ ...penaltyForm, penalty_value: Number(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      min={0}
                    />
                  </div>
                )}
                {penaltyForm.penalty_type === 'suspension' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Suspension Days</label>
                    <input
                      type="number"
                      value={penaltyForm.suspension_days}
                      onChange={(e) => setPenaltyForm({ ...penaltyForm, suspension_days: Number(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      min={1}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={penaltyForm.notes}
                    onChange={(e) => setPenaltyForm({ ...penaltyForm, notes: e.target.value })}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {(actionType === 'resolve' || actionType === 'dismiss') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder={actionType === 'dismiss' ? 'Reason for dismissal...' : 'Resolution details...'}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeAction} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={isPending || ((actionType === 'resolve' || actionType === 'dismiss') && !resolutionNotes.trim())}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
