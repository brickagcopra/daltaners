import { ProductCard } from '@/components/product/ProductCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import type { Product } from '@/hooks/useProducts';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  columns?: 2 | 3 | 4 | 5;
}

export function ProductGrid({
  products,
  isLoading = false,
  emptyTitle = 'No products found',
  emptyDescription = 'Check back later for new products',
  columns = 4,
}: ProductGridProps) {
  if (isLoading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  if (products.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]}`}>
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
  );
}
