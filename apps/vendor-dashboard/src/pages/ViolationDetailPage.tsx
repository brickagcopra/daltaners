import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useMyViolation,
  useAcknowledgeViolation,
  useSubmitAppeal,
  VIOLATION_STATUS_LABELS,
  POLICY_CATEGORY_LABELS,
  POLICY_SEVERITY_LABELS,
  PENALTY_TYPE_LABELS,
  DETECTED_BY_LABELS,
  APPEAL_STATUS_LABELS,
} from '@/hooks/usePolicy';

const STATUS_BADGE_COLORS: Record<string, string> = {
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

const APPEAL_BADGE_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
  escalated: 'bg-orange-100 text-orange-700',
};

export function ViolationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: violation, isLoading } = useMyViolation(id || '');
  const acknowledgeMutation = useAcknowledgeViolation();
  const appealMutation = useSubmitAppeal();

  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealReason, setAppealReason] = useState('');

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (!violation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Violation not found</p>
        <Link to="/violations" className="text-orange-600 hover:underline mt-2 inline-block">
          Back to Violations
        </Link>
      </div>
    );
  }

  const handleAcknowledge = () => {
    acknowledgeMutation.mutate(violation.id);
  };

  const handleAppeal = () => {
    if (!appealReason.trim()) return;
    appealMutation.mutate(
      { violationId: violation.id, reason: appealReason.trim() },
      {
        onSuccess: () => {
          setShowAppealForm(false);
          setAppealReason('');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/violations" className="hover:text-orange-600">Violations</Link>
        <span>/</span>
        <span className="text-gray-900">{violation.violationNumber}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{violation.violationNumber}</h1>
            <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE_COLORS[violation.status] || ''}`}>
              {VIOLATION_STATUS_LABELS[violation.status]}
            </span>
            <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${SEVERITY_BADGE_COLORS[violation.severity] || ''}`}>
              {POLICY_SEVERITY_LABELS[violation.severity]}
            </span>
          </div>
          <p className="text-gray-600 mt-1">{violation.subject}</p>
        </div>
        <div className="flex gap-2">
          {violation.status === 'pending' && (
            <button
              onClick={handleAcknowledge}
              disabled={acknowledgeMutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Acknowledge'}
            </button>
          )}
          {['acknowledged', 'under_review', 'penalty_applied'].includes(violation.status) && (
            <button
              onClick={() => setShowAppealForm(true)}
              className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Submit Appeal
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{violation.description}</p>
            {violation.evidenceUrls.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Evidence</p>
                <div className="flex flex-wrap gap-2">
                  {violation.evidenceUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-orange-600 hover:underline"
                    >
                      Evidence {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Penalty info */}
          {violation.penaltyType && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-3">Penalty Applied</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-red-600">Penalty Type</p>
                  <p className="font-medium text-red-800">{PENALTY_TYPE_LABELS[violation.penaltyType]}</p>
                </div>
                {violation.penaltyValue > 0 && (
                  <div>
                    <p className="text-red-600">Fine Amount</p>
                    <p className="font-medium text-red-800">₱{violation.penaltyValue.toLocaleString()}</p>
                  </div>
                )}
                {violation.penaltyAppliedAt && (
                  <div>
                    <p className="text-red-600">Applied At</p>
                    <p className="font-medium text-red-800">{new Date(violation.penaltyAppliedAt).toLocaleString()}</p>
                  </div>
                )}
                {violation.penaltyExpiresAt && (
                  <div>
                    <p className="text-red-600">Expires At</p>
                    <p className="font-medium text-red-800">{new Date(violation.penaltyExpiresAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resolution */}
          {violation.resolutionNotes && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-800 mb-3">Resolution</h2>
              <p className="text-green-700">{violation.resolutionNotes}</p>
              {violation.resolvedAt && (
                <p className="text-xs text-green-600 mt-2">
                  Resolved on {new Date(violation.resolvedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Appeals */}
          {violation.appeals && violation.appeals.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Appeals ({violation.appeals.length})</h2>
              <div className="space-y-4">
                {violation.appeals.map((appeal) => (
                  <div key={appeal.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{appeal.appealNumber}</span>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${APPEAL_BADGE_COLORS[appeal.status] || ''}`}>
                        {APPEAL_STATUS_LABELS[appeal.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{appeal.reason}</p>
                    {appeal.adminNotes && (
                      <div className="mt-3 bg-gray-50 rounded p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Admin Response</p>
                        <p className="text-sm text-gray-700">{appeal.adminNotes}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Submitted {new Date(appeal.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium">{POLICY_CATEGORY_LABELS[violation.category]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Severity</dt>
                <dd className="font-medium">{POLICY_SEVERITY_LABELS[violation.severity]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Detected By</dt>
                <dd className="font-medium">{DETECTED_BY_LABELS[violation.detectedBy]}</dd>
              </div>
              {violation.ruleName && (
                <div>
                  <dt className="text-gray-500">Policy Rule</dt>
                  <dd className="font-medium">{violation.ruleName}</dd>
                  {violation.ruleCode && (
                    <dd className="text-xs text-gray-400">{violation.ruleCode}</dd>
                  )}
                </div>
              )}
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium">{new Date(violation.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="font-medium">{new Date(violation.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Appeal Form Modal */}
      {showAppealForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold mb-2">Submit Appeal</h3>
            <p className="text-sm text-gray-600 mb-4">
              Appeal for violation <strong>{violation.violationNumber}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Appeal</label>
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                rows={5}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Provide a detailed explanation of why this violation should be reviewed or dismissed..."
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAppealForm(false); setAppealReason(''); }}
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
