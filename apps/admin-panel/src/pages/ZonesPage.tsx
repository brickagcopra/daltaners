import { useState } from 'react';
import { useZones, useCreateZone, useUpdateZone, type Zone } from '@/hooks/useZones';
import { ZoneTable } from '@/components/zones/ZoneTable';
import { ZoneForm } from '@/components/zones/ZoneForm';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/Button';

export function ZonesPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);

  const { data, isLoading } = useZones(page, 20);
  const createMutation = useCreateZone();
  const updateMutation = useUpdateZone();

  const handleCreate = () => {
    setEditZone(null);
    setFormOpen(true);
  };

  const handleEdit = (zone: Zone) => {
    setEditZone(zone);
    setFormOpen(true);
  };

  const handleSubmit = (formData: {
    name: string;
    city: string;
    province: string;
    deliveryFee: number;
    minimumOrderAmount: number;
    isActive: boolean;
    estimatedDeliveryMinutes: number;
  }) => {
    if (editZone) {
      updateMutation.mutate(
        { id: editZone.id, data: formData },
        { onSuccess: () => { setFormOpen(false); setEditZone(null); } },
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => { setFormOpen(false); },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Zones</h1>
          <p className="mt-1 text-sm text-gray-500">Manage delivery coverage areas and pricing</p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Zone
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <ZoneTable
          zones={data?.data || []}
          isLoading={isLoading}
          onEdit={handleEdit}
        />
        {data?.meta && (
          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={data.meta.limit}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Zone Form Modal */}
      <ZoneForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditZone(null); }}
        onSubmit={handleSubmit}
        zone={editZone}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
