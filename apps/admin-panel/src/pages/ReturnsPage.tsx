import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAllReturns,
  useReturnStats,
  useEscalateReturn,
  useOverrideApproveReturn,
  useOverrideDenyReturn,
  RETURN_STATUS_LABELS,
  RETURN_REASON_LABELS,
  type ReturnStatus,
  type ReturnReasonCategory,
  type ReturnRequest,
} from '@/hooks/useReturns';
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
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'received', label: 'Received' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'cancelled', label: 'Cancelled' },
];

const reasonOptions = [
  { value: '', label: 'All Reasons' },
  { value: 'defective', label: 'Defective' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'missing_item', label: 'Missing Item' },
  { value: 'expired', label: 'Expired' },
  { value: 'change_of_mind', label: 'Change of Mind' },
  { value: 'other', label: 'Other' },
];

const statusVariant: Record<ReturnStatus, 'success' | 'destructive' | 'warning' | 'info' | 'muted' | 'default' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  denied: 'destructive',
  cancelled: 'muted',
  received: 'info',
  refunded: 'success',
  escalated: 'warning',
};

type AdminAction = 'escalate' | 'override-approve' | 'override-deny' | null;

export function ReturnsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');

  // Admin action modal
  const [actionTarget, setActionTarget] = useState<ReturnRequest | null>(null);
  const [actionType, setActionType] = useState<AdminAction>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [refundOverride, setRefundOverride] = useState('');

  const { data, isLoading } = useAllReturns({
    page,
    limit: 20,
    search: search || undefined,
    status: (status as ReturnStatus) || undefined,
    reason_category: (reason as ReturnReasonCategory) || undefined,
  });

  const { data: statsData } = useReturnStats();
  const stats = statsData?.data;

  const escalateMutation = useEscalateReturn();
  const overrideApproveMutation = useOverrideApproveReturn();
  const overrideDenyMutation = useOverrideDenyReturn();

  const formatCurrency = (amount: number) =>
    `P${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const openAction = (ret: ReturnRequest, type: AdminAction) => {
    setActionTarget(ret);
    setActionType(type);
    setAdminNotes('');
    setRefundOverride('');
  };

  const closeAction = () => {
    setActionTarget(null);
    setActionType(null);
    setAdminNotes('');
    setRefundOverride('');
  };

  const handleAction = () => {
    if (!actionTarget || !actionType) return;

    const onSuccess = () => closeAction();
    const refundAmount = refundOverride ? parseFloat(refundOverride) : undefined;

    if (actionType === 'escalate') {
      escalateMutation.mutate(
        { id: actionTarget.id, admin_notes: adminNotes || undefined, refund_amount: refundAmount },
        { onSuccess },
      );
    } else if (actionType === 'override-approve') {
      overrideApproveMutation.mutate(
        { id: actionTarget.id, admin_notes: adminNotes || undefined, refund_amount: refundAmount },
        { onSuccess },
      );
    } else if (actionType === 'override-deny') {
      overrideDenyMutation.mutate(
        { id: actionTarget.id, admin_notes: adminNotes || undefined },
        { onSuccess },
      );
    }
  };

  const isActioning = escalateMutation.isPending || overrideApproveMutation.isPending || overrideDenyMutation.isPending;

  const columns: Column<ReturnRequest>[] = [
    {
      key: 'requestNumber',
      header: 'Request #',
      render: (ret) => (
        <button
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => navigate(`/returns/${ret.id}`)}
        >
          {ret.request_number}
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (ret) => (
        <span className="text-sm text-muted-foreground font-mono">{ret.customer_id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'store',
      header: 'Store',
      render: (ret) => (
        <span className="text-sm text-muted-foreground font-mono">{ret.store_id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (ret) => (
        <Badge variant={statusVariant[ret.status] || 'muted'}>
          {RETURN_STATUS_LABELS[ret.status]}
        </Badge>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (ret) => (
        <span className="text-sm text-muted-foreground">
          {RETURN_REASON_LABELS[ret.reason_category]}
        </span>
      ),
    },
    {
      key: 'refund',
      header: 'Refund',
      render: (ret) => (
        <span className="text-sm font-semibold text-foreground">{formatCurrency(ret.refund_amount)}</span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (ret) => (
        <span className="text-sm text-muted-foreground">{ret.items?.length ?? 0}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (ret) => (
        <span className="text-sm text-muted-foreground">
          {new Date(ret.created_at).toLocaleDateString('en-PH', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (ret) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {(ret.status === 'pending' || ret.status === 'approved') && (
            <Button size="sm" variant="outline" onClick={() => openAction(ret, 'escalate')}>
              Escalate
            </Button>
          )}
          {ret.status === 'denied' && (
            <Button size="sm" variant="success" onClick={() => openAction(ret, 'override-approve')}>
              Override
            </Button>
          )}
          {(ret.status === 'pending' || ret.status === 'escalated') && (
            <Button size="sm" variant="destructive" onClick={() => openAction(ret, 'override-deny')}>
              Deny
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Return Requests</h1>
        <p className="mt-1 text-sm text-gray-500">Review and manage all platform return requests</p>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Returns</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.by_status?.pending ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Refunds</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_refund_amount)}</p>
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
            placeholder="Search request #, customer..."
          />
        </div>
        <div className="w-40">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-44">
          <Select
            options={reasonOptions}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          data={Array.isArray(data?.data) ? data.data : []}
          isLoading={isLoading}
          keyExtractor={(ret) => ret.id}
          emptyTitle="No return requests found"
          emptyDescription="No returns match the current filters."
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
          actionType === 'escalate' ? 'Escalate Return Request' :
          actionType === 'override-approve' ? 'Override: Approve Return' :
          'Override: Deny Return'
        }
        size="md"
      >
        <div className="space-y-4">
          {actionTarget && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p><strong>Request:</strong> {actionTarget.request_number}</p>
              <p><strong>Status:</strong> {RETURN_STATUS_LABELS[actionTarget.status]}</p>
              <p><strong>Reason:</strong> {RETURN_REASON_LABELS[actionTarget.reason_category]}</p>
              <p><strong>Refund Amount:</strong> {formatCurrency(actionTarget.refund_amount)}</p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Admin Notes {actionType === 'override-deny' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={
                actionType === 'escalate'
                  ? 'Explain why this return is being escalated...'
                  : actionType === 'override-approve'
                    ? 'Reason for overriding vendor denial...'
                    : 'Reason for overriding and denying return...'
              }
              rows={3}
            />
          </div>

          {actionType !== 'override-deny' && (
            <Input
              label="Refund Amount Override (optional)"
              type="number"
              value={refundOverride}
              onChange={(e) => setRefundOverride(e.target.value)}
              placeholder={actionTarget ? String(actionTarget.refund_amount) : '0.00'}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeAction}>Cancel</Button>
            <Button
              variant={actionType === 'override-deny' ? 'destructive' : actionType === 'override-approve' ? 'success' : 'default'}
              onClick={handleAction}
              disabled={isActioning || (actionType === 'override-deny' && !adminNotes.trim())}
              loading={isActioning}
            >
              {actionType === 'escalate' ? 'Escalate' :
               actionType === 'override-approve' ? 'Override Approve' :
               'Override Deny'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
