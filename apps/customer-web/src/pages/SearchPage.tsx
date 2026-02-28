import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '@/components/common/SearchBar';
import { CategoryPills } from '@/components/common/CategoryPills';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults } from '@/components/search/SearchResults';
import { useProducts } from '@/hooks/useProducts';
import type { ProductFilters } from '@/hooks/useProducts';

const CATEGORIES = [
  { id: 'grocery', name: 'Grocery' },
  { id: 'food', name: 'Food' },
  { id: 'beverages', name: 'Beverages' },
  { id: 'snacks', name: 'Snacks' },
  { id: 'personal-care', name: 'Personal Care' },
  { id: 'household', name: 'Household' },
  { id: 'pharmacy', name: 'Pharmacy' },
  { id: 'frozen', name: 'Frozen' },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<ProductFilters>({
    search: searchParams.get('q') || '',
    category_id: searchParams.get('category') || '',
    sort_by: (searchParams.get('sort') as ProductFilters['sort_by']) || undefined,
    min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
    max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
    limit: 20,
  });

  const { data, isLoading } = useProducts(filters);

  // Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('q', filters.search);
    if (filters.category_id) params.set('category', filters.category_id);
    if (filters.sort_by) params.set('sort', filters.sort_by);
    if (filters.min_price !== undefined) params.set('min_price', String(filters.min_price));
    if (filters.max_price !== undefined) params.set('max_price', String(filters.max_price));
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query, cursor: undefined }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setFilters((prev) => ({
      ...prev,
      category_id: categoryId || undefined,
      cursor: undefined,
    }));
  };

  const handleSortChange = (sort: string) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: (sort || undefined) as ProductFilters['sort_by'],
      cursor: undefined,
    }));
  };

  const handlePriceChange = (min?: number, max?: number) => {
    setFilters((prev) => ({
      ...prev,
      min_price: min,
      max_price: max,
      cursor: undefined,
    }));
  };

  return (
    <div className="container-app py-6">
      {/* Search Bar */}
      <SearchBar
        defaultValue={filters.search}
        onSearch={handleSearch}
        autoFocus
        className="mb-6"
      />

      {/* Category Pills */}
      <CategoryPills
        categories={CATEGORIES}
        selected={filters.category_id}
        onSelect={handleCategorySelect}
        className="mb-6"
      />

      {/* Filters (Sort + Price) */}
      <SearchFilters
        sortBy={filters.sort_by || ''}
        onSortChange={handleSortChange}
        minPrice={filters.min_price}
        maxPrice={filters.max_price}
        onPriceChange={handlePriceChange}
        className="mb-6"
      />

      {/* Results */}
      <SearchResults
        products={data?.data || []}
        isLoading={isLoading}
        total={data?.meta?.total || 0}
        searchQuery={filters.search || ''}
      />

      {/* Load More */}
      {data?.meta?.next_cursor && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() =>
              setFilters((prev) => ({ ...prev, cursor: data.meta.next_cursor! }))
            }
            className="rounded-full border border-border bg-white px-6 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            Load more products
          </button>
        </div>
      )}
    </div>
  );
}
