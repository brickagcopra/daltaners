import { useState, useCallback, useRef } from 'react';
import { ProductGrid } from '@/components/pos/ProductGrid';
import type { ProductGridHandle } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { TerminalSetupModal } from '@/components/pos/TerminalSetupModal';
import { QuickPaymentModal } from '@/components/pos/QuickPaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { DiscountModal } from '@/components/pos/DiscountModal';
import { useTerminalStore } from '@/stores/terminal.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { usePOSProducts, useCategories } from '@/hooks/usePOSProducts';
import { useKeyboardShortcuts, POS_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/format';
import type { Transaction } from '@/types/pos';

export function POSPage() {
  const user = useAuthStore((s) => s.user);
  const activeTerminal = useTerminalStore((s) => s.activeTerminal);
  const activeShift = useTerminalStore((s) => s.activeShift);
  const addItem = useCartStore((s) => s.addItem);
  const storeId = user?.vendorId;

  const { data: products, isLoading: productsLoading } = usePOSProducts(storeId ?? undefined);
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [lastTxNumber, setLastTxNumber] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const productGridRef = useRef<ProductGridHandle>(null);
  const needsSetup = !activeTerminal || !activeShift;

  const showScanFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setScanFeedback({ type, message });
    setTimeout(() => setScanFeedback(null), 2000);
  }, []);

  const handlePaymentComplete = useCallback((txNumber: string, transaction: Transaction) => {
    setPaymentOpen(false);
    setLastTxNumber(txNumber);
    setReceiptTx(transaction);
    // Auto-dismiss success toast after 3s
    setTimeout(() => setLastTxNumber(null), 3000);
  }, []);

  // Barcode scanner detection
  useBarcodeScanner({
    onScan: useCallback(
      (barcode: string) => {
        if (!products) return;
        const product = products.find((p) => p.is_active && p.barcode === barcode);
        if (product) {
          addItem({
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            unit_price: product.sale_price ?? product.base_price,
            image_url: product.images[0]?.thumbnail_url ?? null,
          });
          showScanFeedback('success', `${product.name} added to cart`);
        } else {
          showScanFeedback('error', `Barcode not found: ${barcode}`);
        }
      },
      [products, addItem, showScanFeedback],
    ),
    enabled: !needsSetup,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts(
    {
      [POS_SHORTCUTS.PAYMENT]: () => setPaymentOpen(true),
      [POS_SHORTCUTS.DISCOUNT]: () => setDiscountOpen(true),
      [POS_SHORTCUTS.BARCODE]: () => productGridRef.current?.focusSearch(),
    },
    !needsSetup,
  );

  return (
    <div className="flex h-full">
      {/* Terminal setup modal */}
      <TerminalSetupModal open={needsSetup} />

      {/* Payment modal */}
      <QuickPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onComplete={handlePaymentComplete}
      />

      {/* Discount modal */}
      <DiscountModal open={discountOpen} onClose={() => setDiscountOpen(false)} />

      {/* Receipt modal */}
      <ReceiptModal
        open={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx}
      />

      {/* Success toast */}
      {lastTxNumber && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 animate-pulse">
          <div className="rounded-lg bg-green-500 px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span className="text-sm font-medium">Transaction {lastTxNumber} completed</span>
            </div>
          </div>
        </div>
      )}

      {/* Left: Product grid */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Shift info bar */}
        {activeShift && activeTerminal && (
          <div className="flex items-center gap-3 border-b border-pos-border bg-pos-card px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
              </svg>
              <span className="text-xs text-gray-400">{activeTerminal.name}</span>
            </div>
            <StatusBadge status={activeShift.status} />
            <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
              <span>Transactions: <strong className="text-gray-300">{activeShift.total_transactions}</strong></span>
              <span>Sales: <strong className="text-green-400">{formatCurrency(activeShift.total_sales)}</strong></span>
              {activeShift.total_refunds > 0 && (
                <span>Refunds: <strong className="text-red-400">{formatCurrency(activeShift.total_refunds)}</strong></span>
              )}
            </div>
          </div>
        )}

        <ProductGrid
          ref={productGridRef}
          products={products ?? []}
          categories={categories ?? []}
          isLoading={productsLoading || categoriesLoading}
          scanFeedback={scanFeedback}
        />
      </div>

      {/* Right: Cart panel (fixed 340px width) */}
      <div className="w-[340px] shrink-0">
        <CartPanel
          onPayment={() => setPaymentOpen(true)}
          onDiscount={() => setDiscountOpen(true)}
        />
      </div>
    </div>
  );
}
