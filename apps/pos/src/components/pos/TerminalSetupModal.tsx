import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { NumpadInput } from '@/components/ui/NumpadInput';
import { useTerminals } from '@/hooks/useTerminals';
import { useOpenShift } from '@/hooks/useShifts';
import { useTerminalStore } from '@/stores/terminal.store';
import { useAuthStore } from '@/stores/auth.store';
import { StatusBadge } from '@/components/ui/Badge';
import type { Terminal } from '@/types/pos';

interface TerminalSetupModalProps {
  open: boolean;
}

type Step = 'select-terminal' | 'open-shift';

export function TerminalSetupModal({ open }: TerminalSetupModalProps) {
  const user = useAuthStore((s) => s.user);
  const storeId = user?.vendorId;
  const { data: terminals, isLoading } = useTerminals(storeId ?? undefined);
  const openShiftMutation = useOpenShift();
  const setActiveTerminal = useTerminalStore((s) => s.setActiveTerminal);
  const setActiveShift = useTerminalStore((s) => s.setActiveShift);

  const [step, setStep] = useState<Step>('select-terminal');
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [openingCash, setOpeningCash] = useState('5000');
  const [error, setError] = useState('');

  const activeTerminals = terminals?.filter((t) => t.status === 'active') ?? [];

  const handleSelectTerminal = (terminal: Terminal) => {
    setSelectedTerminal(terminal);
    setStep('open-shift');
    setError('');
  };

  const handleOpenShift = async () => {
    if (!selectedTerminal) return;
    setError('');
    try {
      const shift = await openShiftMutation.mutateAsync({
        terminal_id: selectedTerminal.id,
        opening_cash: parseFloat(openingCash) || 0,
        cashier_name: user ? `${user.firstName} ${user.lastName}` : undefined,
      });
      setActiveTerminal(selectedTerminal);
      setActiveShift(shift);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to open shift';
      setError(message);
    }
  };

  return (
    <Modal open={open} onClose={() => {}} title="Terminal Setup" size="md">
      {step === 'select-terminal' && (
        <div>
          <p className="mb-3 text-sm text-gray-400">Select a terminal to begin your shift.</p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-pos-card" />
              ))}
            </div>
          ) : activeTerminals.length === 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center">
              <p className="text-sm text-amber-400">No active terminals found.</p>
              <p className="mt-1 text-xs text-gray-500">Ask an admin to set up a terminal for this store.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTerminals.map((terminal) => (
                <button
                  key={terminal.id}
                  onClick={() => handleSelectTerminal(terminal)}
                  className="flex w-full items-center gap-3 rounded-lg border border-pos-border bg-pos-card p-3 text-left transition-colors hover:border-primary-500/50 hover:bg-pos-hover"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                    <svg className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-200">{terminal.name}</p>
                    <p className="text-xs text-gray-500">{terminal.terminal_code}</p>
                  </div>
                  <StatusBadge status={terminal.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'open-shift' && selectedTerminal && (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-pos-card p-2">
            <svg className="h-4 w-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
            </svg>
            <span className="text-sm font-medium text-gray-300">{selectedTerminal.name}</span>
            <span className="text-xs text-gray-500">({selectedTerminal.terminal_code})</span>
          </div>

          <p className="mb-3 text-sm text-gray-400">Enter the opening cash amount to start your shift.</p>

          <NumpadInput
            label="Opening Cash"
            value={openingCash}
            onChange={setOpeningCash}
            prefix="₱"
            allowDecimal
          />

          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}

          <ModalFooter>
            <Button variant="ghost" onClick={() => { setStep('select-terminal'); setSelectedTerminal(null); }}>
              Back
            </Button>
            <Button
              variant="success"
              onClick={handleOpenShift}
              loading={openShiftMutation.isPending}
            >
              Open Shift
            </Button>
          </ModalFooter>
        </div>
      )}
    </Modal>
  );
}
