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
      description={`Review and approve ${vendor.name}`}
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-muted p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Store Name</p>
              <p className="font-medium text-foreground">{vendor.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium text-foreground">{vendor.category}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contact Email</p>
              <p className="font-medium text-foreground">{vendor.contact_email || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contact Phone</p>
              <p className="font-medium text-foreground">{vendor.contact_phone || '—'}</p>
            </div>
            {vendor.locations?.[0] && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Primary Location</p>
                <p className="font-medium text-foreground">
                  {vendor.locations[0].address_line1}, {vendor.locations[0].city}, {vendor.locations[0].province}
                </p>
              </div>
            )}
          </div>
        </div>

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
