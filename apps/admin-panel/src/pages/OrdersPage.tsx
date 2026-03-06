import { useState } from 'react';
import { useAllOrders, type Order } from '@/hooks/useOrders';
import { exportToCSV } from '@/lib/csv-export';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/common/DataTable';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'delivering', label: 'Delivering' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const paymentOptions = [
  { value: '', label: 'All Payments' },
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'card', label: 'Card' },
  { value: 'wallet', label: 'Wallet' },
];

const statusVariant: Record<string, 'success' | 'destructive' | 'warning' | 'info' | 'muted' | 'default'> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  ready: 'info',
  picked_up: 'info',
  delivering: 'info',
  delivered: 'success',
  cancelled: 'destructive',
};

const paymentStatusVariant: Record<string, 'success' | 'destructive' | 'warning' | 'muted'> = {
  pending: 'warning',
  paid: 'success',
  failed: 'destructive',
  refunded: 'muted',
};

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const { data, isLoading } = useAllOrders({ page, limit: 20, search, status, payment_method: paymentMethod });

  const formatCurrency = (amount: number) =>
    `P${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (order) => (
        <span className="text-sm font-medium text-foreground">{order.order_number}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <span className="text-sm text-muted-foreground font-mono">{order.customer_id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'store',
      header: 'Store',
      render: (order) => (
        <span className="text-sm text-muted-foreground font-mono">{order.store_id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => (
        <Badge variant={statusVariant[order.status] || 'muted'}>
          {order.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </Badge>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (order) => (
        <div className="space-y-1">
          <span className="text-xs uppercase text-muted-foreground">{order.payment_method}</span>
          <Badge variant={paymentStatusVariant[order.payment_status] || 'muted'}>
            {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (order) => (
        <span className="text-sm font-semibold text-foreground">{formatCurrency(order.total_amount)}</span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order) => (
        <span className="text-sm text-muted-foreground">{order.items?.length ?? 0}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (order) => (
        <span className="text-sm text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor and manage all platform orders</p>
        </div>
        <button
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          onClick={() => {
            const orders = data?.data;
            if (!orders) return;
            exportToCSV(
              orders,
              [
                { header: 'Order #', accessor: (o: Order) => o.order_number },
                { header: 'Status', accessor: (o: Order) => o.status },
                { header: 'Service Type', accessor: (o: Order) => o.service_type },
                { header: 'Payment Method', accessor: (o: Order) => o.payment_method },
                { header: 'Payment Status', accessor: (o: Order) => o.payment_status },
                { header: 'Subtotal', accessor: (o: Order) => o.subtotal },
                { header: 'Delivery Fee', accessor: (o: Order) => o.delivery_fee },
                { header: 'Total', accessor: (o: Order) => o.total_amount },
                { header: 'Created', accessor: (o: Order) => o.created_at },
              ],
              `orders-export-${new Date().toISOString().split('T')[0]}`,
            );
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search order #, customer..."
          />
        </div>
        <div className="w-40">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-40">
          <Select
            options={paymentOptions}
            value={paymentMethod}
            onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          data={Array.isArray(data?.data) ? data.data : []}
          isLoading={isLoading}
          keyExtractor={(order) => order.id}
          emptyTitle="No orders found"
          emptyDescription="No orders match the current filters."
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
    </div>
  );
}
