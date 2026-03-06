import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Pagination } from '@/components/common/Pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  useInventoryStock,
  useInventoryStats,
  useInventoryMovements,
  useAdjustStock,
  type StockEntry,
  type StockMovement,
} from '@/hooks/useInventory';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

const movementTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'in', label: 'Stock In' },
  { value: 'out', label: 'Stock Out' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'reservation', label: 'Reservation' },
  { value: 'release', label: 'Release' },
  { value: 'return', label: 'Return' },
];

function getStockStatus(entry: StockEntry): { label: string; variant: 'success' | 'warning' | 'destructive' } {
  const available = entry.available_quantity;
  if (available <= 0) return { label: 'Out of Stock', variant: 'destructive' };
  if (available <= entry.reorder_point) return { label: 'Low Stock', variant: 'warning' };
  return { label: 'In Stock', variant: 'success' };
}

function getMovementBadge(type: string): { variant: 'success' | 'destructive' | 'warning' | 'info' | 'default' } {
  switch (type) {
    case 'in': return { variant: 'success' };
    case 'out': return { variant: 'destructive' };
    case 'reservation': return { variant: 'warning' };
    case 'release': return { variant: 'info' };
    case 'return': return { variant: 'info' };
    default: return { variant: 'default' };
  }
}

const stockColumns: Column<StockEntry>[] = [
  {
    key: 'product',
    header: 'Product',
    render: (item) => (
      <div>
        <p className="text-sm font-medium text-gray-900">{item.product_name || 'Unknown Product'}</p>
        {item.product_sku && <p className="text-xs text-gray-500">SKU: {item.product_sku}</p>}
      </div>
    ),
  },
  {
    key: 'location',
    header: 'Location',
    render: (item) => (
      <div>
        <p className="text-sm text-gray-900">{item.store_name || '—'}</p>
        {item.location_name && <p className="text-xs text-gray-500">{item.location_name}{item.location_city ? `, ${item.location_city}` : ''}</p>}
      </div>
    ),
  },
  {
    key: 'quantity',
    header: 'Qty',
    className: 'text-center',
    render: (item) => (
      <span className="text-sm font-semibold text-gray-900">{item.quantity}</span>
    ),
  },
  {
    key: 'reserved',
    header: 'Reserved',
    className: 'text-center',
    render: (item) => (
      <span className="text-sm text-gray-600">{item.reserved_quantity}</span>
    ),
  },
  {
    key: 'available',
    header: 'Available',
    className: 'text-center',
    render: (item) => (
      <span className="text-sm font-semibold text-gray-900">{item.available_quantity}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (item) => {
      const status = getStockStatus(item);
      return <Badge variant={status.variant}>{status.label}</Badge>;
    },
  },
  {
    key: 'reorderPoint',
    header: 'Reorder At',
    className: 'text-center',
    render: (item) => (
      <span className="text-sm text-gray-500">{item.reorder_point}</span>
    ),
  },
  {
    key: 'updated',
    header: 'Last Updated',
    render: (item) => (
      <span className="text-xs text-gray-500">
        {new Date(item.updated_at).toLocaleDateString()}
      </span>
    ),
  },
];

const movementColumns: Column<StockMovement>[] = [
  {
    key: 'date',
    header: 'Date',
    render: (item) => (
      <span className="text-sm text-gray-600">
        {new Date(item.created_at).toLocaleString()}
      </span>
    ),
  },
  {
    key: 'product',
    header: 'Product',
    render: (item) => (
      <span className="text-sm font-medium text-gray-900">{item.product_name || '—'}</span>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    render: (item) => {
      const badge = getMovementBadge(item.movement_type);
      return <Badge variant={badge.variant}>{item.movement_type.replace('_', ' ')}</Badge>;
    },
  },
  {
    key: 'quantity',
    header: 'Qty',
    className: 'text-center',
    render: (item) => (
      <span className="text-sm font-semibold">{item.quantity}</span>
    ),
  },
  {
    key: 'reference',
    header: 'Reference',
    render: (item) => (
      <div>
        {item.reference_type && <p className="text-xs text-gray-500">{item.reference_type}</p>}
        {item.reference_id && <p className="text-xs text-gray-400 truncate max-w-[120px]">{item.reference_id}</p>}
      </div>
    ),
  },
  {
    key: 'notes',
    header: 'Notes',
    render: (item) => (
      <span className="text-xs text-gray-500 truncate max-w-[200px] block">{item.notes || '—'}</span>
    ),
  },
  {
    key: 'location',
    header: 'Location',
    render: (item) => (
      <span className="text-sm text-gray-600">{item.location_name || '—'}</span>
    ),
  },
];

export function InventoryPage() {
  // Stock tab state
  const [stockPage, setStockPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Movements tab state
  const [movPage, setMovPage] = useState(1);
  const [movType, setMovType] = useState('');

  // Adjust stock modal
  const [adjustEntry, setAdjustEntry] = useState<StockEntry | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Queries
  const { data: stockData, isLoading: stockLoading } = useInventoryStock({
    page: stockPage,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const { data: statsData } = useInventoryStats();

  const { data: movData, isLoading: movLoading } = useInventoryMovements({
    page: movPage,
    limit: 20,
    movement_type: movType || undefined,
  });

  const adjustMutation = useAdjustStock();

  const stats = statsData?.data;

  const handleAdjust = () => {
    if (!adjustEntry || !adjustQty) return;
    const quantity = parseInt(adjustQty, 10);
    if (isNaN(quantity) || quantity === 0) return;

    adjustMutation.mutate(
      {
        product_id: adjustEntry.product_id,
        store_location_id: adjustEntry.store_location_id,
        quantity,
        notes: adjustNotes || undefined,
        variant_id: adjustEntry.variant_id || undefined,
      },
      {
        onSuccess: () => {
          setAdjustEntry(null);
          setAdjustQty('');
          setAdjustNotes('');
        },
      },
    );
  };

  // Add action column to stock table
  const stockColumnsWithActions: Column<StockEntry>[] = [
    ...stockColumns,
    {
      key: 'actions',
      header: '',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAdjustEntry(item);
            setAdjustQty('');
            setAdjustNotes('');
          }}
        >
          Adjust
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor stock levels, manage inventory, and track movements across all stores.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && typeof stats === 'object' && typeof stats.total_entries === 'number' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total Entries"
            value={stats.total_entries.toLocaleString()}
            icon={
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            bgColor="bg-blue-50"
          />
          <StatCard
            label="Total Units"
            value={stats.total_quantity.toLocaleString()}
            icon={
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            }
            bgColor="bg-green-50"
          />
          <StatCard
            label="Reserved"
            value={stats.total_reserved.toLocaleString()}
            icon={
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            bgColor="bg-indigo-50"
          />
          <StatCard
            label="Low Stock"
            value={stats.low_stock_count.toLocaleString()}
            icon={
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            }
            bgColor="bg-amber-50"
          />
          <StatCard
            label="Out of Stock"
            value={stats.out_of_stock_count.toLocaleString()}
            icon={
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            }
            bgColor="bg-red-50"
          />
        </div>
      )}

      {/* Tabs: Stock / Movements */}
      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="w-72">
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setStockPage(1); }}
                placeholder="Search by product name..."
              />
            </div>
            <div className="w-44">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setStockPage(1); }}
              />
            </div>
          </div>

          {/* Stock Table */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <DataTable
              columns={stockColumnsWithActions}
              data={Array.isArray(stockData?.data) ? stockData.data : []}
              isLoading={stockLoading}
              emptyTitle="No stock entries found"
              emptyDescription="No inventory data matches your filters."
              keyExtractor={(item) => item.id}
            />

            {stockData?.meta && stockData.meta.totalPages > 1 && (
              <div className="border-t border-gray-200 px-4">
                <Pagination
                  page={stockData.meta.page}
                  totalPages={stockData.meta.totalPages}
                  total={stockData.meta.total}
                  limit={stockData.meta.limit}
                  onPageChange={setStockPage}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="w-48">
              <Select
                options={movementTypeOptions}
                value={movType}
                onChange={(e) => { setMovType(e.target.value); setMovPage(1); }}
              />
            </div>
          </div>

          {/* Movements Table */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <DataTable
              columns={movementColumns}
              data={Array.isArray(movData?.data) ? movData.data : []}
              isLoading={movLoading}
              emptyTitle="No movements found"
              emptyDescription="No stock movements match your filters."
              keyExtractor={(item) => item.id}
            />

            {movData?.meta && movData.meta.totalPages > 1 && (
              <div className="border-t border-gray-200 px-4">
                <Pagination
                  page={movData.meta.page}
                  totalPages={movData.meta.totalPages}
                  total={movData.meta.total}
                  limit={movData.meta.limit}
                  onPageChange={setMovPage}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={!!adjustEntry}
        onClose={() => setAdjustEntry(null)}
        title="Adjust Stock"
        description={adjustEntry ? `Adjust stock for ${adjustEntry.product_name || 'product'}` : ''}
      >
        {adjustEntry && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Current Quantity:</span>
                <span className="font-semibold">{adjustEntry.quantity}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Reserved:</span>
                <span>{adjustEntry.reserved_quantity}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Available:</span>
                <span className="font-semibold">{adjustEntry.available_quantity}</span>
              </div>
            </div>

            <Input
              label="Adjustment Quantity"
              type="number"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. 10 to add, -5 to remove"
              hint="Use positive numbers to add stock, negative to remove."
            />

            <Input
              label="Notes (optional)"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="Reason for adjustment..."
            />

            {adjustQty && parseInt(adjustQty, 10) !== 0 && !isNaN(parseInt(adjustQty, 10)) && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm">
                <span className="text-blue-700">
                  New quantity will be:{' '}
                  <strong>{adjustEntry.quantity + parseInt(adjustQty, 10)}</strong>
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setAdjustEntry(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAdjust}
                disabled={!adjustQty || parseInt(adjustQty, 10) === 0 || isNaN(parseInt(adjustQty, 10)) || adjustMutation.isPending}
              >
                {adjustMutation.isPending ? 'Adjusting...' : 'Apply Adjustment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  bgColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
