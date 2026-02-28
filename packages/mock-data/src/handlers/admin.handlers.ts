import { http, delay, HttpResponse } from 'msw';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';
import { users, stores, orders, zones, categories, adminDashboard } from '../data';

const BASE = '/api/v1';

export const adminHandlers = [
  // ===== USERS =====
  // GET /admin/users
  http.get(`${BASE}/admin/users`, async ({ request }) => {
    await delay(300);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const search = params.get('search')?.toLowerCase();
    const role = params.get('role');
    const status = params.get('status');

    let filtered = [...users];
    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.first_name.toLowerCase().includes(search) ||
          u.last_name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search),
      );
    }
    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }
    if (status === 'active') {
      filtered = filtered.filter((u) => u.is_active);
    } else if (status === 'inactive') {
      filtered = filtered.filter((u) => !u.is_active);
    }

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /admin/users/:id
  http.get(`${BASE}/admin/users/:id`, async ({ params }) => {
    await delay(200);
    const user = users.find((u) => u.id === params.id);
    if (!user) return errorResponse(404, 'NOT_FOUND', 'User not found');
    return wrap(user);
  }),

  // PATCH /admin/users/:id
  http.patch(`${BASE}/admin/users/:id`, async ({ params, request }) => {
    await delay(300);
    const user = users.find((u) => u.id === params.id);
    if (!user) return errorResponse(404, 'NOT_FOUND', 'User not found');
    const body = (await request.json()) as Record<string, unknown>;
    return wrap({ ...user, ...body, updated_at: new Date().toISOString() });
  }),

  // ===== VENDORS =====
  // GET /admin/vendors
  http.get(`${BASE}/admin/vendors`, async ({ request }) => {
    await delay(300);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const search = params.get('search')?.toLowerCase();
    const status = params.get('status');
    const category = params.get('category');

    let filtered = [...stores];
    if (search) {
      filtered = filtered.filter(
        (s) => s.name.toLowerCase().includes(search) || s.slug.toLowerCase().includes(search),
      );
    }
    if (status) {
      filtered = filtered.filter((s) => s.status === status);
    }
    if (category) {
      filtered = filtered.filter((s) => s.category === category);
    }

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /admin/vendors/:id
  http.get(`${BASE}/admin/vendors/:id`, async ({ params }) => {
    await delay(200);
    const store = stores.find((s) => s.id === params.id);
    if (!store) return errorResponse(404, 'NOT_FOUND', 'Vendor not found');
    return wrap(store);
  }),

  // POST /admin/vendors/:id/approve
  http.post(`${BASE}/admin/vendors/:id/approve`, async ({ params, request }) => {
    await delay(400);
    const store = stores.find((s) => s.id === params.id);
    if (!store) return errorResponse(404, 'NOT_FOUND', 'Vendor not found');
    const body = (await request.json()) as { commissionRate?: number };
    return wrap({
      ...store,
      status: 'active',
      commission_rate: body.commissionRate ?? store.commission_rate,
      updated_at: new Date().toISOString(),
    });
  }),

  // POST /admin/vendors/:id/suspend
  http.post(`${BASE}/admin/vendors/:id/suspend`, async ({ params, request }) => {
    await delay(400);
    const store = stores.find((s) => s.id === params.id);
    if (!store) return errorResponse(404, 'NOT_FOUND', 'Vendor not found');
    const body = (await request.json()) as { reason?: string };
    return wrap({
      ...store,
      status: 'suspended',
      metadata: { ...store.metadata, suspension_reason: body.reason },
      updated_at: new Date().toISOString(),
    });
  }),

  // ===== ORDERS =====
  // GET /admin/orders
  http.get(`${BASE}/admin/orders`, async ({ request }) => {
    await delay(300);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const search = params.get('search')?.toLowerCase();
    const status = params.get('status');
    const paymentMethod = params.get('paymentMethod');
    const storeId = params.get('storeId');

    let filtered = [...orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    if (search) {
      filtered = filtered.filter(
        (o) =>
          o.order_number.toLowerCase().includes(search) || o.id.toLowerCase().includes(search),
      );
    }
    if (status) {
      filtered = filtered.filter((o) => o.status === status);
    }
    if (paymentMethod) {
      filtered = filtered.filter((o) => o.payment_method === paymentMethod);
    }
    if (storeId) {
      filtered = filtered.filter((o) => o.store_id === storeId);
    }

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /admin/orders/stats
  http.get(`${BASE}/admin/orders/stats`, async () => {
    await delay(200);
    return wrap(adminDashboard);
  }),

  // ===== ZONES =====
  // GET /admin/zones
  http.get(`${BASE}/admin/zones`, async ({ request }) => {
    await delay(200);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    return paginatedWrap(zones, page, limit);
  }),

  // POST /admin/zones
  http.post(`${BASE}/admin/zones`, async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as Record<string, unknown>;
    const newZone = {
      id: `zone-${Date.now()}`,
      name: body.name ?? 'New Zone',
      city: body.city ?? '',
      province: body.province ?? 'Metro Manila',
      region: body.region ?? 'NCR',
      boundary: body.boundary ?? { type: 'Polygon', coordinates: [] },
      base_delivery_fee: body.base_delivery_fee ?? 49,
      per_km_fee: body.per_km_fee ?? 10,
      surge_multiplier: 1.0,
      is_active: body.is_active ?? true,
      max_delivery_radius_km: body.max_delivery_radius_km ?? 5,
      capacity_limit: body.capacity_limit ?? 100,
      current_capacity: 0,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(
      { success: true, data: newZone, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // PATCH /admin/zones/:id
  http.patch(`${BASE}/admin/zones/:id`, async ({ params, request }) => {
    await delay(300);
    const zone = zones.find((z) => z.id === params.id);
    if (!zone) return errorResponse(404, 'NOT_FOUND', 'Zone not found');
    const body = (await request.json()) as Record<string, unknown>;
    return wrap({ ...zone, ...body, updated_at: new Date().toISOString() });
  }),

  // ===== CATEGORIES =====
  // GET /admin/categories
  http.get(`${BASE}/admin/categories`, async () => {
    await delay(200);
    return wrap(categories);
  }),

  // POST /admin/categories
  http.post(`${BASE}/admin/categories`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as Record<string, unknown>;
    const newCat = {
      id: `cat-${Date.now()}`,
      parent_id: body.parent_id ?? null,
      name: body.name ?? 'New Category',
      slug: ((body.name as string) ?? 'new-category').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      icon_url: body.icon_url ?? null,
      sort_order: body.sort_order ?? 99,
      is_active: body.is_active ?? true,
      level: body.parent_id ? 1 : 0,
      children: [],
    };
    return HttpResponse.json(
      { success: true, data: newCat, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // PATCH /admin/categories/:id
  http.patch(`${BASE}/admin/categories/:id`, async ({ params, request }) => {
    await delay(300);
    const allCats = categories.flatMap((c) => [c, ...c.children]);
    const cat = allCats.find((c) => c.id === params.id);
    if (!cat) return errorResponse(404, 'NOT_FOUND', 'Category not found');
    const body = (await request.json()) as Record<string, unknown>;
    return wrap({ ...cat, ...body });
  }),

  // DELETE /admin/categories/:id
  http.delete(`${BASE}/admin/categories/:id`, async () => {
    await delay(200);
    return new HttpResponse(null, { status: 204 });
  }),

  // ===== NOTIFICATIONS =====
  // GET /admin/notifications
  http.get(`${BASE}/admin/notifications`, async ({ request }) => {
    await delay(200);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);

    const notifications = [
      {
        id: 'notif-001',
        title: 'Weekend Sale!',
        body: 'Get 20% off on all fresh produce this weekend!',
        channel: 'push',
        status: 'delivered',
        sent_at: '2026-02-27T08:00:00Z',
        recipients: 15420,
      },
      {
        id: 'notif-002',
        title: 'New Stores Available',
        body: 'Check out 3 new stores now delivering in your area.',
        channel: 'push',
        status: 'delivered',
        sent_at: '2026-02-25T10:00:00Z',
        recipients: 12300,
      },
      {
        id: 'notif-003',
        title: 'Valentine Special',
        body: 'Free delivery on orders above P500. Valid until Feb 14.',
        channel: 'push',
        status: 'delivered',
        sent_at: '2026-02-12T06:00:00Z',
        recipients: 14800,
      },
    ];

    return paginatedWrap(notifications, page, limit);
  }),

  // POST /admin/notifications/broadcast
  http.post(`${BASE}/admin/notifications/broadcast`, async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as Record<string, unknown>;
    return wrap({
      id: `notif-${Date.now()}`,
      title: body.title,
      body: body.body,
      channel: body.channel ?? 'push',
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipients: 15420,
    });
  }),
];
