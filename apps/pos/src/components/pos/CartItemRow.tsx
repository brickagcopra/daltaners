import { useCartStore } from '@/stores/cart.store';
import { formatCurrency } from '@/lib/format';
import type { CartItem } from '@/types/pos';

interface CartItemRowProps {
  item: CartItem;
}

export function CartItemRow({ item }: CartItemRowProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const lineTotal = item.unit_price * item.quantity - item.discount_amount;

  return (
    <div className="group flex items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-pos-border hover:bg-pos-hover">
      {/* Image */}
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-pos-surface">
        {item.image_url ? (
          <img src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-200">{item.product_name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[10px] text-gray-500">{formatCurrency(item.unit_price)} each</span>
          {item.discount_amount > 0 && (
            <span className="text-[10px] text-red-400">-{formatCurrency(item.discount_amount)}</span>
          )}
        </div>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
          className="flex h-6 w-6 items-center justify-center rounded bg-pos-card text-gray-400 hover:bg-red-500/20 hover:text-red-400"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        </button>
        <span className="w-6 text-center text-xs font-bold text-gray-200">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
          className="flex h-6 w-6 items-center justify-center rounded bg-pos-card text-gray-400 hover:bg-green-500/20 hover:text-green-400"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Line total */}
      <div className="flex flex-col items-end">
        <span className="text-xs font-bold text-gray-200">{formatCurrency(lineTotal)}</span>
        <button
          onClick={() => removeItem(item.product_id)}
          className="mt-0.5 text-[10px] text-gray-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
