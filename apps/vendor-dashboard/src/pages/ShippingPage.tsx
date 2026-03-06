import { useState } from 'react';
import {
  useShipments,
  useShipmentStats,
  useShippingCarriers,
  useCarrierServices,
  useCreateShipment,
  useBookShipment,
  useGenerateLabel,
  useCancelShipment,
  useShipmentTracking,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_COLORS,
  type ShipmentStatus,
  type Shipment,
} from '@/hooks/useShipping';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/common/Pagination';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const statusTabs = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Booked', value: 'booked' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ShippingPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all');
  const [carrierFilter, setCarrierFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bookTarget, setBookTarget] = useState<Shipment | null>(null);
  const [labelTarget, setLabelTarget] = useState<Shipment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Shipment | null>(null);
  const [trackTarget, setTrackTarget] = useState<Shipment | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Create form state
  const [createForm, setCreateForm] = useState({
    orderId: '',
    carrierId: '',
    carrierServiceId: '',
    weightKg: '',
    packageCount: '1',
    shippingFee: '',
    codAmount: '',
    notes: '',
  });

  const { data: shipmentData, isLoading } = useShipments({
    status: statusFilter,
    carrierId: carrierFilter || undefined,
    page,
    limit: 15,
  });
  const { data: stats } = useShipmentStats();
  const { data: carriers } = useShippingCarriers();
  const { data: carrierServicesData } = useCarrierServices(createForm.carrierId || null);

  const createMutation = useCreateShipment();
  const bookMutation = useBookShipment();
  const labelMutation = useGenerateLabel();
  const cancelMutation = useCancelShipment();

  const { data: trackingInfo } = useShipmentTracking(trackTarget?.id || null);

  const shipmentList = shipmentData?.data || [];
  const meta = shipmentData?.meta;

  function handleCreate() {
    createMutation.mutate(
      {
        orderId: createForm.orderId,
        carrierId: createForm.carrierId,
        carrierServiceId: createForm.carrierServiceId || undefined,
        storeId: 'store-001-uuid',
        weightKg: createForm.weightKg ? parseFloat(createForm.weightKg) : undefined,
        packageCount: parseInt(createForm.packageCount, 10) || 1,
        pickupAddress: { address_line1: 'Store Address', city: 'Manila', province: 'Metro Manila' },
        deliveryAddress: { address_line1: 'Customer Address', city: 'Manila', province: 'Metro Manila' },
        shippingFee: createForm.shippingFee ? parseFloat(createForm.shippingFee) : undefined,
        codAmount: createForm.codAmount ? parseFloat(createForm.codAmount) : undefined,
        notes: createForm.notes || undefined,
      },
      {
        onSuccess: () => {
          setCreateModalOpen(false);
          setCreateForm({ orderId: '', carrierId: '', carrierServiceId: '', weightKg: '', packageCount: '1', shippingFee: '', codAmount: '', notes: '' });
        },
      },
    );
  }

  function handleBook() {
    if (!bookTarget) return;
    bookMutation.mutate(bookTarget.id, { onSuccess: () => setBookTarget(null) });
  }

  function handleLabel() {
    if (!labelTarget) return;
    labelMutation.mutate(labelTarget.id, { onSuccess: () => setLabelTarget(null) });
  }

  function handleCancel() {
    if (!cancelTarget) return;
    cancelMutation.mutate(
      { id: cancelTarget.id, reason: cancelReason || undefined },
      { onSuccess: () => { setCancelTarget(null); setCancelReason(''); } },
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shipping</h1>
          <p className="text-sm text-gray-500 mt-1">Manage shipments, book carriers, and track deliveries</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>Create Shipment</Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Shipments" value={stats.total} />
          <StatCard label="Pending" value={stats.pending} color="text-gray-600" />
          <StatCard label="In Transit" value={stats.inTransit} color="text-yellow-600" />
          <StatCard label="Delivered" value={stats.delivered} color="text-green-600" />
          <StatCard label="Failed" value={stats.failed} color="text-red-600" />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Tabs
          tabs={statusTabs}
          activeTab={statusFilter}
          onChange={(val) => { setStatusFilter(val as ShipmentStatus | 'all'); setPage(1); }}
        />
        <select
          className="border rounded px-3 py-2 text-sm"
          value={carrierFilter}
          onChange={(e) => { setCarrierFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Carriers</option>
          {(carriers || []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-lg border relative">
        {isLoading && <LoadingSpinner />}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shipment #</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tracking #</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipmentList.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No shipments found
                </TableCell>
              </TableRow>
            )}
            {shipmentList.map((shp) => {
              const carrier = (carriers || []).find((c) => c.id === shp.carrierId);
              return (
                <TableRow key={shp.id}>
                  <TableCell className="font-medium text-sm">{shp.shipmentNumber}</TableCell>
                  <TableCell className="text-sm text-gray-600">{shp.orderId.slice(0, 15)}...</TableCell>
                  <TableCell className="text-sm">{carrier?.name || shp.carrierId.slice(0, 8)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${SHIPMENT_STATUS_COLORS[shp.status]}`}>
                      {SHIPMENT_STATUS_LABELS[shp.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{shp.trackingNumber || '—'}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(shp.shippingFee)}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(shp.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {shp.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => setBookTarget(shp)}>Book</Button>
                      )}
                      {shp.status === 'booked' && (
                        <Button size="sm" variant="outline" onClick={() => setLabelTarget(shp)}>Label</Button>
                      )}
                      {shp.labelUrl && (
                        <Button size="sm" variant="outline" onClick={() => window.open(shp.labelUrl!, '_blank')}>
                          DL
                        </Button>
                      )}
                      {shp.trackingNumber && (
                        <Button size="sm" variant="outline" onClick={() => setTrackTarget(shp)}>Track</Button>
                      )}
                      {!['delivered', 'cancelled', 'returned_to_sender'].includes(shp.status) && (
                        <Button size="sm" variant="danger" onClick={() => setCancelTarget(shp)}>Cancel</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && (meta.totalPages ?? 0) > 1 && (
        <Pagination currentPage={page} totalPages={meta.totalPages ?? 1} onPageChange={setPage} />
      )}

      {/* Create Shipment Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Shipment">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Order ID *</label>
            <Input
              value={createForm.orderId}
              onChange={(e) => setCreateForm({ ...createForm, orderId: e.target.value })}
              placeholder="Enter order ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Carrier *</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={createForm.carrierId}
              onChange={(e) => setCreateForm({ ...createForm, carrierId: e.target.value, carrierServiceId: '' })}
            >
              <option value="">Select carrier</option>
              {(carriers || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {createForm.carrierId && (
            <div>
              <label className="block text-sm font-medium mb-1">Service</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={createForm.carrierServiceId}
                onChange={(e) => setCreateForm({ ...createForm, carrierServiceId: e.target.value })}
              >
                <option value="">Select service (optional)</option>
                {(carrierServicesData || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatCurrency(s.basePrice)} base + {formatCurrency(s.perKgPrice)}/kg ({s.estimatedDaysMin}-{s.estimatedDaysMax} days)
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Weight (kg)</label>
              <Input
                type="number"
                value={createForm.weightKg}
                onChange={(e) => setCreateForm({ ...createForm, weightKg: e.target.value })}
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Packages</label>
              <Input
                type="number"
                value={createForm.packageCount}
                onChange={(e) => setCreateForm({ ...createForm, packageCount: e.target.value })}
                placeholder="1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Shipping Fee</label>
              <Input
                type="number"
                value={createForm.shippingFee}
                onChange={(e) => setCreateForm({ ...createForm, shippingFee: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">COD Amount</label>
              <Input
                type="number"
                value={createForm.codAmount}
                onChange={(e) => setCreateForm({ ...createForm, codAmount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Textarea
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!createForm.orderId || !createForm.carrierId || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Shipment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Book Shipment Modal */}
      <Modal isOpen={!!bookTarget} onClose={() => setBookTarget(null)} title="Book Shipment">
        {bookTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirm booking shipment <strong>{bookTarget.shipmentNumber}</strong> with the carrier?
              This will generate a tracking number and schedule pickup.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBookTarget(null)}>Cancel</Button>
              <Button onClick={handleBook} disabled={bookMutation.isPending}>
                {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Generate Label Modal */}
      <Modal isOpen={!!labelTarget} onClose={() => setLabelTarget(null)} title="Generate Shipping Label">
        {labelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Generate shipping label for <strong>{labelTarget.shipmentNumber}</strong>?
              The label will be available for download as PDF.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLabelTarget(null)}>Cancel</Button>
              <Button onClick={handleLabel} disabled={labelMutation.isPending}>
                {labelMutation.isPending ? 'Generating...' : 'Generate Label'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Shipment Modal */}
      <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Shipment">
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Cancel shipment <strong>{cancelTarget.shipmentNumber}</strong>? This action cannot be undone.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">Reason (optional)</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Close</Button>
              <Button variant="danger" onClick={handleCancel} disabled={cancelMutation.isPending}>
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Shipment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Tracking Modal */}
      <Modal isOpen={!!trackTarget} onClose={() => setTrackTarget(null)} title="Track Shipment">
        {trackTarget && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="font-medium">{trackTarget.shipmentNumber}</p>
                <p className="text-sm text-gray-500">Tracking: {trackTarget.trackingNumber || '—'}</p>
              </div>
              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${SHIPMENT_STATUS_COLORS[trackTarget.status]}`}>
                {SHIPMENT_STATUS_LABELS[trackTarget.status]}
              </span>
            </div>
            {trackingInfo ? (
              <div className="space-y-3">
                {trackingInfo.events.map((evt, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      {idx < trackingInfo.events.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium">{evt.description}</p>
                      <p className="text-xs text-gray-500">{evt.location} — {formatDate(evt.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Loading tracking information...</p>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setTrackTarget(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({ label, value, color = 'text-gray-900' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
