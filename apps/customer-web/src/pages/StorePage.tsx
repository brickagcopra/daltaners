import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '@/hooks/useStores';
import { useStoreProducts } from '@/hooks/useProducts';
import { StoreHeader } from '@/components/store/StoreHeader';
import { CategoryPills } from '@/components/common/CategoryPills';
import { ProductGrid } from '@/components/product/ProductGrid';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ReviewSection } from '@/components/review/ReviewSection';

export function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: store, isLoading: storeLoading } = useStore(slug || '');
  const [selectedCategory, setSelectedCategory] = useState('');

  const { data: productsData, isLoading: productsLoading } = useStoreProducts(
    store?.id || '',
    selectedCategory || undefined,
  );

  if (storeLoading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  if (!store) {
    return (
      <div className="container-app py-16 text-center">
        <h2 className="text-xl font-semibold text-foreground">Store not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The store you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Store Header with Banner + Info */}
      <StoreHeader store={store} />

      {/* Products Section */}
      <div className="container-app py-8">
        {/* Category Filter */}
        {store.categories && store.categories.length > 0 && (
          <CategoryPills
            categories={store.categories.map((c) => ({
              id: c.id,
              name: `${c.name} (${c.product_count})`,
            }))}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            className="mb-6"
          />
        )}

        {/* Product Grid */}
        <ProductGrid
          products={Array.isArray(productsData?.data) ? productsData.data : []}
          isLoading={productsLoading}
          emptyTitle="No products available"
          emptyDescription={
            selectedCategory
              ? 'No products in this category. Try another category.'
              : 'This store has no products listed yet.'
          }
        />

        {/* Store Reviews */}
        <ReviewSection reviewableType="store" reviewableId={store.id} />
      </div>
    </div>
  );
}
