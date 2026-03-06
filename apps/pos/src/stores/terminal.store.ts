import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Terminal, Shift } from '@/types/pos';

interface TerminalState {
  activeTerminal: Terminal | null;
  activeShift: Shift | null;

  setActiveTerminal: (terminal: Terminal | null) => void;
  setActiveShift: (shift: Shift | null) => void;
  clearSession: () => void;
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      activeTerminal: null,
      activeShift: null,

      setActiveTerminal: (terminal) => set({ activeTerminal: terminal }),
      setActiveShift: (shift) => set({ activeShift: shift }),
      clearSession: () => set({ activeTerminal: null, activeShift: null }),
    }),
    {
      name: 'daltaners-pos-terminal',
      partialize: (state) => ({
        activeTerminal: state.activeTerminal,
        activeShift: state.activeShift,
      }),
    },
  ),
);
