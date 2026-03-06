import { useState } from 'react';
import {
  useAuditLog,
  useAuditLogStats,
  useAuditLogEntry,
  useExportAuditLog,
  ACTION_TYPE_LABELS,
  ACTION_TYPE_COLORS,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPE_COLORS,
} from '@/hooks/useAuditLog';
import type { AuditLogEntry, AuditChange } from '@/hooks/useAuditLog';

const formatDateTime = (ts: string) =>
  new Date(ts).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const formatDateShort = (ts: string) =>
  new Date(ts).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('all');
  const [resourceType, setResourceType] = useState('all');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const { data: logData, isLoading } = useAuditLog({
    page,
    limit: 15,
    search: search || undefined,
    action_type: actionType,
    resource_type: resourceType,
  });
  const { data: stats } = useAuditLogStats();
  const { data: selectedEntry } = useAuditLogEntry(selectedEntryId);
  const exportAudit = useExportAuditLog();

  const handleExport = (format: 'csv' | 'pdf') => {
    exportAudit.mutate(
      { format },
      {
        onSuccess: (data) => {
          window.open(data.download_url, '_blank');
        },
      },
    );
  };

  // Unique action types and resource types for filters
  const actionTypes = [
    'all',
    'vendor_approve', 'vendor_suspend', 'vendor_reject',
    'order_cancel', 'order_refund', 'order_reassign',
    'settlement_approve', 'settlement_process', 'settlement_reject',
    'product_approve', 'product_reject',
    'user_suspend', 'user_create',
    'coupon_create', 'coupon_update',
    'zone_create', 'zone_update',
    'campaign_approve', 'campaign_reject', 'campaign_suspend',
    'violation_create', 'violation_resolve',
    'appeal_approve', 'appeal_deny',
    'settings_update', 'role_create',
    'tax_config_update', 'brand_verify',
    'policy_rule_create',
  ];

  const resourceTypes = [
    'all', 'user', 'vendor', 'order', 'product', 'settlement',
    'coupon', 'zone', 'campaign', 'violation', 'appeal',
    'settings', 'role', 'tax_config', 'brand', 'policy_rule',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-gray-500">Track all admin actions and changes across the platform</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exportAudit.isPending}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Total Actions</p>
            <p className="mt-1 text-2xl font-bold">{stats.total_actions}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Actions Today</p>
            <p className="mt-1 text-2xl font-bold">{stats.actions_today}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Active Admins</p>
            <p className="mt-1 text-2xl font-bold">{stats.unique_admins}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Most Active</p>
            <p className="mt-1 text-lg font-bold">{stats.most_active_admin.name}</p>
            <p className="text-xs text-gray-500">{stats.most_active_admin.action_count} actions</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <input
            type="text"
            placeholder="Search admin, resource, description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={actionType}
          onChange={(e) => { setActionType(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          {actionTypes.map((at) => (
            <option key={at} value={at}>
              {at === 'all' ? 'All Actions' : ACTION_TYPE_LABELS[at] || at}
            </option>
          ))}
        </select>
        <select
          value={resourceType}
          onChange={(e) => { setResourceType(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          {resourceTypes.map((rt) => (
            <option key={rt} value={rt}>
              {rt === 'all' ? 'All Resources' : RESOURCE_TYPE_LABELS[rt] || rt}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-lg border bg-white">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading audit log...</div>
        ) : !logData?.data || logData.data.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No audit entries found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Changes</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logData.data.map((entry: AuditLogEntry) => (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                    {formatDateShort(entry.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{entry.admin_name}</p>
                      <p className="text-xs text-gray-400">{entry.admin_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${ACTION_TYPE_COLORS[entry.action_type] || 'bg-gray-100 text-gray-800'}`}>
                      {ACTION_TYPE_LABELS[entry.action_type] || entry.action_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RESOURCE_TYPE_COLORS[entry.resource_type] || 'bg-gray-100 text-gray-800'}`}>
                        {RESOURCE_TYPE_LABELS[entry.resource_type] || entry.resource_type}
                      </span>
                      <p className="mt-1 text-xs text-gray-500 truncate max-w-[150px]" title={entry.resource_name}>
                        {entry.resource_name}
                      </p>
                    </div>
                  </td>
                  <td className="max-w-[250px] px-4 py-3">
                    <p className="truncate text-gray-700" title={entry.description}>{entry.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    {entry.changes.length > 0 ? (
                      <span className="text-xs text-primary font-medium">{entry.changes.length} change{entry.changes.length !== 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedEntryId(entry.id)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {logData?.meta && logData.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * logData.meta.limit + 1} to{' '}
            {Math.min(page * logData.meta.limit, logData.meta.total)} of {logData.meta.total} entries
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, logData.meta.totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    page === pageNum ? 'bg-primary text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(logData.meta.totalPages, p + 1))}
              disabled={page === logData.meta.totalPages}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEntryId && selectedEntry && (
        <AuditDetailModal entry={selectedEntry} onClose={() => setSelectedEntryId(null)} />
      )}
    </div>
  );
}

// ==================== DETAIL MODAL ====================
function AuditDetailModal({ entry, onClose }: { entry: AuditLogEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Audit Entry Detail</h2>
            <p className="mt-1 text-sm text-gray-500">{entry.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info Grid */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Timestamp</p>
            <p className="text-sm font-medium">{formatDateTime(entry.timestamp)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Admin User</p>
            <p className="text-sm font-medium">{entry.admin_name}</p>
            <p className="text-xs text-gray-400">{entry.admin_email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Action</p>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${ACTION_TYPE_COLORS[entry.action_type] || 'bg-gray-100 text-gray-800'}`}>
              {ACTION_TYPE_LABELS[entry.action_type] || entry.action_type}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Resource</p>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RESOURCE_TYPE_COLORS[entry.resource_type] || 'bg-gray-100 text-gray-800'}`}>
              {RESOURCE_TYPE_LABELS[entry.resource_type] || entry.resource_type}
            </span>
            <p className="mt-1 text-sm">{entry.resource_name}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium text-gray-500">Description</p>
            <p className="text-sm">{entry.description}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">IP Address</p>
            <p className="text-sm font-mono">{entry.ip_address}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">User Agent</p>
            <p className="text-xs text-gray-600 truncate" title={entry.user_agent}>{entry.user_agent}</p>
          </div>
        </div>

        {/* Changes (JSON Diff) */}
        {entry.changes.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold">Changes ({entry.changes.length})</h3>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Field</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Old Value</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.changes.map((change: AuditChange, idx: number) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs font-medium">{change.field}</td>
                      <td className="px-3 py-2">
                        <ChangeValue value={change.old_value} isOld />
                      </td>
                      <td className="px-3 py-2">
                        <ChangeValue value={change.new_value} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Metadata */}
        {Object.keys(entry.metadata).length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold">Metadata</h3>
            <div className="rounded-md bg-gray-50 p-3">
              <pre className="whitespace-pre-wrap text-xs font-mono text-gray-700">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t pt-4">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeValue({ value, isOld }: { value: string | number | boolean | null; isOld?: boolean }) {
  if (value === null || value === undefined) {
    return <span className="text-xs italic text-gray-400">null</span>;
  }
  const display = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 font-mono text-xs ${
        isOld ? 'bg-red-50 text-red-700 line-through' : 'bg-green-50 text-green-700'
      }`}
    >
      {display}
    </span>
  );
}

export default AuditLogPage;
