import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumpadInput } from '@/components/ui/NumpadInput';
import { useTerminalStore } from '@/stores/terminal.store';
import { useCreateCashMovement } from '@/hooks/useShifts';

interface CashMovementModalProps {
  open: boolean;
  onClose: () => void;
}

type MovementType = 'cash_in' | 'cash_out' | 'float' | 'pickup';

const MOVEMENT_TYPES: Array<{ id: MovementType; label: string; description: string; icon: string }> = [
  { id: 'cash_in', label: 'Cash In', description: 'Add cash to drawer', icon: '+' },
  { id: 'cash_out', label: 'Cash Out', description: 'Remove cash from drawer', icon: '-' },
  { id: 'float', label: 'Float', description: 'Change float adjustment', icon: '~' },
  { id: 'pickup', label: 'Pickup', description: 'Cash pickup by manager', icon: '#' },
];

export function CashMovementModal({ open, onClose }: CashMovementModalProps) {
  const activeShift = useTerminalStore((s) => s.activeShift);
  const createMovement = useCreateCashMovement();

  const [type, setType] = useState<MovementType>('cash_in');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (!activeShift || numAmount <= 0) return;
    setError('');
    try {
      await createMovement.mutateAsync({
        shiftId: activeShift.id,
        type,
        amount: numAmount,
        reason: reason || undefined,
      });
      resetAndClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record cash movement';
      setError(message);
    }
  };

  const resetAndClose = () => {
    setType('cash_in');
    setAmount('');
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Cash Movement" size="md">
      {/* Movement type */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {MOVEMENT_TYPES.map((m) => (
          <button
            key={m.id}
            onClick={() => setType(m.id)}
            className={`rounded-lg border p-2.5 text-left transition-colors ${
              type === m.id
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-pos-border bg-pos-card hover:bg-pos-hover'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                  type === m.id ? 'bg-primary-500 text-white' : 'bg-pos-hover text-gray-400'
                }`}
              >
                {m.icon}
              </span>
              <div>
                <p className={`text-xs font-medium ${type === m.id ? 'text-primary-400' : 'text-gray-300'}`}>
                  {m.label}
                </p>
                <p className="text-[10px] text-gray-500">{m.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="mb-3">
        <NumpadInput
          label="Amount"
          value={amount}
          onChange={setAmount}
          prefix={'\u20B1'}
          allowDecimal
        />
      </div>

      {/* Reason */}
      <Input
        label="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g., Change for customer, manager pickup..."
      />

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <ModalFooter>
        <Button variant="ghost" onClick={resetAndClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={numAmount <= 0}
          loading={createMovement.isPending}
        >
          Record Movement
        </Button>
      </ModalFooter>
    </Modal>
  );
}
