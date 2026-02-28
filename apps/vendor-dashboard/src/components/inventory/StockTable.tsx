import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { StockItem } from '@/hooks/useInventory';
import { cn } from '@/lib/cn';

interface StockTableProps {
  items: StockItem[];
  onAdjust?: (item: StockItem) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function StockTable({ items, onAdjust }: StockTableProps) {
  const columns: Column<StockItem>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {item.productImage ? (
              <img
                src={item.productImage}
                alt={item.productName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{item.productName}</p>
            <p className="text-xs text-gray-500">
              {item.sku}
              {item.variantName && ` - ${item.variantName}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      sortable: true,
      render: (item) => (
        <span
          className={cn(
            'text-lg font-bold',
            item.isLowStock ? 'text-red-600' : 'text-gray-900',
          )}
        >
          {item.currentStock}
        </span>
      ),
    },
    {
      key: 'reserved',
      header: 'Reserved',
      render: (item) => (
        <span className="text-gray-600">{item.reservedStock}</span>
      ),
    },
    {
      key: 'available',
      header: 'Available',
      sortable: true,
      render: (item) => (
        <span className="font-medium text-gray-900">{item.availableStock}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        if (item.currentStock === 0) {
          return <Badge variant="danger">Out of Stock</Badge>;
        }
        if (item.isLowStock) {
          return <Badge variant="warning">Low Stock</Badge>;
        }
        return <Badge variant="success">In Stock</Badge>;
      },
    },
    {
      key: 'lastRestocked',
      header: 'Last Restocked',
      render: (item) => (
        <span className="text-sm text-gray-500">{formatDate(item.lastRestocked)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust?.(item)}
        >
          Adjust Stock
        </Button>
      ),
    },
  ];

  return (
    <DataTable<StockItem>
      columns={columns}
      data={items}
      keyExtractor={(item) => item.id}
      emptyMessage="No inventory items found"
    />
  );
}
