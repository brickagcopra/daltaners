import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useTerminalStore } from '@/stores/terminal.store';
import { useShiftsByStore, useCashMovements } from '@/hooks/useShifts';
import { CloseShiftModal } from '@/components/pos/CloseShiftModal';
import { CashMovementModal } from '@/components/pos/CashMovementModal';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime, formatTime } from '@/lib/format';
import type { Shift } from '@/types/pos';

export function ShiftsPage() {
  const user = useAuthStore((s) => s.user);
  const activeShift = useTerminalStore((s) => s.activeShift);
  const activeTerminal = useTerminalStore((s) => s.activeTerminal);
  const setActiveShift = useTerminalStore((s) => s.setActiveShift);
  const storeId = user?.vendorId;

  const { data: shifts, isLoading } = useShiftsByStore(storeId ?? undefined);
  const { data: cashMovements } = useCashMovements(activeShift?.id);

  const [closeShiftOpen, setCloseShiftOpen] = useState(false);
  const [cashMovementOpen, setCashMovementOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const handleShiftClosed = () => {
    setActiveShift(null);
    setCloseShiftOpen(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-pos-border bg-pos-surface px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-white">Shift Management</h1>
          <p className="text-xs text-gray-500">
            {activeTerminal ? `Terminal: ${activeTerminal.name}` : 'No terminal selected'}
          </p>
        </div>
        {activeShift && activeShift.status === 'open' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCashMovementOpen(true)}>
              <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Cash In/Out
            </Button>
            <Button variant="danger" size="sm" onClick={() => setCloseShiftOpen(true)}>
              <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
              </svg>
              Close Shift
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Active Shift Panel (left) */}
        <div className="w-[360px] shrink-0 overflow-y-auto border-r border-pos-border bg-pos-surface p-4">
          {activeShift ? (
            <div className="space-y-4">
              {/* Active shift card */}
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-green-400">Active Shift</h3>
                  <StatusBadge status={activeShift.status} />
                </div>
                <div className="space-y-1.5 text-xs">
                  <InfoRow label="Opened" value={formatDateTime(activeShift.opened_at)} />
                  <InfoRow label="Cashier" value={activeShift.cashier_name || 'Unknown'} />
                  <InfoRow label="Opening Cash" value={formatCurrency(activeShift.opening_cash)} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Transactions" value={String(activeShift.total_transactions)} />
                <StatCard label="Sales" value={formatCurrency(activeShift.total_sales)} color="green" />
                <StatCard label="Refunds" value={formatCurrency(activeShift.total_refunds)} color="red" />
                <StatCard label="Voids" value={String(activeShift.total_voids)} color="amber" />
              </div>

              {/* Payment breakdown */}
              {activeShift.payment_totals && Object.keys(activeShift.payment_totals).length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold text-gray-300">Payment Breakdown</h4>
                  <div className="space-y-1 rounded-lg bg-pos-card p-2">
                    {Object.entries(activeShift.payment_totals).map(([method, total]) => (
                      <div key={method} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-gray-400">{method}</span>
                        <span className="text-gray-300">{formatCurrency(total as number)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cash movements */}
              <div>
                <h4 className="mb-1.5 text-xs font-semibold text-gray-300">
                  Cash Movements
                  {cashMovements && cashMovements.length > 0 && (
                    <span className="ml-1 text-gray-500">({cashMovements.length})</span>
                  )}
                </h4>
                {!cashMovements || cashMovements.length === 0 ? (
                  <p className="text-[10px] text-gray-600">No cash movements this shift</p>
                ) : (
                  <div className="space-y-1">
                    {cashMovements.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded bg-pos-card px-2 py-1.5 text-xs">
                        <div>
                          <span
                            className={`inline-block w-14 rounded px-1 py-0.5 text-center text-[10px] font-medium ${
                              m.type === 'cash_in'
                                ? 'bg-green-500/20 text-green-400'
                                : m.type === 'cash_out'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {m.type.replace('_', ' ')}
                          </span>
                          {m.reason && (
                            <span className="ml-1.5 text-gray-500">{m.reason}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={m.type === 'cash_in' || m.type === 'float' ? 'text-green-400' : 'text-red-400'}>
                            {m.type === 'cash_in' || m.type === 'float' ? '+' : '-'}
                            {formatCurrency(m.amount)}
                          </span>
                          <p className="text-[10px] text-gray-600">{formatTime(m.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <svg className="h-12 w-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-sm text-gray-500">No active shift</p>
              <p className="text-[10px] text-gray-600">Go to Terminal (F1) to open a shift</p>
            </div>
          )}
        </div>

        {/* Shift History (right) */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-300">Shift History</h3>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-pos-card" />
              ))}
            </div>
          ) : !shifts || shifts.length === 0 ? (
            <p className="text-xs text-gray-500">No shifts recorded yet</p>
          ) : (
            <div className="space-y-2">
              {shifts.map((shift) => (
                <button
                  key={shift.id}
                  onClick={() => setSelectedShift(selectedShift?.id === shift.id ? null : shift)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedShift?.id === shift.id
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-pos-border bg-pos-card hover:bg-pos-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={shift.status} />
                      <span className="text-xs text-gray-400">
                        {formatDateTime(shift.opened_at)}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-green-400">
                      {formatCurrency(shift.total_sales)}
                    </span>
                  </div>

                  {/* Expanded details */}
                  {selectedShift?.id === shift.id && (
                    <div className="mt-2 border-t border-pos-border pt-2">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Transactions</span>
                          <p className="font-medium text-gray-300">{shift.total_transactions}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Refunds</span>
                          <p className="font-medium text-red-400">{formatCurrency(shift.total_refunds)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Voids</span>
                          <p className="font-medium text-amber-400">{shift.total_voids}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Opening</span>
                          <p className="font-medium text-gray-300">{formatCurrency(shift.opening_cash)}</p>
                        </div>
                        {shift.closing_cash !== null && (
                          <div>
                            <span className="text-gray-500">Closing</span>
                            <p className="font-medium text-gray-300">{formatCurrency(shift.closing_cash)}</p>
                          </div>
                        )}
                        {shift.cash_difference !== null && (
                          <div>
                            <span className="text-gray-500">Difference</span>
                            <p
                              className={`font-medium ${
                                shift.cash_difference === 0
                                  ? 'text-green-400'
                                  : shift.cash_difference > 0
                                    ? 'text-blue-400'
                                    : 'text-red-400'
                              }`}
                            >
                              {shift.cash_difference >= 0 ? '+' : ''}
                              {formatCurrency(shift.cash_difference)}
                            </p>
                          </div>
                        )}
                      </div>
                      {shift.closed_at && (
                        <p className="mt-1.5 text-[10px] text-gray-500">
                          Closed: {formatDateTime(shift.closed_at)}
                        </p>
                      )}
                      {shift.close_notes && (
                        <p className="mt-1 text-[10px] italic text-gray-500">
                          Notes: {shift.close_notes}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CloseShiftModal
        open={closeShiftOpen}
        onClose={() => setCloseShiftOpen(false)}
        onShiftClosed={handleShiftClosed}
      />
      <CashMovementModal
        open={cashMovementOpen}
        onClose={() => setCashMovementOpen(false)}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
  };

  return (
    <div className="rounded-lg bg-pos-card p-2 text-center">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${color ? colorMap[color] : 'text-white'}`}>{value}</p>
    </div>
  );
}
