import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { type Vendor } from '@/hooks/useVendors';

interface VendorApprovalModalProps {
  vendor: Vendor | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (vendorId: string, commissionRate: number) => void;
  isLoading: boolean;
}

export function VendorApprovalModal({
  vendor,
  isOpen,
  onClose,
  onApprove,
  isLoading,
}: VendorApprovalModalProps) {
  const [commissionRate, setCommissionRate] = useState('15');
  const [error, setError] = useState('');

  const handleApprove = () => {
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 50) {
      setError('Commission rate must be between 0% and 50%');
      return;
    }
    if (!vendor) return;
    setError('');
    onApprove(vendor.id, rate);
  };

  if (!vendor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve Vendor"
      description={`Review and approve ${vendor.storeName}`}
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-muted p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Store Name</p>
              <p className="font-medium text-foreground">{vendor.storeName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Owner</p>
              <p className="font-medium text-foreground">{vendor.ownerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium text-foreground">{vendor.category}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contact</p>
              <p className="font-medium text-foreground">{vendor.phone}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium text-foreground">{vendor.address}</p>
            </div>
          </div>
        </div>

        {vendor.documents && vendor.documents.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Submitted Documents</h4>
            <div className="space-y-2">
              {vendor.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium capitalize text-foreground">
                      {doc.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <Input
          label="Commission Rate (%)"
          type="number"
          value={commissionRate}
          onChange={(e) => setCommissionRate(e.target.value)}
          error={error}
          hint="Platform commission percentage on each sale"
          min={0}
          max={50}
          step={0.5}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleApprove} loading={isLoading}>
            Approve Vendor
          </Button>
        </div>
      </div>
    </Modal>
  );
}
