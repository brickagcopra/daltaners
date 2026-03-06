import { useCartStore } from '@/stores/cart.store';
import { useTerminalStore } from '@/stores/terminal.store';
import { formatCurrency } from '@/lib/format';
import { CartItemRow } from './CartItemRow';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';

interface CartPanelProps {
  onPayment: () => void;
  onDiscount: () => void;
}

export function CartPanel({ onPayment, onDiscount }: CartPanelProps) {
  const items = useCartStore((s) => s.items);
  const holdOrders = useCartStore((s) => s.holdOrders);
  const clearCart = useCartStore((s) => s.clearCart);
  const holdOrder = useCartStore((s) => s.holdOrder);
  const recallOrder = useCartStore((s) => s.recallOrder);
  const getTotals = useCartStore((s) => s.getTotals);
  const activeShift = useTerminalStore((s) => s.activeShift);

  const totals = getTotals();
  const hasItems = items.length > 0;

  return (
    <div className="flex h-full w-full flex-col border-l border-pos-border bg-pos-surface">
      {/* Cart header */}
      <div className="flex items-center justify-between border-b border-pos-border px-3 py-2">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
          <h2 className="text-sm font-bold text-gray-200">
            Cart
            {totals.itemCount > 0 && (
              <span className="ml-1.5 rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] text-white">
                {totals.itemCount}
              </span>
            )}
          </h2>
        </div>
        <div className="flex gap-1">
          {holdOrders.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => recallOrder(holdOrders[holdOrders.length - 1].id)}
              className="text-[10px]"
            >
              Recall ({holdOrders.length})
            </Button>
          )}
          {hasItems && (
            <>
              <Button variant="ghost" size="sm" onClick={holdOrder} className="text-[10px]">
                Hold <Kbd>F3</Kbd>
              </Button>
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-[10px] text-red-400 hover:text-red-300">
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto">
        {!hasItems ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4">
            <svg className="h-12 w-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            <p className="text-xs text-gray-500">Cart is empty</p>
            <p className="text-[10px] text-gray-600">Tap a product to add it</p>
          </div>
        ) : (
          <div className="divide-y divide-pos-border/50 p-1">
            {items.map((item) => (
              <CartItemRow key={item.product_id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Cart totals */}
      <div className="border-t border-pos-border bg-pos-card px-3 py-2">
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>VAT (12%)</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-red-400">
              <span>Discount</span>
              <span>-{formatCurrency(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-pos-border pt-1 text-base font-bold text-white">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Button
            variant="outline"
            size="lg"
            disabled={!hasItems}
            onClick={onDiscount}
            className="text-xs"
          >
            <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            Discount <Kbd>F6</Kbd>
          </Button>
          <Button
            variant="success"
            size="lg"
            disabled={!hasItems || !activeShift}
            onClick={onPayment}
            className="text-xs font-bold"
          >
            <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            Pay <Kbd>F2</Kbd>
          </Button>
        </div>

        {!activeShift && (
          <p className="mt-1 text-center text-[10px] text-amber-400">Open a shift to process transactions</p>
        )}
      </div>
    </div>
  );
}
