import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { NumpadInput } from '@/components/ui/NumpadInput';
import { useCartStore } from '@/stores/cart.store';
import { formatCurrency } from '@/lib/format';

interface DiscountModalProps {
  open: boolean;
  onClose: () => void;
}

type DiscountType = 'percentage' | 'fixed';
type DiscountScope = 'order' | 'item';

export function DiscountModal({ open, onClose }: DiscountModalProps) {
  const items = useCartStore((s) => s.items);
  const setOrderDiscount = useCartStore((s) => s.setOrderDiscount);
  const setItemDiscount = useCartStore((s) => s.setItemDiscount);
  const getTotals = useCartStore((s) => s.getTotals);

  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [scope, setScope] = useState<DiscountScope>('order');
  const [value, setValue] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const totals = getTotals();
  const numValue = parseFloat(value) || 0;

  const computedDiscount = (() => {
    if (scope === 'order') {
      if (discountType === 'percentage') {
        return Math.min(totals.subtotal, (totals.subtotal * numValue) / 100);
      }
      return Math.min(totals.subtotal, numValue);
    }
    // Item scope
    const item = items.find((i) => i.product_id === selectedItemId);
    if (!item) return 0;
    const itemTotal = item.unit_price * item.quantity;
    if (discountType === 'percentage') {
      return Math.min(itemTotal, (itemTotal * numValue) / 100);
    }
    return Math.min(itemTotal, numValue);
  })();

  const handleApply = () => {
    if (scope === 'order') {
      setOrderDiscount(Math.round(computedDiscount * 100) / 100);
    } else if (selectedItemId) {
      setItemDiscount(selectedItemId, Math.round(computedDiscount * 100) / 100);
    }
    handleClose();
  };

  const handleClose = () => {
    setValue('');
    setDiscountType('percentage');
    setScope('order');
    setSelectedItemId(null);
    onClose();
  };

  const quickPercentages = [5, 10, 15, 20, 25, 50];

  return (
    <Modal open={open} onClose={handleClose} title="Apply Discount" size="md">
      {/* Scope selector */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(['order', 'item'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setScope(s);
              setValue('');
              setSelectedItemId(null);
            }}
            className={`rounded-lg border p-2 text-center text-xs font-medium transition-colors ${
              scope === s
                ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                : 'border-pos-border bg-pos-card text-gray-400 hover:bg-pos-hover'
            }`}
          >
            {s === 'order' ? 'Entire Order' : 'Single Item'}
          </button>
        ))}
      </div>

      {/* Item selector (when scope=item) */}
      {scope === 'item' && (
        <div className="mb-4 max-h-32 overflow-y-auto rounded-lg border border-pos-border">
          {items.map((item) => (
            <button
              key={item.product_id}
              onClick={() => setSelectedItemId(item.product_id)}
              className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors ${
                selectedItemId === item.product_id
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-gray-300 hover:bg-pos-hover'
              }`}
            >
              <span className="truncate">{item.product_name}</span>
              <span className="ml-2 shrink-0 text-gray-500">
                {item.quantity}x {formatCurrency(item.unit_price)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Discount type selector */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(['percentage', 'fixed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setDiscountType(t);
              setValue('');
            }}
            className={`rounded-lg border p-2 text-center text-xs font-medium transition-colors ${
              discountType === t
                ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                : 'border-pos-border bg-pos-card text-gray-400 hover:bg-pos-hover'
            }`}
          >
            {t === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (PHP)'}
          </button>
        ))}
      </div>

      {/* Quick percentage buttons */}
      {discountType === 'percentage' && (
        <div className="mb-3 grid grid-cols-6 gap-1.5">
          {quickPercentages.map((pct) => (
            <button
              key={pct}
              onClick={() => setValue(String(pct))}
              className={`rounded-lg border py-2 text-center text-xs font-medium transition-colors ${
                numValue === pct
                  ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                  : 'border-pos-border bg-pos-card text-gray-400 hover:bg-pos-hover'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      )}

      {/* Value input */}
      <NumpadInput
        label={discountType === 'percentage' ? 'Discount %' : 'Discount Amount'}
        value={value}
        onChange={setValue}
        prefix={discountType === 'percentage' ? '%' : '\u20B1'}
        allowDecimal
      />

      {/* Preview */}
      {numValue > 0 && (scope === 'order' || selectedItemId) && (
        <div className="mt-3 rounded-lg bg-pos-card p-3 text-center">
          <p className="text-xs text-gray-500">Discount Amount</p>
          <p className="text-xl font-bold text-red-400">-{formatCurrency(computedDiscount)}</p>
          {scope === 'order' && (
            <p className="text-[10px] text-gray-500">
              New total: {formatCurrency(Math.max(0, totals.subtotal + totals.tax - computedDiscount))}
            </p>
          )}
        </div>
      )}

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleApply}
          disabled={numValue <= 0 || (scope === 'item' && !selectedItemId)}
        >
          Apply Discount
        </Button>
      </ModalFooter>
    </Modal>
  );
}
