import { Link } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { OrderStatusBadge } from './OrderStatusBadge';
import { Button } from '@/components/ui/Button';
import type { Order } from '@/hooks/useOrders';

interface OrderTableProps {
  orders: Order[];
  onAccept?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  isUpdating?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderTable({ orders, onAccept, onReject, isUpdating }: OrderTableProps) {
  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      sortable: true,
      render: (order) => (
        <Link
          to={`/orders/${order.id}`}
          className="font-semibold text-secondary-600 hover:text-secondary-700 hover:underline"
        >
          #{order.orderNumber}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <div>
          <p className="font-medium text-gray-900">{order.customerName}</p>
          <p className="text-xs text-gray-500">{order.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order) => (
        <span className="text-gray-700">
          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      render: (order) => (
        <span className="font-semibold text-gray-900">{formatCurrency(order.total)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (order) => (
        <span className="text-gray-500">{formatDate(order.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (order) => (
        <div className="flex items-center justify-end gap-2">
          {order.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="success"
                onClick={(e) => {
                  e.preventDefault();
                  onAccept?.(order.id);
                }}
                disabled={isUpdating}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.preventDefault();
                  onReject?.(order.id);
                }}
                disabled={isUpdating}
              >
                Reject
              </Button>
            </>
          )}
          <Link to={`/orders/${order.id}`}>
            <Button size="sm" variant="ghost">
              View
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DataTable<Order>
      columns={columns}
      data={orders}
      keyExtractor={(order) => order.id}
      emptyMessage="No orders found"
    />
  );
}
