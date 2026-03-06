import { useState } from 'react';
import { useZones, useCreateZone, useUpdateZone, type Zone } from '@/hooks/useZones';
import { ZoneTable } from '@/components/zones/ZoneTable';
import { ZoneForm } from '@/components/zones/ZoneForm';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/Button';

const CITY_TABS = [
  { key: 'all', label: 'All Cities' },
  { key: 'Metro Manila', label: 'Metro Manila' },
  { key: 'Cebu', label: 'Cebu' },
  { key: 'Davao del Sur', label: 'Davao' },
];

export function ZonesPage() {
  const [page, setPage] = useState(1);
  const [cityFilter, setCityFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);

  const { data, isLoading } = useZones(page, 20, cityFilter);
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

  const handleCityFilterChange = (city: string) => {
    setCityFilter(city);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Zones</h1>
          <p className="mt-1 text-sm text-gray-500">Manage delivery coverage areas, pricing, and surge multipliers</p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Zone
        </Button>
      </div>

      {/* City Filter Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {CITY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleCityFilterChange(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              cityFilter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <ZoneTable
          zones={Array.isArray(data?.data) ? data.data : []}
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
