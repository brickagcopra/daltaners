import { Link } from 'react-router-dom';
import { useCartStore } from '@/stores/cart.store';
import { Button } from '@/components/ui/Button';
import { CartItem } from '@/components/cart/CartItem';
import { EmptyState } from '@/components/common/EmptyState';
import { formatPHP } from '@/components/product/PriceDisplay';

export function CartPage() {
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const getItemsByStore = useCartStore((state) => state.getItemsByStore);

  if (items.length === 0) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Your cart is empty"
          description="Browse our stores and add some products to your cart"
          actionLabel="Start shopping"
          onAction={() => window.location.href = '/search'}
        />
      </div>
    );
  }

  const itemsByStore = getItemsByStore();
  const total = getTotal();

  return (
    <div className="container-app py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Shopping Cart</h1>
        <button
          onClick={clearCart}
          className="text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear cart
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(itemsByStore).map(([storeId, storeItems]) => (
            <div key={storeId} className="rounded-lg border border-border bg-white">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {storeItems[0]?.name ? 'Store' : 'Store'} Items
                </h3>
              </div>
              <div className="divide-y divide-border px-4">
                {storeItems.map((item) => (
                  <CartItem
                    key={`${item.product_id}-${item.variant_id || ''}`}
                    productId={item.product_id}
                    variantId={item.variant_id}
                    name={item.name}
                    imageUrl={item.image_url}
                    price={item.price}
                    quantity={item.quantity}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-lg border border-border bg-white p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPHP(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="text-muted-foreground">Calculated at checkout</span>
              </div>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatPHP(total)}</span>
              </div>
            </div>
            <Link to="/checkout" className="mt-4 block">
              <Button size="lg" className="w-full">
                Proceed to Checkout
              </Button>
            </Link>
            <Link
              to="/search"
              className="mt-2 block text-center text-sm text-primary hover:underline"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
