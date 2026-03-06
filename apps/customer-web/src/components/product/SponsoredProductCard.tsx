import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PriceDisplay } from '@/components/product/PriceDisplay';
import { useCartStore } from '@/stores/cart.store';
import { useTrackImpression, useTrackClick } from '@/hooks/useSponsored';
import type { SponsoredProduct } from '@/hooks/useSponsored';

interface SponsoredProductCardProps {
  product: SponsoredProduct;
  placement: string;
}

export function SponsoredProductCard({ product, placement }: SponsoredProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const trackImpression = useTrackImpression();
  const trackClick = useTrackClick();
  const impressionTracked = useRef(false);

  // Track impression once when the card becomes visible
  useEffect(() => {
    if (impressionTracked.current) return;
    impressionTracked.current = true;
    trackImpression.mutate({
      campaign_id: product.campaign_id,
      campaign_product_id: product.campaign_product_id,
      placement,
    });
  }, [product.campaign_id, product.campaign_product_id, placement, trackImpression]);

  const handleClick = () => {
    trackClick.mutate({
      campaign_id: product.campaign_id,
      campaign_product_id: product.campaign_product_id,
      placement,
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: product.product_id,
      store_id: product.store_id,
      name: product.product_name,
      image_url: product.product_image_url || '/placeholder-product.png',
      price: product.sale_price ?? product.base_price,
    });
  };

  return (
    <Link to={`/products/${product.product_id}`} onClick={handleClick}>
      <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        {/* Sponsored badge */}
        <div className="absolute right-2 top-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          Sponsored
        </div>

        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.product_image_url || '/placeholder-product.png'}
            alt={product.product_name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {product.sale_price && (
            <div className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-white">
              {Math.round(((product.base_price - product.sale_price) / product.base_price) * 100)}% OFF
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="mb-0.5 text-xs text-muted-foreground">{product.store_name}</p>
          <h3 className="line-clamp-2 text-sm font-medium text-foreground">{product.product_name}</h3>
          <div className="mt-1 flex items-center gap-1">
            <svg className="h-3.5 w-3.5 fill-accent text-accent" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs text-muted-foreground">{(product.rating_average ?? 0).toFixed(1)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <PriceDisplay price={product.base_price} salePrice={product.sale_price} />
            <Button
              size="icon-sm"
              variant="default"
              onClick={handleAddToCart}
              aria-label={`Add ${product.product_name} to cart`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}
