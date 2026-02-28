import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useVendorOrders, useUpdateOrderStatus, type OrderStatus } from '@/hooks/useOrders';
import { OrderTable } from '@/components/orders/OrderTable';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

const statusTabs = [
  { label: 'All Orders', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'ready_for_pickup' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const storeId = user?.vendorId || null;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useVendorOrders(storeId, {
    page,
    limit: 20,
    search,
    status: statusFilter,
  });

  const updateStatusMutation = useUpdateOrderStatus();

  const handleAccept = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: 'accepted' });
  };

  const handleReject = (orderId: string) => {
    setRejectOrderId(orderId);
    setRejectReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectOrderId || !rejectReason.trim()) return;
    updateStatusMutation.mutate(
      { orderId: rejectOrderId, status: 'rejected', reason: rejectReason },
      { onSuccess: () => { setRejectOrderId(null); setRejectReason(''); } },
    );
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as OrderStatus | 'all');
    setPage(1);
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-500">Manage incoming orders and track fulfillment</p>
      </div>

      {/* Status Tabs */}
      <Tabs tabs={statusTabs} activeTab={statusFilter} onChange={handleStatusChange} />

      {/* Search */}
      <div className="w-72">
        <SearchInput
          value={search}
          onSearch={handleSearch}
          placeholder="Search orders..."
        />
      </div>

      {/* Order Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <OrderTable
            orders={data?.data || []}
            onAccept={handleAccept}
            onReject={handleReject}
            isUpdating={updateStatusMutation.isPending}
          />
          {data?.meta && (
            <Pagination
              currentPage={data.meta.page ?? 1}
              totalPages={data.meta.total && data.meta.limit ? Math.ceil(data.meta.total / data.meta.limit) : 1}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={!!rejectOrderId}
        onClose={() => { setRejectOrderId(null); setRejectReason(''); }}
        title="Reject Order"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please provide a reason for rejecting this order. The customer will be notified.
          </p>
          <Textarea
            label="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Out of stock on key items..."
            rows={3}
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setRejectOrderId(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              isLoading={updateStatusMutation.isPending}
              disabled={!rejectReason.trim()}
            >
              Reject Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
