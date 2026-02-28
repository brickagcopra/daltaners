import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { useCartStore } from '@/stores/cart.store';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PriceDisplay } from '@/components/product/PriceDisplay';
import { QuantitySelector } from '@/components/product/QuantitySelector';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id || '');
  const addItem = useCartStore((state) => state.addItem);

  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  if (isLoading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  if (!product) {
    return (
      <div className="container-app py-16 text-center">
        <h2 className="text-xl font-semibold text-foreground">Product not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This product doesn&apos;t exist or has been removed.
        </p>
      </div>
    );
  }

  const variant = product.variants?.find((v) => v.id === selectedVariant);
  const currentPrice = variant ? variant.price : product.price;
  const currentSalePrice = variant ? variant.sale_price : product.sale_price;
  const effectivePrice = currentSalePrice ?? currentPrice;
  const inStock = variant ? variant.in_stock : product.in_stock;

  const handleAddToCart = () => {
    if (!inStock) return;

    for (let i = 0; i < quantity; i++) {
      addItem({
        product_id: product.id,
        variant_id: selectedVariant,
        store_id: product.store_id,
        name: variant ? `${product.name} - ${variant.name}` : product.name,
        image_url: product.images[0] || '/placeholder-product.png',
        price: effectivePrice,
      });
    }

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <div className="container-app py-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link to={`/stores/${product.store_id}`} className="hover:text-foreground transition-colors">
          {product.store_name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            <img
              src={product.images[selectedImageIndex] || '/placeholder-product.png'}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            {!inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="rounded-full bg-white px-6 py-2 text-lg font-bold">
                  Out of Stock
                </span>
              </div>
            )}
            {currentSalePrice && inStock && (
              <div className="absolute left-3 top-3 rounded-full bg-destructive px-3 py-1 text-sm font-bold text-white">
                {Math.round(((currentPrice - currentSalePrice) / currentPrice) * 100)}% OFF
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    idx === selectedImageIndex
                      ? 'border-primary'
                      : 'border-transparent hover:border-border'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{product.category_name}</Badge>
            {inStock ? (
              <Badge variant="success">In Stock</Badge>
            ) : (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
            {product.name}
          </h1>

          <Link
            to={`/stores/${product.store_id}`}
            className="mt-1 inline-block text-sm text-primary hover:underline"
          >
            {product.store_name}
          </Link>

          {/* Rating */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.round(product.rating)
                      ? 'fill-accent text-accent'
                      : 'fill-muted text-muted'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {product.rating.toFixed(1)} ({product.review_count} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="mt-4">
            <PriceDisplay price={currentPrice} salePrice={currentSalePrice} size="lg" />
          </div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Options</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v.id === selectedVariant ? undefined : v.id)}
                    disabled={!v.in_stock}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      v.id === selectedVariant
                        ? 'border-primary bg-primary/5 text-primary'
                        : v.in_stock
                          ? 'border-border text-foreground hover:border-primary/50'
                          : 'border-border text-muted-foreground opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {v.name}
                    {!v.in_stock && ' (Sold out)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="mt-6 flex items-center gap-4">
            <QuantitySelector
              quantity={quantity}
              onIncrease={() => setQuantity((q) => Math.min(q + 1, 99))}
              onDecrease={() => setQuantity((q) => Math.max(q - 1, 1))}
              min={1}
              max={99}
            />
            <Button
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={!inStock}
            >
              {addedToCart ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Added to Cart
                </span>
              ) : (
                `Add to Cart - PHP ${(effectivePrice * quantity).toFixed(2)}`
              )}
            </Button>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Description</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
