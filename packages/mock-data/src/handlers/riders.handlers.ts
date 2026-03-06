import { http, delay } from 'msw';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';
import { riders, computeRiderStats } from '../data/riders';
import type { MockRider, RiderStatus, VehicleType } from '../data/riders';

const BASE = '/api/v1';

export const ridersHandlers = [
  // ── Admin: GET rider list (paginated + filterable) ───────────────────
  ...[
    `${BASE}/admin/riders`,
    `${BASE}/delivery/admin/riders`,
  ].map((path) =>
    http.get(path, async ({ request }) => {
      await delay(300);
      const params = getSearchParams(request);
      const page = parseInt(params.get('page') ?? '1', 10);
      const limit = parseInt(params.get('limit') ?? '20', 10);
      const search = params.get('search')?.toLowerCase();
      const status = params.get('status') as RiderStatus | null;
      const vehicleType = params.get('vehicle_type') as VehicleType | null;
      const isOnline = params.get('is_online');
      const zone = params.get('zone')?.toLowerCase();
      const sortBy = params.get('sort_by') ?? 'created_at';
      const sortOrder = params.get('sort_order') ?? 'desc';

      let filtered = [...riders];

      if (search) {
        filtered = filtered.filter(
          (r) =>
            r.first_name.toLowerCase().includes(search) ||
            r.last_name.toLowerCase().includes(search) ||
            r.email.toLowerCase().includes(search) ||
            r.phone.includes(search) ||
            (r.vehicle_plate && r.vehicle_plate.toLowerCase().includes(search)),
        );
      }

      if (status) {
        filtered = filtered.filter((r) => r.status === status);
      }

      if (vehicleType) {
        filtered = filtered.filter((r) => r.vehicle_type === vehicleType);
      }

      if (isOnline === 'true') {
        filtered = filtered.filter((r) => r.is_online);
      } else if (isOnline === 'false') {
        filtered = filtered.filter((r) => !r.is_online);
      }

      if (zone) {
        filtered = filtered.filter(
          (r) => r.current_zone_name && r.current_zone_name.toLowerCase().includes(zone),
        );
      }

      // Sort
      filtered.sort((a, b) => {
        let aVal: number | string = 0;
        let bVal: number | string = 0;
        switch (sortBy) {
          case 'rating':
            aVal = a.rating_average;
            bVal = b.rating_average;
            break;
          case 'total_deliveries':
            aVal = a.total_deliveries;
            bVal = b.total_deliveries;
            break;
          case 'total_earnings':
            aVal = a.total_earnings;
            bVal = b.total_earnings;
            break;
          case 'name':
            aVal = `${a.first_name} ${a.last_name}`;
            bVal = `${b.first_name} ${b.last_name}`;
            break;
          default:
            aVal = new Date(a.created_at).getTime();
            bVal = new Date(b.created_at).getTime();
        }
        if (typeof aVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
        }
        return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      });

      return paginatedWrap(filtered, page, limit);
    }),
  ),

  // ── Admin: GET rider stats ─────────────────────────────────────────
  ...[
    `${BASE}/admin/riders/stats`,
    `${BASE}/delivery/admin/riders/stats`,
  ].map((path) =>
    http.get(path, async () => {
      await delay(200);
      return wrap(computeRiderStats(riders));
    }),
  ),

  // ── Admin: GET rider detail ────────────────────────────────────────
  ...[
    `${BASE}/admin/riders/:id`,
    `${BASE}/delivery/admin/riders/:id`,
  ].map((path) =>
    http.get(path, async ({ params }) => {
      await delay(200);
      const rider = riders.find((r) => r.id === params.id);
      if (!rider) return errorResponse(404, 'RIDER_NOT_FOUND', 'Rider not found');
      return wrap(rider);
    }),
  ),

  // ── Admin: PATCH update rider status ───────────────────────────────
  ...[
    `${BASE}/admin/riders/:id/status`,
    `${BASE}/delivery/admin/riders/:id/status`,
  ].map((path) =>
    http.patch(path, async ({ params, request }) => {
      await delay(400);
      const rider = riders.find((r) => r.id === params.id);
      if (!rider) return errorResponse(404, 'RIDER_NOT_FOUND', 'Rider not found');

      const body = (await request.json()) as { status: RiderStatus; reason?: string };

      // Validate transitions
      const validTransitions: Record<RiderStatus, RiderStatus[]> = {
        pending: ['active'],
        active: ['suspended', 'inactive'],
        suspended: ['active', 'inactive'],
        inactive: ['active'],
      };

      if (!validTransitions[rider.status]?.includes(body.status)) {
        return errorResponse(
          400,
          'INVALID_STATUS_TRANSITION',
          `Cannot transition from ${rider.status} to ${body.status}`,
        );
      }

      const updated: MockRider = {
        ...rider,
        status: body.status,
        is_online: body.status === 'active' ? rider.is_online : false,
        updated_at: new Date().toISOString(),
      };

      // Mutate in-memory
      const idx = riders.findIndex((r) => r.id === params.id);
      if (idx !== -1) riders[idx] = updated;

      return wrap(updated);
    }),
  ),

  // ── Admin: GET rider earnings summary ──────────────────────────────
  ...[
    `${BASE}/admin/riders/:id/earnings`,
    `${BASE}/delivery/admin/riders/:id/earnings`,
  ].map((path) =>
    http.get(path, async ({ params }) => {
      await delay(300);
      const rider = riders.find((r) => r.id === params.id);
      if (!rider) return errorResponse(404, 'RIDER_NOT_FOUND', 'Rider not found');

      // Generate last 7 days of earnings
      const daily: { date: string; deliveries: number; earnings: number; tips: number }[] = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayDeliveries = Math.floor(Math.random() * 15) + 3;
        const dayEarnings = dayDeliveries * (120 + Math.floor(Math.random() * 60));
        const tips = Math.floor(dayEarnings * 0.08);
        daily.push({
          date: d.toISOString().split('T')[0],
          deliveries: dayDeliveries,
          earnings: dayEarnings,
          tips,
        });
      }

      return wrap({
        rider_id: rider.id,
        total_lifetime_earnings: rider.total_earnings,
        total_lifetime_deliveries: rider.total_deliveries,
        today_earnings: rider.today_earnings,
        today_deliveries: rider.today_deliveries,
        daily,
      });
    }),
  ),

  // ── Admin: POST approve pending rider ──────────────────────────────
  ...[
    `${BASE}/admin/riders/:id/approve`,
    `${BASE}/delivery/admin/riders/:id/approve`,
  ].map((path) =>
    http.post(path, async ({ params }) => {
      await delay(400);
      const rider = riders.find((r) => r.id === params.id);
      if (!rider) return errorResponse(404, 'RIDER_NOT_FOUND', 'Rider not found');
      if (rider.status !== 'pending') {
        return errorResponse(400, 'INVALID_STATUS', 'Only pending riders can be approved');
      }

      const updated: MockRider = {
        ...rider,
        status: 'active',
        updated_at: new Date().toISOString(),
      };
      const idx = riders.findIndex((r) => r.id === params.id);
      if (idx !== -1) riders[idx] = updated;

      return wrap(updated);
    }),
  ),
];
