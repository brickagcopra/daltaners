import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { NumpadInput, QuickAmountButtons } from '@/components/ui/NumpadInput';
import { useCartStore } from '@/stores/cart.store';
import { useTerminalStore } from '@/stores/terminal.store';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import type { Transaction } from '@/types/pos';

interface QuickPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (txNumber: string, transaction: Transaction) => void;
}

type PaymentMethod = 'cash' | 'card' | 'gcash' | 'maya';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export function QuickPaymentModal({ open, onClose, onComplete }: QuickPaymentModalProps) {
  const items = useCartStore((s) => s.items);
  const getTotals = useCartStore((s) => s.getTotals);
  const clearCart = useCartStore((s) => s.clearCart);
  const activeShift = useTerminalStore((s) => s.activeShift);
  const createTx = useCreateTransaction();

  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [error, setError] = useState('');

  const totals = getTotals();
  const tenderedNum = parseFloat(amountTendered) || 0;
  const changeAmount = method === 'cash' ? Math.max(0, tenderedNum - totals.total) : 0;
  const canPay = method === 'cash' ? tenderedNum >= totals.total : true;

  const handlePay = async () => {
    if (!activeShift) return;
    setError('');
    try {
      const result = await createTx.mutateAsync({
        shift_id: activeShift.id,
        type: 'sale',
        payment_method: method,
        items: items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          sku: i.sku ?? undefined,
          barcode: i.barcode ?? undefined,
          unit_price: i.unit_price,
          quantity: i.quantity,
          discount_amount: i.discount_amount > 0 ? i.discount_amount : undefined,
        })),
        amount_tendered: method === 'cash' ? tenderedNum : totals.total,
        discount_amount: totals.discount > 0 ? totals.discount : undefined,
      });
      clearCart();
      onComplete(result.transaction_number, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
    }
  };

  const handleClose = () => {
    setMethod('cash');
    setAmountTendered('');
    setError('');
    onClose();
  };

  const methods: Array<{ id: PaymentMethod; label: string; icon: string }> = [
    { id: 'cash', label: 'Cash', icon: '\uD83D\uDCB5' },
    { id: 'card', label: 'Card', icon: '\uD83D\uDCB3' },
    { id: 'gcash', label: 'GCash', icon: '\uD83D\uDCF1' },
    { id: 'maya', label: 'Maya', icon: '\uD83D\uDCF1' },
  ];

  return (
    <Modal open={open} onClose={handleClose} title="Payment" size="md">
      {/* Total */}
      <div className="mb-4 rounded-lg bg-pos-card p-3 text-center">
        <p className="text-xs text-gray-500">Amount Due</p>
        <p className="text-3xl font-bold text-white">{formatCurrency(totals.total)}</p>
        <p className="text-xs text-gray-500">{totals.itemCount} item{totals.itemCount !== 1 ? 's' : ''}</p>
      </div>

      {/* Payment method selector */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMethod(m.id); setAmountTendered(''); }}
            className={`rounded-lg border p-2 text-center transition-colors ${
              method === m.id
                ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                : 'border-pos-border bg-pos-card text-gray-400 hover:bg-pos-hover'
            }`}
          >
            <span className="text-lg">{m.icon}</span>
            <p className="mt-0.5 text-xs font-medium">{m.label}</p>
          </button>
        ))}
      </div>

      {/* Cash input */}
      {method === 'cash' && (
        <div className="space-y-3">
          <NumpadInput
            label="Amount Tendered"
            value={amountTendered}
            onChange={setAmountTendered}
            prefix={'\u20B1'}
            allowDecimal
          />
          <QuickAmountButtons
            amounts={QUICK_AMOUNTS}
            onSelect={(amt) => setAmountTendered(String(amt))}
            selectedAmount={tenderedNum}
          />
          {tenderedNum > 0 && tenderedNum >= totals.total && (
            <div className="rounded-lg bg-green-500/10 p-2 text-center">
              <p className="text-xs text-gray-400">Change</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(changeAmount)}</p>
            </div>
          )}
        </div>
      )}

      {/* Non-cash */}
      {method !== 'cash' && (
        <div className="rounded-lg border border-pos-border bg-pos-card p-4 text-center">
          <p className="text-sm text-gray-300">
            {method === 'card' ? 'Swipe or tap card on terminal' : `Scan ${method.toUpperCase()} QR code`}
          </p>
          <p className="mt-1 text-xs text-gray-500">Amount: {formatCurrency(totals.total)}</p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
        <Button
          variant="success"
          onClick={handlePay}
          disabled={!canPay}
          loading={createTx.isPending}
        >
          Complete Payment
        </Button>
      </ModalFooter>
    </Modal>
  );
}
