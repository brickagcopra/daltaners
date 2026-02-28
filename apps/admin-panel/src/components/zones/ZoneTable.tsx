import { type Zone } from '@/hooks/useZones';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/common/DataTable';

interface ZoneTableProps {
  zones: Zone[];
  isLoading: boolean;
  onEdit: (zone: Zone) => void;
}

export function ZoneTable({ zones, isLoading, onEdit }: ZoneTableProps) {
  const columns: Column<Zone>[] = [
    {
      key: 'name',
      header: 'Zone Name',
      render: (zone) => (
        <div>
          <p className="font-medium text-foreground">{zone.name}</p>
          <p className="text-xs text-muted-foreground">{zone.province}</p>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'City',
      render: (zone) => (
        <span className="text-sm text-foreground">{zone.city}</span>
      ),
    },
    {
      key: 'deliveryFee',
      header: 'Delivery Fee',
      render: (zone) => (
        <span className="text-sm font-medium text-foreground">
          P{(zone.deliveryFee / 100).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'minimumOrder',
      header: 'Min. Order',
      render: (zone) => (
        <span className="text-sm text-foreground">
          P{(zone.minimumOrderAmount / 100).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'eta',
      header: 'Est. Delivery',
      render: (zone) => (
        <span className="text-sm text-muted-foreground">
          {zone.estimatedDeliveryMinutes} min
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (zone) => (
        <Badge variant={zone.isActive ? 'success' : 'muted'}>
          {zone.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (zone) => (
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="sm" onClick={() => onEdit(zone)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={zones}
      isLoading={isLoading}
      keyExtractor={(zone) => zone.id}
      emptyTitle="No zones found"
      emptyDescription="No delivery zones have been configured yet."
    />
  );
}
