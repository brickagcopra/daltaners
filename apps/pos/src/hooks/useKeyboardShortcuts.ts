import { useEffect, useCallback, useRef } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

/**
 * Hook for POS keyboard shortcuts.
 * Key format: "ctrl+s", "f1", "escape", "ctrl+shift+p"
 * Automatically prevents default browser behavior for registered shortcuts.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs (unless F-keys or Escape)
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const isFunctionKey = event.key.startsWith('F') && event.key.length <= 3;
      const isEscape = event.key === 'Escape';

      if (isInput && !isFunctionKey && !isEscape) return;

      const parts: string[] = [];
      if (event.ctrlKey || event.metaKey) parts.push('ctrl');
      if (event.shiftKey) parts.push('shift');
      if (event.altKey) parts.push('alt');

      const key = event.key.toLowerCase();
      if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
        parts.push(key);
      }

      const combo = parts.join('+');
      const handler = shortcutsRef.current[combo];

      if (handler) {
        event.preventDefault();
        event.stopPropagation();
        handler();
      }
    },
    [enabled],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/** POS keyboard shortcut presets */
export const POS_SHORTCUTS = {
  NEW_SALE: 'f1',
  PAYMENT: 'f2',
  HOLD_ORDER: 'f3',
  RECALL_ORDER: 'f4',
  VOID_ITEM: 'f5',
  DISCOUNT: 'f6',
  CUSTOMER: 'f7',
  CASH_DRAWER: 'f8',
  SEARCH: 'ctrl+f',
  BARCODE: 'ctrl+b',
  QUANTITY: 'ctrl+q',
  ESCAPE: 'escape',
} as const;
