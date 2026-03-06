import { useState } from 'react';
import {
  useRiders,
  useRiderStats,
  useRiderEarnings,
  useUpdateRiderStatus,
  useApproveRider,
  RIDER_STATUS_LABELS,
  RIDER_STATUS_COLORS,
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPE_ICONS,
} from '../hooks/useRiders';
import type { Rider, RiderStatus, VehicleType } from '../hooks/useRiders';
import { exportToCSV } from '../lib/csv-export';

// ── Stat Card ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function RidersPage() {
  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RiderStatus | ''>('');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType | ''>('');
  const [onlineFilter, setOnlineFilter] = useState<'true' | 'false' | ''>('');
  const limit = 10;

  // Modal states
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [actionModal, setActionModal] = useState<{ rider: Rider; action: 'activate' | 'suspend' | 'deactivate' | 'approve' } | null>(null);
  const [actionReason, setActionReason] = useState('');

  // Queries
  const { data: ridersData, isLoading } = useRiders({
    page,
    limit,
    search: search || undefined,
    status: statusFilter || undefined,
    vehicle_type: vehicleFilter || undefined,
    is_online: onlineFilter || undefined,
  });
  const { data: statsData } = useRiderStats();
  const { data: earningsData } = useRiderEarnings(selectedRider?.id ?? '');

  // Mutations
  const updateStatus = useUpdateRiderStatus();
  const approveRider = useApproveRider();

  const stats = statsData?.data;
  const riders = ridersData?.data ?? [];
  const meta = ridersData?.meta;

  const handleAction = async () => {
    if (!actionModal) return;
    const { rider, action } = actionModal;

    if (action === 'approve') {
      await approveRider.mutateAsync(rider.id);
    } else {
      const statusMap: Record<string, RiderStatus> = {
        activate: 'active',
        suspend: 'suspended',
        deactivate: 'inactive',
      };
      await updateStatus.mutateAsync({
        id: rider.id,
        status: statusMap[action],
        reason: actionReason || undefined,
      });
    }

    setActionModal(null);
    setActionReason('');
    setSelectedRider(null);
  };

  const getAvailableActions = (rider: Rider): { label: string; action: 'activate' | 'suspend' | 'deactivate' | 'approve'; color: string }[] => {
    switch (rider.status) {
      case 'pending':
        return [{ label: 'Approve', action: 'approve', color: 'bg-green-600 hover:bg-green-700 text-white' }];
      case 'active':
        return [
          { label: 'Suspend', action: 'suspend', color: 'bg-red-600 hover:bg-red-700 text-white' },
          { label: 'Deactivate', action: 'deactivate', color: 'bg-gray-600 hover:bg-gray-700 text-white' },
        ];
      case 'suspended':
        return [
          { label: 'Activate', action: 'activate', color: 'bg-green-600 hover:bg-green-700 text-white' },
          { label: 'Deactivate', action: 'deactivate', color: 'bg-gray-600 hover:bg-gray-700 text-white' },
        ];
      case 'inactive':
        return [{ label: 'Activate', action: 'activate', color: 'bg-green-600 hover:bg-green-700 text-white' }];
      default:
        return [];
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Delivery Personnel</h1>
          <p className="text-gray-500">Manage riders, review applications, and monitor performance</p>
        </div>
        <button
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          onClick={() =>
            exportToCSV(
              riders,
              [
                { header: 'ID', accessor: (r) => r.id },
                { header: 'First Name', accessor: (r) => r.first_name },
                { header: 'Last Name', accessor: (r) => r.last_name },
                { header: 'Email', accessor: (r) => r.email },
                { header: 'Phone', accessor: (r) => r.phone },
                { header: 'Vehicle', accessor: (r) => r.vehicle_type },
                { header: 'Plate', accessor: (r) => r.vehicle_plate },
                { header: 'Status', accessor: (r) => r.status },
                { header: 'Online', accessor: (r) => r.is_online },
                { header: 'Zone', accessor: (r) => r.current_zone_name },
                { header: 'Rating', accessor: (r) => r.rating_average },
                { header: 'Total Deliveries', accessor: (r) => r.total_deliveries },
                { header: 'Total Earnings', accessor: (r) => r.total_earnings },
                { header: 'Acceptance Rate', accessor: (r) => r.acceptance_rate },
                { header: 'On-Time Rate', accessor: (r) => r.on_time_rate },
                { header: 'Joined', accessor: (r) => r.created_at },
              ],
              `riders-export-${new Date().toISOString().split('T')[0]}`,
            )
          }
        >
          Export CSV
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Riders" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Online Now" value={stats.online} sub={`${stats.offline} offline`} />
          <StatCard label="Pending Approval" value={stats.pending} />
          <StatCard label="Today's Deliveries" value={stats.total_deliveries_today} />
          <StatCard label="Today's Earnings" value={formatCurrency(stats.total_earnings_today)} />
        </div>
      )}

      {/* Vehicle type breakdown */}
      {stats && (
        <div className="flex flex-wrap gap-3">
          {(Object.entries(stats.by_vehicle_type) as [VehicleType, number][])
            .filter(([, count]) => count > 0)
            .map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm shadow-sm">
                <span>{VEHICLE_TYPE_ICONS[type]}</span>
                <span className="font-medium">{VEHICLE_TYPE_LABELS[type]}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold">{count}</span>
              </div>
            ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search name, email, phone, plate..."
          className="w-72 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as RiderStatus | ''); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={vehicleFilter}
          onChange={(e) => { setVehicleFilter(e.target.value as VehicleType | ''); setPage(1); }}
        >
          <option value="">All Vehicles</option>
          <option value="motorcycle">Motorcycle</option>
          <option value="bicycle">Bicycle</option>
          <option value="car">Car</option>
          <option value="van">Van</option>
          <option value="walking">Walking</option>
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={onlineFilter}
          onChange={(e) => { setOnlineFilter(e.target.value as 'true' | 'false' | ''); setPage(1); }}
        >
          <option value="">Online & Offline</option>
          <option value="true">Online Only</option>
          <option value="false">Offline Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Rider</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Online</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3 text-right">Rating</th>
              <th className="px-4 py-3 text-right">Deliveries</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">Loading...</td>
              </tr>
            ) : riders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">No riders found</td>
              </tr>
            ) : (
              riders.map((rider) => (
                <tr key={rider.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      className="text-left hover:underline"
                      onClick={() => setSelectedRider(rider)}
                    >
                      <p className="font-medium">{rider.first_name} {rider.last_name}</p>
                      <p className="text-xs text-gray-400">{rider.phone}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span>{VEHICLE_TYPE_ICONS[rider.vehicle_type]}</span>
                      <span>{VEHICLE_TYPE_LABELS[rider.vehicle_type]}</span>
                    </span>
                    {rider.vehicle_plate && (
                      <p className="text-xs text-gray-400">{rider.vehicle_plate}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${RIDER_STATUS_COLORS[rider.status]}`}>
                      {RIDER_STATUS_LABELS[rider.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {rider.is_online ? (
                      <span className="flex items-center gap-1.5 text-green-600">
                        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                        Online
                      </span>
                    ) : (
                      <span className="text-gray-400">Offline</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {rider.current_zone_name || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {rider.rating_average > 0 ? (
                      <span className="flex items-center justify-end gap-1">
                        <span className="text-yellow-500">★</span>
                        {rider.rating_average.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {rider.total_deliveries.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {rider.current_order_count > 0 ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        {rider.current_order_count}/{rider.max_concurrent_orders}
                      </span>
                    ) : (
                      <span className="text-gray-300">0/{rider.max_concurrent_orders}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                        onClick={() => setSelectedRider(rider)}
                      >
                        View
                      </button>
                      {getAvailableActions(rider).map((act) => (
                        <button
                          key={act.action}
                          className={`rounded px-2 py-1 text-xs ${act.color}`}
                          onClick={() => { setActionModal({ rider, action: act.action }); setActionReason(''); }}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-1">
              <button
                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                disabled={meta.page <= 1}
                onClick={() => setPage(meta.page - 1)}
              >
                Previous
              </button>
              <button
                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage(meta.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────── */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedRider(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedRider.first_name} {selectedRider.last_name}</h2>
                <p className="text-sm text-gray-500">{selectedRider.email} · {selectedRider.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RIDER_STATUS_COLORS[selectedRider.status]}`}>
                  {RIDER_STATUS_LABELS[selectedRider.status]}
                </span>
                {selectedRider.is_online && (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    Online
                  </span>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Vehicle</p>
                <p className="font-medium">{VEHICLE_TYPE_ICONS[selectedRider.vehicle_type]} {VEHICLE_TYPE_LABELS[selectedRider.vehicle_type]}</p>
                {selectedRider.vehicle_plate && <p className="text-xs text-gray-400">{selectedRider.vehicle_plate}</p>}
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Rating</p>
                <p className="font-medium">
                  {selectedRider.rating_average > 0 ? `★ ${selectedRider.rating_average.toFixed(2)}` : 'No ratings'}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Total Deliveries</p>
                <p className="font-medium">{selectedRider.total_deliveries.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Total Earnings</p>
                <p className="font-medium">{formatCurrency(selectedRider.total_earnings)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Acceptance Rate</p>
                <p className="font-medium">{selectedRider.acceptance_rate > 0 ? `${selectedRider.acceptance_rate}%` : '—'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">On-Time Rate</p>
                <p className="font-medium">{selectedRider.on_time_rate > 0 ? `${selectedRider.on_time_rate}%` : '—'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Completion Rate</p>
                <p className="font-medium">{selectedRider.completion_rate > 0 ? `${selectedRider.completion_rate}%` : '—'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Current Zone</p>
                <p className="font-medium">{selectedRider.current_zone_name || 'No zone'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Current Orders</p>
                <p className="font-medium">{selectedRider.current_order_count}/{selectedRider.max_concurrent_orders}</p>
              </div>
            </div>

            {/* License Info */}
            {selectedRider.license_number && (
              <div className="mt-4 rounded-lg border p-3">
                <p className="text-xs text-gray-500">License</p>
                <p className="font-medium">{selectedRider.license_number}</p>
                <p className="text-xs text-gray-400">
                  Expires: {selectedRider.license_expiry ? new Date(selectedRider.license_expiry).toLocaleDateString() : '—'}
                </p>
              </div>
            )}

            {/* Bank Info */}
            {selectedRider.bank_account_info && (
              <div className="mt-3 rounded-lg border p-3">
                <p className="text-xs text-gray-500">Payout Account</p>
                <p className="font-medium">{selectedRider.bank_account_info.bank} — {selectedRider.bank_account_info.account_number}</p>
              </div>
            )}

            {/* Earnings Chart (last 7 days) */}
            {earningsData?.data && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Last 7 Days</h3>
                <div className="grid grid-cols-7 gap-1">
                  {earningsData.data.daily.map((d) => {
                    const maxEarnings = Math.max(...earningsData.data.daily.map((x) => x.earnings), 1);
                    const pct = (d.earnings / maxEarnings) * 100;
                    return (
                      <div key={d.date} className="text-center">
                        <div className="mx-auto flex h-20 w-full items-end justify-center">
                          <div
                            className="w-6 rounded-t bg-blue-500"
                            style={{ height: `${Math.max(pct, 4)}%` }}
                            title={`${formatCurrency(d.earnings)} — ${d.deliveries} deliveries`}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}
                        </p>
                        <p className="text-[10px] font-medium">{d.deliveries}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions + Close */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-2">
                {getAvailableActions(selectedRider).map((act) => (
                  <button
                    key={act.action}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${act.color}`}
                    onClick={() => { setActionModal({ rider: selectedRider, action: act.action }); setActionReason(''); }}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
              <button
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                onClick={() => setSelectedRider(null)}
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Joined: {new Date(selectedRider.created_at).toLocaleDateString()} · Last updated: {new Date(selectedRider.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* ── Action Confirmation Modal ────────────────────────────────── */}
      {actionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setActionModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold capitalize">{actionModal.action} Rider</h3>
            <p className="mt-1 text-sm text-gray-500">
              Are you sure you want to {actionModal.action} <span className="font-medium">{actionModal.rider.first_name} {actionModal.rider.last_name}</span>?
            </p>

            {(actionModal.action === 'suspend' || actionModal.action === 'deactivate') && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700">Reason (optional)</label>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter reason..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                onClick={() => setActionModal(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={updateStatus.isPending || approveRider.isPending}
                onClick={handleAction}
              >
                {updateStatus.isPending || approveRider.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
