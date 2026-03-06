import { useState, useMemo } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTerminalStore } from '@/stores/terminal.store';
import { useCloseShift } from '@/hooks/useShifts';
import { formatCurrency, formatDateTime } from '@/lib/format';

interface CloseShiftModalProps {
  open: boolean;
  onClose: () => void;
  onShiftClosed: () => void;
}

// Philippine currency denominations
const DENOMINATIONS = [
  { label: '1000', value: 1000, type: 'bill' },
  { label: '500', value: 500, type: 'bill' },
  { label: '200', value: 200, type: 'bill' },
  { label: '100', value: 100, type: 'bill' },
  { label: '50', value: 50, type: 'bill' },
  { label: '20', value: 20, type: 'coin' },
  { label: '10', value: 10, type: 'coin' },
  { label: '5', value: 5, type: 'coin' },
  { label: '1', value: 1, type: 'coin' },
  { label: '0.25', value: 0.25, type: 'coin' },
] as const;

export function CloseShiftModal({ open, onClose, onShiftClosed }: CloseShiftModalProps) {
  const activeShift = useTerminalStore((s) => s.activeShift);
  const setActiveShift = useTerminalStore((s) => s.setActiveShift);
  const closeShift = useCloseShift();

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'count' | 'confirm'>('count');

  const closingCash = useMemo(() => {
    return DENOMINATIONS.reduce((total, d) => {
      return total + (counts[d.label] || 0) * d.value;
    }, 0);
  }, [counts]);

  const expectedCash = activeShift?.expected_cash ?? activeShift?.opening_cash ?? 0;
  const difference = closingCash - expectedCash;

  const handleCountChange = (label: string, value: string) => {
    const num = parseInt(value, 10);
    setCounts((prev) => ({ ...prev, [label]: isNaN(num) ? 0 : Math.max(0, num) }));
  };

  const handleClose = async () => {
    if (!activeShift) return;
    try {
      const result = await closeShift.mutateAsync({
        shiftId: activeShift.id,
        closing_cash: Math.round(closingCash * 100) / 100,
        close_notes: notes || undefined,
      });
      setActiveShift(result);
      onShiftClosed();
      resetAndClose();
    } catch {
      // Error handled by mutation state
    }
  };

  const resetAndClose = () => {
    setCounts({});
    setNotes('');
    setStep('count');
    onClose();
  };

  if (!activeShift) return null;

  return (
    <Modal open={open} onClose={resetAndClose} title="Close Shift" size="lg">
      {step === 'count' && (
        <>
          {/* Shift summary */}
          <div className="mb-4 grid grid-cols-4 gap-2">
            <SummaryCard label="Sales" value={formatCurrency(activeShift.total_sales)} color="green" />
            <SummaryCard label="Refunds" value={formatCurrency(activeShift.total_refunds)} color="red" />
            <SummaryCard label="Transactions" value={String(activeShift.total_transactions)} color="blue" />
            <SummaryCard label="Opening Cash" value={formatCurrency(activeShift.opening_cash)} color="gray" />
          </div>

          {/* Denomination counting */}
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold text-gray-300">Cash Count by Denomination</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {DENOMINATIONS.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="w-12 text-right text-xs text-gray-400">
                    {d.type === 'bill' ? '\u20B1' : ''}{d.label}
                  </span>
                  <span className="text-[10px] text-gray-600">{d.type === 'bill' ? 'bill' : 'coin'}</span>
                  <input
                    type="number"
                    min={0}
                    value={counts[d.label] || ''}
                    onChange={(e) => handleCountChange(d.label, e.target.value)}
                    placeholder="0"
                    className="w-16 rounded border border-pos-border bg-pos-card px-2 py-1 text-center text-xs text-white focus:border-primary-500 focus:outline-none"
                  />
                  <span className="w-20 text-right text-xs text-gray-500">
                    = {formatCurrency((counts[d.label] || 0) * d.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-pos-card p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Counted Cash</span>
              <span className="font-bold text-white">{formatCurrency(closingCash)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-gray-500">Expected Cash</span>
              <span className="text-gray-400">{formatCurrency(expectedCash)}</span>
            </div>
            <div className="mt-1 border-t border-pos-border pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Difference</span>
                <span
                  className={`font-semibold ${
                    difference === 0
                      ? 'text-green-400'
                      : difference > 0
                        ? 'text-blue-400'
                        : 'text-red-400'
                  }`}
                >
                  {difference >= 0 ? '+' : ''}
                  {formatCurrency(difference)}
                </span>
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setStep('confirm')}>
              Review & Close
            </Button>
          </ModalFooter>
        </>
      )}

      {step === 'confirm' && (
        <>
          <div className="space-y-3">
            {/* Final summary */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="mb-2 text-xs font-medium text-amber-400">
                Please confirm you want to close this shift
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Shift Opened</span>
                  <span className="text-gray-300">{formatDateTime(activeShift.opened_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Transactions</span>
                  <span className="text-gray-300">{activeShift.total_transactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Sales</span>
                  <span className="text-green-400">{formatCurrency(activeShift.total_sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Closing Cash</span>
                  <span className="font-semibold text-white">{formatCurrency(closingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Difference</span>
                  <span
                    className={`font-semibold ${
                      difference === 0
                        ? 'text-green-400'
                        : difference > 0
                          ? 'text-blue-400'
                          : 'text-red-400'
                    }`}
                  >
                    {difference >= 0 ? '+' : ''}
                    {formatCurrency(difference)}
                  </span>
                </div>
              </div>
            </div>

            {/* Close notes */}
            <Input
              label="Close Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this shift..."
            />
          </div>

          {closeShift.isError && (
            <p className="mt-2 text-xs text-red-400">
              {closeShift.error instanceof Error ? closeShift.error.message : 'Failed to close shift'}
            </p>
          )}

          <ModalFooter>
            <Button variant="ghost" onClick={() => setStep('count')}>
              Back
            </Button>
            <Button variant="danger" onClick={handleClose} loading={closeShift.isPending}>
              Close Shift
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    gray: 'text-gray-300',
  };

  return (
    <div className="rounded-lg bg-pos-card p-2 text-center">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${colorMap[color] || 'text-white'}`}>{value}</p>
    </div>
  );
}
