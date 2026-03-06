import { useRef } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Transaction } from '@/types/pos';
import { formatCurrency, formatDateTime } from '@/lib/format';

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function ReceiptModal({ open, onClose, transaction }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!transaction) return null;

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${transaction.transaction_number}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              max-width: 280px;
              margin: 0 auto;
              padding: 8px;
              color: #000;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; }
            .item-name { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            @media print {
              body { margin: 0; padding: 4px; }
            }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Modal open={open} onClose={onClose} title="Receipt" size="sm">
      <div
        ref={receiptRef}
        className="rounded-lg border border-pos-border bg-white p-4 font-mono text-[11px] text-gray-900"
      >
        {/* Header */}
        <div className="center mb-2 text-center">
          <p className="bold text-sm font-bold">DALTANERS POS</p>
          <p className="text-[10px] text-gray-600">Official Receipt</p>
        </div>

        <div className="my-2 border-t border-dashed border-gray-400" />

        {/* Transaction info */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>TX#:</span>
            <span className="font-semibold">{transaction.transaction_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{formatDateTime(transaction.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Type:</span>
            <span className="uppercase">{transaction.type}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment:</span>
            <span className="uppercase">{transaction.payment_method}</span>
          </div>
          {transaction.status === 'voided' && (
            <div className="mt-1 text-center font-bold text-red-600">*** VOIDED ***</div>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-gray-400" />

        {/* Items */}
        <div className="space-y-1">
          {transaction.items.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between">
                <span className="max-w-[160px] truncate">{item.product_name}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>
                  {item.quantity} x {formatCurrency(item.unit_price)}
                </span>
                {item.discount_amount > 0 && (
                  <span className="text-red-600">-{formatCurrency(item.discount_amount)}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed border-gray-400" />

        {/* Totals */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(transaction.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (12%)</span>
            <span>{formatCurrency(transaction.tax_amount)}</span>
          </div>
          {transaction.discount_amount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>-{formatCurrency(transaction.discount_amount)}</span>
            </div>
          )}
          <div className="my-1 border-t border-gray-300" />
          <div className="flex justify-between text-sm font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(transaction.total)}</span>
          </div>
          {transaction.payment_method === 'cash' && (
            <>
              <div className="flex justify-between">
                <span>Tendered</span>
                <span>{formatCurrency(transaction.amount_tendered)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Change</span>
                <span>{formatCurrency(transaction.change_amount)}</span>
              </div>
            </>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-gray-400" />

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-500">
          <p>Items: {transaction.items.reduce((s, i) => s + i.quantity, 0)}</p>
          <p className="mt-1">Thank you for your purchase!</p>
          <p>Powered by Daltaners</p>
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={handlePrint}>
          <svg
            className="mr-1.5 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z"
            />
          </svg>
          Print Receipt
        </Button>
      </ModalFooter>
    </Modal>
  );
}
