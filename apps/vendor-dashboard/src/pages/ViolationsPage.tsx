import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useMyViolations,
  useMyViolationSummary,
  useAcknowledgeViolation,
  useSubmitAppeal,
  ViolationStatus,
  Violation,
  VIOLATION_STATUS_LABELS,
  POLICY_CATEGORY_LABELS,
  POLICY_SEVERITY_LABELS,
  PENALTY_TYPE_LABELS,
  DETECTED_BY_LABELS,
} from '@/hooks/usePolicy';

const STATUS_BADGE_COLORS: Record<ViolationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  acknowledged: 'bg-blue-100 text-blue-700',
  under_review: 'bg-purple-100 text-purple-700',
  appealed: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
  penalty_applied: 'bg-red-100 text-red-700',
};

const SEVERITY_BADGE_COLORS: Record<string, string> = {
  warning: 'bg-gray-100 text-gray-600',
  minor: 'bg-blue-100 text-blue-600',
  major: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

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

export function ViolationsPage() {
  const [activeStatus, setActiveStatus] = useState<ViolationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [appealTarget, setAppealTarget] = useState<Violation | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [acknowledgeTarget, setAcknowledgeTarget] = useState<Violation | null>(null);

  const { data, isLoading } = useMyViolations({
    page,
    limit: 20,
    status: activeStatus || undefined,
  });

  const { data: summary } = useMyViolationSummary();
  const acknowledgeMutation = useAcknowledgeViolation();
  const appealMutation = useSubmitAppeal();

  const violations = data?.data || [];
  const meta = data?.meta;

  const handleAcknowledge = () => {
    if (!acknowledgeTarget) return;
    acknowledgeMutation.mutate(acknowledgeTarget.id, {
      onSuccess: () => setAcknowledgeTarget(null),
    });
  };

  const handleAppeal = () => {
    if (!appealTarget || !appealReason.trim()) return;
    appealMutation.mutate(
      { violationId: appealTarget.id, reason: appealReason.trim() },
      {
        onSuccess: () => {
          setAppealTarget(null);
          setAppealReason('');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Policy Violations</h1>
        <p className="text-gray-500 mt-1">Review and manage policy violations for your store</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Pending Action</p>
            <p className="text-2xl font-bold text-yellow-600">
              {(summary.byStatus.pending || 0) + (summary.byStatus.acknowledged || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Active Penalties</p>
            <p className="text-2xl font-bold text-red-600">{summary.byStatus.penalty_applied || 0}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="text-2xl font-bold text-green-600">
              {(summary.byStatus.resolved || 0) + (summary.byStatus.dismissed || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveStatus(tab.value); setPage(1); }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeStatus === tab.value
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detected By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {violations.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/violations/${v.id}`} className="text-sm font-medium text-orange-600 hover:underline">
                        {v.violationNumber}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{v.subject}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{POLICY_CATEGORY_LABELS[v.category] || v.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${SEVERITY_BADGE_COLORS[v.severity] || 'bg-gray-100 text-gray-600'}`}>
                        {POLICY_SEVERITY_LABELS[v.severity] || v.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE_COLORS[v.status] || 'bg-gray-100 text-gray-600'}`}>
                        {VIOLATION_STATUS_LABELS[v.status] || v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {DETECTED_BY_LABELS[v.detectedBy] || v.detectedBy}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {v.status === 'pending' && (
                          <button
                            onClick={() => setAcknowledgeTarget(v)}
                            className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Acknowledge
                          </button>
                        )}
                        {['acknowledged', 'under_review', 'penalty_applied'].includes(v.status) && (
                          <button
                            onClick={() => setAppealTarget(v)}
                            className="px-2 py-1 text-xs font-medium bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
                          >
                            Appeal
                          </button>
                        )}
                        <Link
                          to={`/violations/${v.id}`}
                          className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                        >
                          View
                        </Link>
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
          <p className="text-sm text-gray-400 mt-1">Your store is in good standing!</p>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasMore}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Acknowledge Modal */}
      {acknowledgeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-2">Acknowledge Violation</h3>
            <p className="text-sm text-gray-600 mb-4">
              By acknowledging violation <strong>{acknowledgeTarget.violationNumber}</strong>, you confirm that you have
              reviewed and understood this violation. You can submit an appeal afterward if you disagree.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-yellow-800">{acknowledgeTarget.subject}</p>
              <p className="text-xs text-yellow-700 mt-1">{acknowledgeTarget.description}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAcknowledgeTarget(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAcknowledge}
                disabled={acknowledgeMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Acknowledge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appeal Modal */}
      {appealTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold mb-2">Submit Appeal</h3>
            <p className="text-sm text-gray-600 mb-4">
              Appeal violation <strong>{appealTarget.violationNumber}</strong> — {appealTarget.subject}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Appeal</label>
                <textarea
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Explain why you believe this violation should be reviewed or dismissed..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setAppealTarget(null); setAppealReason(''); }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAppeal}
                disabled={appealMutation.isPending || !appealReason.trim()}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {appealMutation.isPending ? 'Submitting...' : 'Submit Appeal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
