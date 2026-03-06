import { useState } from 'react';
import {
  useAdminCarriers,
  useAdminCarrierServices,
  useAdminShipments,
  useAdminShipmentStats,
  useCreateCarrier,
  useUpdateCarrier,
  useDeleteCarrier,
  useCreateCarrierService,
  useUpdateCarrierService,
  useDeleteCarrierService,
  useAdminUpdateShipmentStatus,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_COLORS,
  CARRIER_TYPE_LABELS,
  type ShipmentStatus,
  type ShippingCarrier,
  type CarrierService,
  type Shipment,
  type CreateCarrierData,
  type CreateCarrierServiceData,
} from '@/hooks/useShipping';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/common/DataTable';

type Tab = 'shipments' | 'carriers';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'booked', label: 'Booked' },
  { value: 'label_generated', label: 'Label Ready' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'returned_to_sender', label: 'Returned' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ShippingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('shipments');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shipping Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage carriers, services, and shipments</p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'shipments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('shipments')}
        >
          Shipments
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'carriers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('carriers')}
        >
          Carriers & Services
        </button>
      </div>

      {activeTab === 'shipments' ? <ShipmentsTab /> : <CarriersTab />}
    </div>
  );
}

// ────────────────────────────────────────────────────
// Shipments Tab
// ────────────────────────────────────────────────────

function ShipmentsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updateTarget, setUpdateTarget] = useState<Shipment | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const { data: shipmentsData, isLoading } = useAdminShipments({
    search: search || undefined,
    status: (statusFilter as ShipmentStatus) || undefined,
    page,
    limit: 15,
  });
  const { data: stats } = useAdminShipmentStats();
  const updateStatusMutation = useAdminUpdateShipmentStatus();

  const shipmentList = shipmentsData?.data || [];
  const meta = shipmentsData?.meta;

  const shipmentColumns: Column<Shipment>[] = [
    {
      key: 'shipment_number',
      header: 'Shipment #',
      render: (s) => <span className="font-medium text-sm">{s.shipment_number}</span>,
    },
    {
      key: 'order_id',
      header: 'Order',
      render: (s) => <span className="text-sm text-gray-600">{s.order_id.slice(0, 15)}...</span>,
    },
    {
      key: 'store_id',
      header: 'Store',
      render: (s) => <span className="text-sm text-gray-600">{s.store_id.slice(0, 15)}...</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${SHIPMENT_STATUS_COLORS[s.status]}`}>
          {SHIPMENT_STATUS_LABELS[s.status]}
        </span>
      ),
    },
    {
      key: 'tracking_number',
      header: 'Tracking #',
      render: (s) => <span className="text-sm font-mono">{s.tracking_number || '—'}</span>,
    },
    {
      key: 'shipping_fee',
      header: 'Fee',
      render: (s) => <span className="text-sm">{formatCurrency(s.shipping_fee)}</span>,
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (s) => <span className="text-sm text-gray-500">{formatDate(s.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <Button size="sm" variant="outline" onClick={() => { setUpdateTarget(s); setNewStatus(s.status); }}>
          Update
        </Button>
      ),
    },
  ];

  function handleUpdateStatus() {
    if (!updateTarget || !newStatus) return;
    updateStatusMutation.mutate(
      { id: updateTarget.id, status: newStatus as ShipmentStatus, notes: statusNotes || undefined },
      {
        onSuccess: () => {
          setUpdateTarget(null);
          setNewStatus('');
          setStatusNotes('');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Booked" value={stats.booked} />
          <StatCard label="In Transit" value={stats.in_transit} color="text-yellow-600" />
          <StatCard label="Delivered" value={stats.delivered} color="text-green-600" />
          <StatCard label="Failed" value={stats.failed} color="text-red-600" />
          <StatCard label="Total Fees" value={formatCurrency(stats.total_shipping_fees)} isString />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search shipment or tracking #..." />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={statusOptions}
        />
      </div>

      {/* Shipments Table */}
      <DataTable columns={shipmentColumns} data={shipmentList} isLoading={isLoading} keyExtractor={(s) => s.id} />

      {meta && meta.totalPages > 1 && (
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
      )}

      {/* Update Status Modal */}
      <Modal isOpen={!!updateTarget} onClose={() => setUpdateTarget(null)} title="Update Shipment Status">
        {updateTarget && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded p-3 text-sm">
              <p><strong>Shipment:</strong> {updateTarget.shipment_number}</p>
              <p><strong>Current Status:</strong> {SHIPMENT_STATUS_LABELS[updateTarget.status]}</p>
              <p><strong>Tracking:</strong> {updateTarget.tracking_number || '—'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Status</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                {statusOptions.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes (optional)</label>
              <Input
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Reason for status update..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUpdateTarget(null)}>Cancel</Button>
              <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Carriers Tab
// ────────────────────────────────────────────────────

function CarriersTab() {
  const [carrierPage, setCarrierPage] = useState(1);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [carrierModal, setCarrierModal] = useState<'create' | 'edit' | null>(null);
  const [editCarrier, setEditCarrier] = useState<ShippingCarrier | null>(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [serviceModal, setServiceModal] = useState<'create' | 'edit' | null>(null);
  const [editService, setEditService] = useState<CarrierService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'carrier' | 'service'; id: string; name: string } | null>(null);

  // Carrier form state
  const [carrierForm, setCarrierForm] = useState<CreateCarrierData>({
    name: '', code: '', type: 'third_party', priority: 0, is_active: true,
  });

  // Service form state
  const [serviceForm, setServiceForm] = useState<CreateCarrierServiceData>({
    carrier_id: '', name: '', code: '', base_price: 0, estimated_days_min: 1, estimated_days_max: 3,
  });

  const { data: carriersData, isLoading: carriersLoading } = useAdminCarriers({ search: carrierSearch || undefined, page: carrierPage, limit: 20 });
  const { data: services } = useAdminCarrierServices(selectedCarrierId);

  const createCarrierMutation = useCreateCarrier();
  const updateCarrierMutation = useUpdateCarrier();
  const deleteCarrierMutation = useDeleteCarrier();
  const createServiceMutation = useCreateCarrierService();
  const updateServiceMutation = useUpdateCarrierService();
  const deleteServiceMutation = useDeleteCarrierService();

  const carrierList = carriersData?.data || [];
  const carrierMeta = carriersData?.meta;

  const carrierColumns: Column<ShippingCarrier>[] = [
    { key: 'name', header: 'Name', render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'code', header: 'Code', render: (c) => <span className="font-mono text-sm">{c.code}</span> },
    { key: 'type', header: 'Type', render: (c) => <Badge>{CARRIER_TYPE_LABELS[c.type]}</Badge> },
    {
      key: 'is_active', header: 'Status',
      render: (c) => (
        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {c.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { key: 'priority', header: 'Priority', render: (c) => <span className="text-sm">{c.priority}</span> },
    {
      key: 'supported_service_types', header: 'Services',
      render: (c) => <span className="text-xs text-gray-500">{c.supported_service_types.join(', ')}</span>,
    },
    {
      key: 'actions', header: 'Actions',
      render: (c) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setSelectedCarrierId(selectedCarrierId === c.id ? null : c.id)}>
            {selectedCarrierId === c.id ? 'Hide' : 'Services'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => openEditCarrier(c)}>Edit</Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ type: 'carrier', id: c.id, name: c.name })}>Delete</Button>
        </div>
      ),
    },
  ];

  function openEditCarrier(carrier: ShippingCarrier) {
    setEditCarrier(carrier);
    setCarrierForm({
      name: carrier.name,
      code: carrier.code,
      type: carrier.type,
      logo_url: carrier.logo_url || undefined,
      api_base_url: carrier.api_base_url || undefined,
      supported_service_types: carrier.supported_service_types,
      is_active: carrier.is_active,
      priority: carrier.priority,
      contact_phone: carrier.contact_phone || undefined,
      contact_email: carrier.contact_email || undefined,
      tracking_url_template: carrier.tracking_url_template || undefined,
    });
    setCarrierModal('edit');
  }

  function openCreateCarrier() {
    setEditCarrier(null);
    setCarrierForm({ name: '', code: '', type: 'third_party', priority: 0, is_active: true });
    setCarrierModal('create');
  }

  function handleSaveCarrier() {
    if (carrierModal === 'create') {
      createCarrierMutation.mutate(carrierForm, { onSuccess: () => setCarrierModal(null) });
    } else if (carrierModal === 'edit' && editCarrier) {
      const { code, ...updateData } = carrierForm;
      updateCarrierMutation.mutate({ id: editCarrier.id, data: updateData }, { onSuccess: () => setCarrierModal(null) });
    }
  }

  function openCreateService(carrierId: string) {
    setEditService(null);
    setServiceForm({ carrier_id: carrierId, name: '', code: '', base_price: 0, estimated_days_min: 1, estimated_days_max: 3 });
    setServiceModal('create');
  }

  function openEditService(service: CarrierService) {
    setEditService(service);
    setServiceForm({
      carrier_id: service.carrier_id,
      name: service.name,
      code: service.code,
      description: service.description || undefined,
      estimated_days_min: service.estimated_days_min,
      estimated_days_max: service.estimated_days_max,
      base_price: service.base_price,
      per_kg_price: service.per_kg_price,
      max_weight_kg: service.max_weight_kg,
      is_cod_supported: service.is_cod_supported,
      is_insurance_available: service.is_insurance_available,
      coverage_areas: service.coverage_areas || undefined,
      is_active: service.is_active,
    });
    setServiceModal('edit');
  }

  function handleSaveService() {
    if (serviceModal === 'create') {
      createServiceMutation.mutate(serviceForm, { onSuccess: () => setServiceModal(null) });
    } else if (serviceModal === 'edit' && editService) {
      const { carrier_id, ...updateData } = serviceForm;
      updateServiceMutation.mutate({ id: editService.id, data: updateData }, { onSuccess: () => setServiceModal(null) });
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'carrier') {
      deleteCarrierMutation.mutate(deleteTarget.id, { onSuccess: () => { setDeleteTarget(null); if (selectedCarrierId === deleteTarget.id) setSelectedCarrierId(null); } });
    } else {
      deleteServiceMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    }
  }

  return (
    <div className="space-y-6">
      {/* Carrier Header */}
      <div className="flex items-center justify-between">
        <SearchInput value={carrierSearch} onChange={(v) => { setCarrierSearch(v); setCarrierPage(1); }} placeholder="Search carriers..." />
        <Button onClick={openCreateCarrier}>Add Carrier</Button>
      </div>

      {/* Carriers Table */}
      <DataTable columns={carrierColumns} data={carrierList} isLoading={carriersLoading} keyExtractor={(c) => c.id} />

      {carrierMeta && carrierMeta.totalPages > 1 && (
        <Pagination page={carrierPage} totalPages={carrierMeta.totalPages} total={carrierMeta.total} limit={carrierMeta.limit} onPageChange={setCarrierPage} />
      )}

      {/* Carrier Services Panel */}
      {selectedCarrierId && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Services for: {carrierList.find((c) => c.id === selectedCarrierId)?.name}
            </h3>
            <Button size="sm" onClick={() => openCreateService(selectedCarrierId)}>Add Service</Button>
          </div>
          {services && services.length > 0 ? (
            <div className="grid gap-3">
              {services.map((svc) => (
                <div key={svc.id} className="bg-white rounded border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{svc.name} <span className="text-gray-400 font-mono text-xs">({svc.code})</span></p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(svc.base_price)} + {formatCurrency(svc.per_kg_price)}/kg | {svc.estimated_days_min}-{svc.estimated_days_max} days | Max {svc.max_weight_kg}kg
                      {svc.is_cod_supported && ' | COD'}
                      {svc.is_insurance_available && ' | Insurance'}
                    </p>
                    {svc.coverage_areas && svc.coverage_areas.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">Coverage: {svc.coverage_areas.join(', ')}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {svc.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => openEditService(svc)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ type: 'service', id: svc.id, name: svc.name })}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No services configured. Add one to start.</p>
          )}
        </div>
      )}

      {/* Carrier Create/Edit Modal */}
      <Modal
        isOpen={!!carrierModal}
        onClose={() => setCarrierModal(null)}
        title={carrierModal === 'create' ? 'Add Carrier' : 'Edit Carrier'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input value={carrierForm.name} onChange={(e) => setCarrierForm({ ...carrierForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <Input
                value={carrierForm.code}
                onChange={(e) => setCarrierForm({ ...carrierForm, code: e.target.value })}
                disabled={carrierModal === 'edit'}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={carrierForm.type} onChange={(e) => setCarrierForm({ ...carrierForm, type: e.target.value as 'third_party' | 'platform' })}>
                <option value="third_party">Third Party</option>
                <option value="platform">Platform</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <Input type="number" value={String(carrierForm.priority || 0)} onChange={(e) => setCarrierForm({ ...carrierForm, priority: parseInt(e.target.value, 10) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <Input value={carrierForm.contact_phone || ''} onChange={(e) => setCarrierForm({ ...carrierForm, contact_phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <Input value={carrierForm.contact_email || ''} onChange={(e) => setCarrierForm({ ...carrierForm, contact_email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">API Base URL</label>
            <Input value={carrierForm.api_base_url || ''} onChange={(e) => setCarrierForm({ ...carrierForm, api_base_url: e.target.value })} placeholder="https://api.carrier.com/v1" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tracking URL Template</label>
            <Input value={carrierForm.tracking_url_template || ''} onChange={(e) => setCarrierForm({ ...carrierForm, tracking_url_template: e.target.value })} placeholder="https://carrier.com/track?id={{tracking_number}}" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={carrierForm.is_active !== false} onChange={(e) => setCarrierForm({ ...carrierForm, is_active: e.target.checked })} id="carrier-active" />
            <label htmlFor="carrier-active" className="text-sm">Active</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCarrierModal(null)}>Cancel</Button>
            <Button
              onClick={handleSaveCarrier}
              disabled={!carrierForm.name || !carrierForm.code || createCarrierMutation.isPending || updateCarrierMutation.isPending}
            >
              {(createCarrierMutation.isPending || updateCarrierMutation.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Service Create/Edit Modal */}
      <Modal
        isOpen={!!serviceModal}
        onClose={() => setServiceModal(null)}
        title={serviceModal === 'create' ? 'Add Service' : 'Edit Service'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <Input value={serviceForm.code} onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input value={serviceForm.description || ''} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Base Price *</label>
              <Input type="number" value={String(serviceForm.base_price)} onChange={(e) => setServiceForm({ ...serviceForm, base_price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price/kg</label>
              <Input type="number" value={String(serviceForm.per_kg_price || 0)} onChange={(e) => setServiceForm({ ...serviceForm, per_kg_price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Weight (kg)</label>
              <Input type="number" value={String(serviceForm.max_weight_kg || 50)} onChange={(e) => setServiceForm({ ...serviceForm, max_weight_kg: parseFloat(e.target.value) || 50 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Est. Days Min</label>
              <Input type="number" value={String(serviceForm.estimated_days_min || 1)} onChange={(e) => setServiceForm({ ...serviceForm, estimated_days_min: parseInt(e.target.value, 10) || 1 })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Est. Days Max</label>
              <Input type="number" value={String(serviceForm.estimated_days_max || 3)} onChange={(e) => setServiceForm({ ...serviceForm, estimated_days_max: parseInt(e.target.value, 10) || 3 })} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={serviceForm.is_cod_supported || false} onChange={(e) => setServiceForm({ ...serviceForm, is_cod_supported: e.target.checked })} />
              COD Supported
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={serviceForm.is_insurance_available || false} onChange={(e) => setServiceForm({ ...serviceForm, is_insurance_available: e.target.checked })} />
              Insurance Available
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={serviceForm.is_active !== false} onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })} />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setServiceModal(null)}>Cancel</Button>
            <Button
              onClick={handleSaveService}
              disabled={!serviceForm.name || !serviceForm.code || createServiceMutation.isPending || updateServiceMutation.isPending}
            >
              {(createServiceMutation.isPending || updateServiceMutation.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={`Delete ${deleteTarget?.type === 'carrier' ? 'Carrier' : 'Service'}`}>
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
              {deleteTarget.type === 'carrier' && ' This will also delete all associated services.'}
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteCarrierMutation.isPending || deleteServiceMutation.isPending}
              >
                {(deleteCarrierMutation.isPending || deleteServiceMutation.isPending) ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Shared Components
// ────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-gray-900', isString = false }: { label: string; value: number | string; color?: string; isString?: boolean }) {
  return (
    <div className="bg-white rounded-lg border p-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{isString ? value : String(value)}</p>
    </div>
  );
}
