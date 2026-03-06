import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useStoreProducts, useDeleteProduct } from '@/hooks/useProducts';
import { ProductTable } from '@/components/products/ProductTable';
import { CsvImportModal } from '@/components/products/CsvImportModal';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

const categoryOptions = [
  { label: 'All Categories', value: '' },
  { label: 'Groceries', value: 'groceries' },
  { label: 'Beverages', value: 'beverages' },
  { label: 'Snacks', value: 'snacks' },
  { label: 'Fresh Produce', value: 'fresh-produce' },
  { label: 'Meat & Seafood', value: 'meat-seafood' },
  { label: 'Dairy & Eggs', value: 'dairy-eggs' },
  { label: 'Bakery', value: 'bakery' },
  { label: 'Frozen', value: 'frozen' },
  { label: 'Household', value: 'household' },
  { label: 'Personal Care', value: 'personal-care' },
  { label: 'Other', value: 'other' },
];

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

export function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const storeId = user?.vendorId || null;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useStoreProducts(storeId, {
    page,
    limit: 20,
    search,
    category: category || undefined,
    isActive: isActiveFilter ? isActiveFilter === 'true' : undefined,
  });

  const deleteMutation = useDeleteProduct();

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  const handleDelete = (productId: string) => {
    setDeleteProductId(productId);
  };

  const handleConfirmDelete = () => {
    if (!deleteProductId) return;
    deleteMutation.mutate(deleteProductId, {
      onSuccess: () => setDeleteProductId(null),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your store's product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </Button>
          <Link to="/products/new">
            <Button>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </Button>
          </Link>
        </div>
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
        <div className="w-44">
          <Select
            options={categoryOptions}
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-36">
          <Select
            options={statusOptions}
            value={isActiveFilter}
            onChange={(e) => { setIsActiveFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Product Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <ProductTable
            products={Array.isArray(data?.data) ? data.data : []}
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
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

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['store-products'] });
        }}
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteProductId}
        onClose={() => setDeleteProductId(null)}
        title="Delete Product"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this product? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteProductId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={deleteMutation.isPending}
            >
              Delete Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
