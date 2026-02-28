import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { StockItem } from '@/hooks/useInventory';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem | null;
  onSubmit: (data: {
    productId: string;
    adjustment: number;
    reason: string;
    notes?: string;
  }) => void;
  isSubmitting: boolean;
}

const reasonOptions = [
  { label: 'Restock / Delivery received', value: 'restock' },
  { label: 'Damaged / Expired', value: 'damaged' },
  { label: 'Manual correction', value: 'correction' },
  { label: 'Return to supplier', value: 'return' },
  { label: 'Customer return', value: 'customer_return' },
  { label: 'Inventory count adjustment', value: 'count_adjustment' },
  { label: 'Other', value: 'other' },
];

export function AdjustStockModal({
  isOpen,
  onClose,
  item,
  onSubmit,
  isSubmitting,
}: AdjustStockModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !quantity || !reason) return;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) return;

    let adjustment: number;
    if (adjustmentType === 'add') {
      adjustment = qty;
    } else if (adjustmentType === 'remove') {
      adjustment = -qty;
    } else {
      adjustment = qty - item.currentStock;
    }

    onSubmit({
      productId: item.productId,
      adjustment,
      reason,
      notes: notes || undefined,
    });
  };

  const handleClose = () => {
    setAdjustmentType('add');
    setQuantity('');
    setReason('');
    setNotes('');
    onClose();
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Adjust Stock" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-900">{item.productName}</p>
          <p className="text-xs text-gray-500">
            Current stock: <span className="font-bold">{item.currentStock}</span> |
            Reserved: <span className="font-bold">{item.reservedStock}</span> |
            Available: <span className="font-bold">{item.availableStock}</span>
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Adjustment Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['add', 'remove', 'set'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAdjustmentType(type)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  adjustmentType === type
                    ? type === 'add'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : type === 'remove'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {type === 'add' ? 'Add Stock' : type === 'remove' ? 'Remove Stock' : 'Set Stock'}
              </button>
            ))}
          </div>
        </div>

        <Input
          label={
            adjustmentType === 'set'
              ? 'New Stock Level'
              : `Quantity to ${adjustmentType === 'add' ? 'Add' : 'Remove'}`
          }
          type="number"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Enter quantity"
          required
        />

        {quantity && (
          <div className="rounded-lg bg-blue-50 px-3 py-2">
            <p className="text-sm text-blue-700">
              New stock level will be:{' '}
              <span className="font-bold">
                {adjustmentType === 'add'
                  ? item.currentStock + parseInt(quantity || '0', 10)
                  : adjustmentType === 'remove'
                    ? Math.max(0, item.currentStock - parseInt(quantity || '0', 10))
                    : parseInt(quantity || '0', 10)}
              </span>
            </p>
          </div>
        )}

        <Select
          label="Reason"
          options={reasonOptions}
          placeholder="Select reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <Textarea
          label="Notes (optional)"
          placeholder="Additional details about this adjustment"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!quantity || !reason}
          >
            Confirm Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
