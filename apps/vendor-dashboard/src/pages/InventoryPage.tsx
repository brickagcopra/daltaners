import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useStockLevels, useAdjustStock, type StockItem } from '@/hooks/useInventory';
import { StockTable } from '@/components/inventory/StockTable';
import { AdjustStockModal } from '@/components/inventory/AdjustStockModal';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/Button';

export function InventoryPage() {
  const user = useAuthStore((s) => s.user);
  const storeId = user?.vendorId || null;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);

  const { data, isLoading } = useStockLevels(storeId, {
    page,
    limit: 20,
    search,
    lowStockOnly,
  });

  const adjustMutation = useAdjustStock();

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  const handleAdjust = (item: StockItem) => {
    setAdjustItem(item);
  };

  const handleSubmitAdjustment = (data: {
    productId: string;
    adjustment: number;
    reason: string;
    notes?: string;
  }) => {
    if (!storeId) return;
    adjustMutation.mutate(
      { storeId, adjustment: data },
      { onSuccess: () => setAdjustItem(null) },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="mt-1 text-sm text-gray-500">Track stock levels and manage inventory adjustments</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput
            value={search}
            onSearch={handleSearch}
            placeholder="Search products..."
          />
        </div>
        <Button
          variant={lowStockOnly ? 'danger' : 'outline'}
          size="sm"
          onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {lowStockOnly ? 'Showing Low Stock' : 'Low Stock Only'}
        </Button>
      </div>

      {/* Stock Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <StockTable
            items={data?.data || []}
            onAdjust={handleAdjust}
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

      {/* Adjust Stock Modal */}
      <AdjustStockModal
        isOpen={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        item={adjustItem}
        onSubmit={handleSubmitAdjustment}
        isSubmitting={adjustMutation.isPending}
      />
    </div>
  );
}
