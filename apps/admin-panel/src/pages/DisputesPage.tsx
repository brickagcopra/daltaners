import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAllDisputes,
  useDisputeStats,
  useEscalateDispute,
  useResolveDispute,
  useCloseDispute,
  useAutoEscalateDisputes,
  DISPUTE_STATUS_LABELS,
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_PRIORITY_LABELS,
  DISPUTE_PRIORITY_COLORS,
  type DisputeStatus,
  type DisputeCategory,
  type DisputePriority,
  type DisputeResolutionType,
  type Dispute,
} from '@/hooks/useDisputes';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/common/DataTable';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'vendor_response', label: 'Vendor Responded' },
  { value: 'customer_reply', label: 'Customer Reply' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'order_not_received', label: 'Order Not Received' },
  { value: 'item_missing', label: 'Missing Item' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'damaged_item', label: 'Damaged Item' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'overcharged', label: 'Overcharged' },
  { value: 'late_delivery', label: 'Late Delivery' },
  { value: 'vendor_behavior', label: 'Vendor Behavior' },
  { value: 'delivery_behavior', label: 'Delivery Behavior' },
  { value: 'unauthorized_charge', label: 'Unauthorized Charge' },
  { value: 'other', label: 'Other' },
];

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusVariant: Record<DisputeStatus, 'success' | 'destructive' | 'warning' | 'info' | 'muted' | 'default' | 'secondary'> = {
  open: 'info',
  vendor_response: 'warning',
  customer_reply: 'warning',
  under_review: 'secondary',
  escalated: 'destructive',
  resolved: 'success',
  closed: 'muted',
};

const resolutionOptions: { value: DisputeResolutionType; label: string }[] = [
  { value: 'refund', label: 'Full Refund' },
  { value: 'partial_refund', label: 'Partial Refund' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'no_action', label: 'No Action' },
  { value: 'warning_issued', label: 'Warning Issued' },
];

type AdminAction = 'escalate' | 'resolve' | 'close' | null;

export function DisputesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');

  // Admin action modal
  const [actionTarget, setActionTarget] = useState<Dispute | null>(null);
  const [actionType, setActionType] = useState<AdminAction>(null);
  const [escalationReason, setEscalationReason] = useState('');
  const [resolutionType, setResolutionType] = useState<DisputeResolutionType>('refund');
  const [resolutionAmount, setResolutionAmount] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [closeReason, setCloseReason] = useState('');

  const { data, isLoading } = useAllDisputes({
    page,
    limit: 20,
    search: search || undefined,
    status: (status as DisputeStatus) || undefined,
    category: (category as DisputeCategory) || undefined,
    priority: (priority as DisputePriority) || undefined,
  });

  const { data: statsData } = useDisputeStats();
  const stats = statsData?.data;

  const escalateMutation = useEscalateDispute();
  const resolveMutation = useResolveDispute();
  const closeMutation = useCloseDispute();
  const autoEscalateMutation = useAutoEscalateDisputes();

  const openAction = (dispute: Dispute, type: AdminAction) => {
    setActionTarget(dispute);
    setActionType(type);
    setEscalationReason('');
    setResolutionType('refund');
    setResolutionAmount('');
    setResolutionNotes('');
    setCloseReason('');
  };

  const closeAction = () => {
    setActionTarget(null);
    setActionType(null);
  };

  const handleAction = () => {
    if (!actionTarget || !actionType) return;

    const onSuccess = () => closeAction();

    if (actionType === 'escalate') {
      escalateMutation.mutate(
        { id: actionTarget.id, reason: escalationReason.trim() },
        { onSuccess },
      );
    } else if (actionType === 'resolve') {
      resolveMutation.mutate(
        {
          id: actionTarget.id,
          resolution_type: resolutionType,
          resolution_amount: resolutionAmount ? parseFloat(resolutionAmount) : undefined,
          resolution_notes: resolutionNotes.trim() || undefined,
        },
        { onSuccess },
      );
    } else if (actionType === 'close') {
      closeMutation.mutate(
        { id: actionTarget.id, reason: closeReason.trim() || undefined },
        { onSuccess },
      );
    }
  };

  const isActioning = escalateMutation.isPending || resolveMutation.isPending || closeMutation.isPending;

  const columns: Column<Dispute>[] = [
    {
      key: 'disputeNumber',
      header: 'Dispute #',
      render: (d) => (
        <button
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => navigate(`/disputes/${d.id}`)}
        >
          {d.dispute_number}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <Badge variant={statusVariant[d.status] || 'muted'}>
          {DISPUTE_STATUS_LABELS[d.status]}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (d) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${DISPUTE_PRIORITY_COLORS[d.priority]}`}>
          {DISPUTE_PRIORITY_LABELS[d.priority]}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (d) => (
        <span className="text-sm text-muted-foreground">
          {DISPUTE_CATEGORY_LABELS[d.category]}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (d) => (
        <span className="max-w-[200px] truncate text-sm text-foreground" title={d.subject}>
          {d.subject}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (d) => (
        <span className="text-sm text-muted-foreground font-mono">{d.customer_id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'store',
      header: 'Store',
      render: (d) => (
        <span className="text-sm text-muted-foreground font-mono">{d.store_id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (d) => (
        <span className="text-sm text-muted-foreground">
          {new Date(d.created_at).toLocaleDateString('en-PH', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {['open', 'vendor_response', 'customer_reply', 'under_review'].includes(d.status) && (
            <Button size="sm" variant="outline" onClick={() => openAction(d, 'escalate')}>
              Escalate
            </Button>
          )}
          {['open', 'vendor_response', 'customer_reply', 'under_review', 'escalated'].includes(d.status) && (
            <Button size="sm" variant="success" onClick={() => openAction(d, 'resolve')}>
              Resolve
            </Button>
          )}
          {d.status === 'resolved' && (
            <Button size="sm" variant="outline" onClick={() => openAction(d, 'close')}>
              Close
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
          <p className="mt-1 text-sm text-gray-500">Review and manage all platform disputes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => autoEscalateMutation.mutate()}
          disabled={autoEscalateMutation.isPending}
          loading={autoEscalateMutation.isPending}
        >
          Auto-Escalate Overdue
        </Button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Open</p>
            <p className="text-2xl font-bold text-blue-600">{stats.by_status?.open ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Escalated</p>
            <p className="text-2xl font-bold text-red-600">{stats.by_status?.escalated ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Overdue</p>
            <p className="text-2xl font-bold text-orange-600">{stats.overdue_count ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{stats.by_status?.resolved ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Avg Resolution</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avg_resolution_hours.toFixed(1)}h</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search dispute #, subject..."
          />
        </div>
        <div className="w-44">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-44">
          <Select
            options={categoryOptions}
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-36">
          <Select
            options={priorityOptions}
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          data={Array.isArray(data?.data) ? data.data : []}
          isLoading={isLoading}
          keyExtractor={(d) => d.id}
          emptyTitle="No disputes found"
          emptyDescription="No disputes match the current filters."
        />
        {data?.meta && (
          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={data.meta.limit}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Admin Action Modal */}
      <Modal
        isOpen={!!actionTarget && !!actionType}
        onClose={closeAction}
        title={
          actionType === 'escalate' ? 'Escalate Dispute' :
          actionType === 'resolve' ? 'Resolve Dispute' :
          'Close Dispute'
        }
        size="md"
      >
        <div className="space-y-4">
          {actionTarget && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p><strong>Dispute:</strong> {actionTarget.dispute_number}</p>
              <p><strong>Status:</strong> {DISPUTE_STATUS_LABELS[actionTarget.status]}</p>
              <p><strong>Category:</strong> {DISPUTE_CATEGORY_LABELS[actionTarget.category]}</p>
              <p><strong>Subject:</strong> {actionTarget.subject}</p>
            </div>
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
                placeholder="Optional reason for closing this dispute..."
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeAction}>Cancel</Button>
            <Button
              variant={actionType === 'escalate' ? 'destructive' : actionType === 'resolve' ? 'success' : 'default'}
              onClick={handleAction}
              disabled={
                isActioning ||
                (actionType === 'escalate' && !escalationReason.trim())
              }
              loading={isActioning}
            >
              {actionType === 'escalate' ? 'Escalate' :
               actionType === 'resolve' ? 'Resolve' :
               'Close Dispute'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
