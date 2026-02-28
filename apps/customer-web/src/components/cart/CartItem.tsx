import { QuantitySelector } from '@/components/product/QuantitySelector';
import { formatPHP } from '@/components/product/PriceDisplay';
import { useCartStore } from '@/stores/cart.store';

interface CartItemProps {
  productId: string;
  variantId?: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

export function CartItem({
  productId,
  variantId,
  name,
  imageUrl,
  price,
  quantity,
}: CartItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <div className="flex gap-3 py-3">
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground line-clamp-2">{name}</h4>
          <button
            onClick={() => removeItem(productId, variantId)}
            className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
            aria-label={`Remove ${name} from cart`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <QuantitySelector
            quantity={quantity}
            onIncrease={() => updateQuantity(productId, quantity + 1, variantId)}
            onDecrease={() => updateQuantity(productId, quantity - 1, variantId)}
            min={0}
            size="sm"
          />
          <span className="text-sm font-semibold text-foreground">
            {formatPHP(price * quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}
