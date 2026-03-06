import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useVendorReturns,
  useApproveReturn,
  useDenyReturn,
  useMarkReturnReceived,
  RETURN_STATUS_LABELS,
  RETURN_REASON_LABELS,
  type ReturnStatus,
  type ReturnRequest,
} from '@/hooks/useReturns';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/common/Pagination';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const statusTabs = [
  { label: 'All Returns', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Received', value: 'received' },
  { label: 'Denied', value: 'denied' },
  { label: 'Escalated', value: 'escalated' },
];

const STATUS_BADGE_MAP: Record<ReturnStatus, 'default' | 'success' | 'danger' | 'warning' | 'secondary' | 'info'> = {
  pending: 'default',
  approved: 'success',
  denied: 'danger',
  cancelled: 'info',
  received: 'secondary',
  refunded: 'success',
  escalated: 'warning',
};

export function ReturnsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | 'all'>('all');

  // Modals
  const [approveReturn, setApproveReturn] = useState<ReturnRequest | null>(null);
  const [denyReturn, setDenyReturn] = useState<ReturnRequest | null>(null);
  const [receiveReturn, setReceiveReturn] = useState<ReturnRequest | null>(null);
  const [vendorResponse, setVendorResponse] = useState('');

  const { data, isLoading } = useVendorReturns({
    page,
    limit: 20,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const approveMutation = useApproveReturn();
  const denyMutation = useDenyReturn();
  const receiveMutation = useMarkReturnReceived();

  const returns = data?.data ?? [];
  const meta = data?.meta;

  const handleApprove = () => {
    if (!approveReturn) return;
    approveMutation.mutate(
      { returnId: approveReturn.id, vendorResponse: vendorResponse || undefined },
      {
        onSuccess: () => {
          setApproveReturn(null);
          setVendorResponse('');
        },
      },
    );
  };

  const handleDeny = () => {
    if (!denyReturn || !vendorResponse.trim()) return;
    denyMutation.mutate(
      { returnId: denyReturn.id, vendorResponse },
      {
        onSuccess: () => {
          setDenyReturn(null);
          setVendorResponse('');
        },
      },
    );
  };

  const handleReceive = () => {
    if (!receiveReturn) return;
    receiveMutation.mutate(
      { returnId: receiveReturn.id, vendorResponse: vendorResponse || undefined },
      {
        onSuccess: () => {
          setReceiveReturn(null);
          setVendorResponse('');
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Return Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer return requests for your store</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={statusTabs}
          activeTab={statusFilter}
          onChange={(val) => {
            setStatusFilter(val as ReturnStatus | 'all');
            setPage(1);
          }}
        />
      </div>

      {/* Returns Table */}
      <div className="relative rounded-xl border border-gray-200 bg-white">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <LoadingSpinner size="lg" />
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Refund</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No return requests found
                </TableCell>
              </TableRow>
            ) : (
              returns.map((ret) => (
                <TableRow
                  key={ret.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/returns/${ret.id}`)}
                >
                  <TableCell className="font-medium text-sm">{ret.requestNumber}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_MAP[ret.status]}>
                      {RETURN_STATUS_LABELS[ret.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {RETURN_REASON_LABELS[ret.reasonCategory]}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(ret.items?.length || 0)} item{(ret.items?.length || 0) !== 1 ? 's' : ''}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    ₱{(ret.refundAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(ret.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {ret.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => { setApproveReturn(ret); setVendorResponse(''); }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => { setDenyReturn(ret); setVendorResponse(''); }}
                          >
                            Deny
                          </Button>
                        </>
                      )}
                      {ret.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { setReceiveReturn(ret); setVendorResponse(''); }}
                        >
                          Mark Received
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {meta && (meta.total ?? 0) > (meta.limit ?? 20) && (
          <div className="border-t border-gray-200 px-4 py-3">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages ?? Math.ceil((meta.total ?? 0) / (meta.limit ?? 20))}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={!!approveReturn}
        onClose={() => setApproveReturn(null)}
        title="Approve Return Request"
      >
        <div className="space-y-4">
          {approveReturn && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p><strong>Request:</strong> {approveReturn.requestNumber}</p>
              <p><strong>Reason:</strong> {RETURN_REASON_LABELS[approveReturn.reasonCategory]}</p>
              <p><strong>Refund:</strong> ₱{(approveReturn.refundAmount ?? 0).toFixed(2)}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Response to customer (optional)
            </label>
            <Textarea
              value={vendorResponse}
              onChange={(e) => setVendorResponse(e.target.value)}
              placeholder="Add a note for the customer..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApproveReturn(null)}>Cancel</Button>
            <Button
              variant="success"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              isLoading={approveMutation.isPending}
            >
              Approve Return
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deny Modal */}
      <Modal
        isOpen={!!denyReturn}
        onClose={() => setDenyReturn(null)}
        title="Deny Return Request"
      >
        <div className="space-y-4">
          {denyReturn && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p><strong>Request:</strong> {denyReturn.requestNumber}</p>
              <p><strong>Reason:</strong> {RETURN_REASON_LABELS[denyReturn.reasonCategory]}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for denial <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={vendorResponse}
              onChange={(e) => setVendorResponse(e.target.value)}
              placeholder="Explain why this return is being denied..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDenyReturn(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleDeny}
              disabled={denyMutation.isPending || !vendorResponse.trim()}
              isLoading={denyMutation.isPending}
            >
              Deny Return
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receive Modal */}
      <Modal
        isOpen={!!receiveReturn}
        onClose={() => setReceiveReturn(null)}
        title="Mark Items as Received"
      >
        <div className="space-y-4">
          {receiveReturn && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p><strong>Request:</strong> {receiveReturn.requestNumber}</p>
              <p><strong>Items:</strong> {receiveReturn.items?.length || 0} item(s)</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <Textarea
              value={vendorResponse}
              onChange={(e) => setVendorResponse(e.target.value)}
              placeholder="Note condition of received items..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReceiveReturn(null)}>Cancel</Button>
            <Button
              variant="secondary"
              onClick={handleReceive}
              disabled={receiveMutation.isPending}
              isLoading={receiveMutation.isPending}
            >
              Confirm Received
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
