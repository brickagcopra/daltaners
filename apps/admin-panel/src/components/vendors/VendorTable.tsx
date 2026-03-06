import { type Vendor } from '@/hooks/useVendors';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useNavigate } from 'react-router-dom';

interface VendorTableProps {
  vendors: Vendor[];
  isLoading: boolean;
  onApprove: (vendor: Vendor) => void;
  onSuspend: (vendor: Vendor) => void;
}

const statusBadgeVariant: Record<string, 'success' | 'destructive' | 'warning' | 'muted' | 'info'> = {
  pending: 'warning',
  active: 'success',
  suspended: 'destructive',
  rejected: 'muted',
};

export function VendorTable({ vendors, isLoading, onApprove, onSuspend }: VendorTableProps) {
  const navigate = useNavigate();

  const columns: Column<Vendor>[] = [
    {
      key: 'store',
      header: 'Store',
      render: (vendor) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-sm font-bold text-secondary">
            {vendor.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p
              className="cursor-pointer font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => navigate(`/vendors/${vendor.id}`)}
            >
              {vendor.name}
            </p>
            <p className="text-xs text-muted-foreground">{vendor.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (vendor) => (
        <div>
          <p className="text-sm font-medium text-foreground">{vendor.contact_email || '—'}</p>
          <p className="text-xs text-muted-foreground">{vendor.contact_phone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (vendor) => (
        <Badge variant={statusBadgeVariant[vendor.status] || 'muted'}>
          {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (vendor) => (
        <div className="flex items-center gap-1">
          <svg className="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm font-medium text-foreground">
            {vendor.rating_average.toFixed(1)}
          </span>
        </div>
      ),
    },
    {
      key: 'orders',
      header: 'Total Orders',
      render: (vendor) => (
        <span className="text-sm text-foreground">{vendor.total_orders.toLocaleString()}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (vendor) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/vendors/${vendor.id}`)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Button>
          {vendor.status === 'pending' && (
            <Button variant="success" size="sm" onClick={() => onApprove(vendor)}>
              Approve
            </Button>
          )}
          {vendor.status === 'active' && (
            <Button variant="destructive" size="sm" onClick={() => onSuspend(vendor)}>
              Suspend
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={vendors}
      isLoading={isLoading}
      keyExtractor={(vendor) => vendor.id}
      emptyTitle="No vendors found"
      emptyDescription="No vendors match the current filters."
    />
  );
}
