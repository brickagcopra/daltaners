import { useEffect, useRef, useCallback, useState } from 'react';

interface UseBarcodeScanner {
  onScan: (barcode: string) => void;
  enabled?: boolean;
}

/**
 * Detects barcode scanner input by monitoring for rapid sequential keystrokes.
 * USB/Bluetooth barcode scanners act as HID keyboard devices — they "type" digits
 * rapidly (< 50ms between keystrokes) and end with Enter.
 */
export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeScanner) {
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const RAPID_THRESHOLD_MS = 50;
  const MIN_BARCODE_LENGTH = 4;

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if a modal is open (active element inside a dialog/modal)
      const activeEl = document.activeElement;
      if (activeEl?.closest('[role="dialog"], [data-modal]')) return;

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If Enter is pressed after rapid input, treat as barcode scan
      if (event.key === 'Enter' && bufferRef.current.length >= MIN_BARCODE_LENGTH) {
        const barcode = bufferRef.current;
        resetBuffer();

        // Only process if the input looks like it came from a scanner (all rapid input)
        setLastScannedCode(barcode);
        onScanRef.current(barcode);
        return;
      }

      // Accumulate single printable characters typed rapidly
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (elapsed > RAPID_THRESHOLD_MS && bufferRef.current.length > 0) {
          // Too slow — this is manual typing, reset buffer
          resetBuffer();
        }
        bufferRef.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, resetBuffer]);

  return { lastScannedCode };
}
