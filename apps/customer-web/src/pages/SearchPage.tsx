import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '@/components/common/SearchBar';
import { CategoryPills } from '@/components/common/CategoryPills';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults } from '@/components/search/SearchResults';
import { useSearch, useSearchSuggestions } from '@/hooks/useSearch';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import type { SearchFilters as SearchFilterType } from '@/hooks/useSearch';
import type { ProductFilters } from '@/hooks/useProducts';
import { SponsoredProductCard } from '@/components/product/SponsoredProductCard';
import { useSponsoredProducts } from '@/hooks/useSponsored';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParam = searchParams.get('category') || '';
  const [filters, setFilters] = useState<SearchFilterType>({
    q: searchParams.get('q') || '',
    category_id: UUID_REGEX.test(categoryParam) ? categoryParam : undefined,
    sort_by: searchParams.get('sort_by') || '_score',
    sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
    min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
    max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
    brand: searchParams.get('brand') || undefined,
    dietary_tags: searchParams.get('dietary_tags') ? searchParams.get('dietary_tags')!.split(',') : undefined,
    page: 0,
    size: 20,
  });

  // Determine if we should use ES search or regular product listing
  const hasSearchQuery = !!(filters.q || filters.brand || filters.dietary_tags?.length);

  // ES-powered search (when there's a text query or facet filters)
  const { data: searchData, isLoading: searchLoading } = useSearch(
    hasSearchQuery ? filters : { q: '', page: 0, size: 20 },
  );

  // Fallback: regular product listing (browse by category, no text search)
  const productFilters: ProductFilters = useMemo(() => ({
    category_id: filters.category_id,
    min_price: filters.min_price,
    max_price: filters.max_price,
    sort_by: filters.sort_by === 'base_price'
      ? (filters.sort_order === 'asc' ? 'price_asc' : 'price_desc')
      : filters.sort_by === 'created_at' ? 'newest'
      : filters.sort_by === 'total_sold' ? 'popular'
      : undefined,
    limit: 20,
  }), [filters.category_id, filters.min_price, filters.max_price, filters.sort_by, filters.sort_order]);

  const { data: productsData, isLoading: productsLoading } = useProducts(
    !hasSearchQuery ? productFilters : { limit: 0 },
  );

  // Autocomplete suggestions
  const { data: suggestions = [] } = useSearchSuggestions(filters.q || '');

  // Categories for pills
  const { data: categoriesData } = useCategories();
  const categoryPills = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData
      .filter((c) => c.level === 0)
      .map((c) => ({ id: c.id, name: c.name }));
  }, [categoriesData]);

  // Pick the right data source
  const isLoading = hasSearchQuery ? searchLoading : productsLoading;
  const products = hasSearchQuery
    ? (searchData?.data ?? [])
    : (productsData?.data ?? []);
  const total = hasSearchQuery
    ? (searchData?.meta?.total ?? 0)
    : (productsData?.meta?.total ?? 0);
  const { data: sponsoredProducts } = useSponsoredProducts('search_results', 4);
  const aggregations = searchData?.aggregations;
  const totalPages = searchData?.meta?.total_pages ?? 0;
  const currentPage = filters.page ?? 0;

  // Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category_id) params.set('category', filters.category_id);
    if (filters.sort_by && filters.sort_by !== '_score') params.set('sort_by', filters.sort_by);
    if (filters.sort_order && filters.sort_order !== 'desc') params.set('sort_order', filters.sort_order);
    if (filters.min_price !== undefined) params.set('min_price', String(filters.min_price));
    if (filters.max_price !== undefined) params.set('max_price', String(filters.max_price));
    if (filters.brand) params.set('brand', filters.brand);
    if (filters.dietary_tags?.length) params.set('dietary_tags', filters.dietary_tags.join(','));
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, q: query, page: 0 }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setFilters((prev) => ({
      ...prev,
      category_id: categoryId || undefined,
      page: 0,
    }));
  };

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: sortBy,
      sort_order: sortOrder as 'asc' | 'desc',
      page: 0,
    }));
  };

  const handlePriceChange = (min?: number, max?: number) => {
    setFilters((prev) => ({
      ...prev,
      min_price: min,
      max_price: max,
      page: 0,
    }));
  };

  const handleBrandChange = (brand?: string) => {
    setFilters((prev) => ({ ...prev, brand, page: 0 }));
  };

  const handleDietaryTagsChange = (tags: string[]) => {
    setFilters((prev) => ({
      ...prev,
      dietary_tags: tags.length > 0 ? tags : undefined,
      page: 0,
    }));
  };

  return (
    <div className="container-app py-6">
      {/* Search Bar with Autocomplete */}
      <SearchBar
        defaultValue={filters.q}
        onSearch={handleSearch}
        autoFocus
        className="mb-6"
        suggestions={suggestions}
        onSuggestionSelect={handleSearch}
      />

      {/* Category Pills */}
      <CategoryPills
        categories={categoryPills}
        selected={filters.category_id}
        onSelect={handleCategorySelect}
        className="mb-6"
      />

      {/* Filters (Sort + Price + Brand + Dietary Tags) */}
      <SearchFilters
        sortBy={filters.sort_by || '_score'}
        sortOrder={filters.sort_order || 'desc'}
        onSortChange={handleSortChange}
        minPrice={filters.min_price}
        maxPrice={filters.max_price}
        onPriceChange={handlePriceChange}
        selectedBrand={filters.brand}
        onBrandChange={handleBrandChange}
        selectedDietaryTags={filters.dietary_tags ?? []}
        onDietaryTagsChange={handleDietaryTagsChange}
        aggregations={aggregations}
        className="mb-6"
      />

      {/* Sponsored Products */}
      {sponsoredProducts && sponsoredProducts.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sponsoredProducts.map((sp) => (
              <SponsoredProductCard key={sp.campaign_product_id} product={sp} placement="search_results" />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <SearchResults
        products={products}
        isLoading={isLoading}
        total={total}
        searchQuery={filters.q || ''}
      />

      {/* Pagination (for ES search results) */}
      {hasSearchQuery && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={currentPage === 0}
            onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-3 text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            disabled={currentPage + 1 >= totalPages}
            onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 0) + 1 }))}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Load More (for cursor-based product listing) */}
      {!hasSearchQuery && productsData?.meta?.next_cursor && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() =>
              setFilters((prev) => ({ ...prev }))
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
