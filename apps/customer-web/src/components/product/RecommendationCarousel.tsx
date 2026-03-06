import { useRef } from 'react';
import { ProductCard } from './ProductCard';

interface RecommendedItem {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  store_name: string;
  store_id: string;
  rating: number;
  in_stock: boolean;
}

interface RecommendationCarouselProps {
  title: string;
  subtitle?: string;
  products: RecommendedItem[];
  isLoading?: boolean;
}

export function RecommendationCarousel({
  title,
  subtitle,
  products,
  isLoading,
}: RecommendationCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-[180px] flex-shrink-0 animate-pulse sm:w-[200px]"
            >
              <div className="aspect-square rounded-xl bg-muted" />
              <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-1 h-3 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 220;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="py-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            className="rounded-full border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            aria-label="Scroll left"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            className="rounded-full border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            aria-label="Scroll right"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[180px] flex-shrink-0 sm:w-[200px]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <ProductCard
              id={product.id}
              name={product.name}
              price={product.price}
              salePrice={product.sale_price}
              imageUrl={product.image_url}
              storeName={product.store_name}
              storeId={product.store_id}
              rating={product.rating}
              inStock={product.in_stock}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
