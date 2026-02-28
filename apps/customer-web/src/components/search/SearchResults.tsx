import { ProductCard } from '@/components/product/ProductCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import type { Product } from '@/hooks/useProducts';

interface SearchResultsProps {
  products: Product[];
  isLoading: boolean;
  total: number;
  searchQuery: string;
}

export function SearchResults({
  products,
  isLoading,
  total,
  searchQuery,
}: SearchResultsProps) {
  if (isLoading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={
          <svg
            className="h-16 w-16 text-muted-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        }
        title={searchQuery ? `No results for "${searchQuery}"` : 'No products found'}
        description={
          searchQuery
            ? 'Try adjusting your search terms or filters'
            : 'Browse our categories to find what you need'
        }
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {total} {total === 1 ? 'product' : 'products'} found
        {searchQuery && (
          <> for <span className="font-medium text-foreground">&quot;{searchQuery}&quot;</span></>
        )}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            price={product.price}
            salePrice={product.sale_price}
            imageUrl={product.images[0] || '/placeholder-product.png'}
            storeName={product.store_name}
            storeId={product.store_id}
            rating={product.rating}
            inStock={product.in_stock}
          />
        ))}
      </div>
    </div>
  );
}
