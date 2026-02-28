import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PriceDisplay } from '@/components/product/PriceDisplay';
import { useCartStore } from '@/stores/cart.store';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  imageUrl: string;
  storeName: string;
  storeId: string;
  rating: number;
  inStock: boolean;
}

export function ProductCard({
  id,
  name,
  price,
  salePrice,
  imageUrl,
  storeName,
  storeId,
  rating,
  inStock,
}: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;

    addItem({
      product_id: id,
      store_id: storeId,
      name,
      image_url: imageUrl,
      price: salePrice ?? price,
    });
  };

  return (
    <Link to={`/products/${id}`}>
      <Card className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground">
                Out of Stock
              </span>
            </div>
          )}
          {salePrice && inStock && (
            <div className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-white">
              {Math.round(((price - salePrice) / price) * 100)}% OFF
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="mb-0.5 text-xs text-muted-foreground">{storeName}</p>
          <h3 className="line-clamp-2 text-sm font-medium text-foreground">{name}</h3>
          <div className="mt-1 flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5 fill-accent text-accent"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <PriceDisplay price={price} salePrice={salePrice} />
            <Button
              size="icon-sm"
              variant={inStock ? 'default' : 'outline'}
              onClick={handleAddToCart}
              disabled={!inStock}
              aria-label={`Add ${name} to cart`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}
