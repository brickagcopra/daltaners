import { http, delay, HttpResponse } from 'msw';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';
import { users, stores, orders, zones, categories, adminDashboard, accountingMockData, vendorStatsMock, coupons, settlementItems } from '../data';
import type { MockCoupon } from '../data/coupons';
import type { MockSettlement } from '../data/dashboard';

// Mutable copy so create/update/delete work within session
const couponsList: MockCoupon[] = [...coupons];
const settlementsList: MockSettlement[] = [...(accountingMockData.settlements as MockSettlement[])];

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

  // ===== ACCOUNTING =====
  // GET /payments/admin/transactions
  http.get(`${BASE}/payments/admin/transactions`, async ({ request }) => {
    await delay(300);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const status = params.get('status');
    const method = params.get('method');
    const type = params.get('type');
    const dateFrom = params.get('date_from');
    const dateTo = params.get('date_to');

    let filtered = [...accountingMockData.transactions];
    if (status) filtered = filtered.filter((t) => t.status === status);
    if (method) filtered = filtered.filter((t) => t.method === method);
    if (type) filtered = filtered.filter((t) => t.type === type);
    if (dateFrom) filtered = filtered.filter((t) => t.created_at >= dateFrom);
    if (dateTo) filtered = filtered.filter((t) => t.created_at <= dateTo + 'T23:59:59Z');

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /payments/admin/transaction-stats
  http.get(`${BASE}/payments/admin/transaction-stats`, async () => {
    await delay(200);
    return wrap(accountingMockData.transactionStats);
  }),

  // GET /payments/admin/settlements
  http.get(`${BASE}/payments/admin/settlements`, async ({ request }) => {
    await delay(300);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const status = params.get('status');
    const dateFrom = params.get('date_from');
    const dateTo = params.get('date_to');

    let filtered = [...accountingMockData.settlements];
    if (status) filtered = filtered.filter((s) => s.status === status);
    if (dateFrom) filtered = filtered.filter((s) => s.created_at >= dateFrom);
    if (dateTo) filtered = filtered.filter((s) => s.created_at <= dateTo + 'T23:59:59Z');

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /payments/admin/settlement-stats
  http.get(`${BASE}/payments/admin/settlement-stats`, async () => {
    await delay(200);
    return wrap(accountingMockData.settlementStats);
  }),

  // POST /payments/admin/settlements/generate — Generate settlements for a period
  http.post(`${BASE}/payments/admin/settlements/generate`, async ({ request }) => {
    await delay(600);
    const body = (await request.json()) as { period_start: string; period_end: string; vendor_id?: string };
    const now = new Date().toISOString();
    const newSettlement: MockSettlement = {
      id: `settle-${Date.now()}`,
      vendor_id: body.vendor_id ?? 'vendor-003',
      vendor_name: body.vendor_id ? 'Custom Vendor' : 'Kusina ni Nena',
      period_start: body.period_start,
      period_end: body.period_end,
      gross_amount: 125000.00,
      commission_amount: 12500.00,
      net_amount: 112500.00,
      withholding_tax: 2250.00,
      adjustment_amount: 0,
      final_amount: 110250.00,
      order_count: 8,
      status: 'pending',
      notes: null,
      approved_by: null,
      payment_reference: null,
      settlement_date: null,
      created_at: now,
    };
    settlementsList.unshift(newSettlement);
    return HttpResponse.json({ success: true, data: { generated: [newSettlement] }, timestamp: now }, { status: 201 });
  }),

  // GET /payments/admin/settlements/:id — Settlement detail with items
  http.get(`${BASE}/payments/admin/settlements/:id`, async ({ params }) => {
    await delay(300);
    const settlement = settlementsList.find((s) => s.id === params.id);
    if (!settlement) return errorResponse(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    const items = settlementItems[settlement.id] ?? [];
    return wrap({ ...settlement, items });
  }),

  // PATCH /payments/admin/settlements/:id/approve — Approve a pending settlement
  http.patch(`${BASE}/payments/admin/settlements/:id/approve`, async ({ params, request }) => {
    await delay(400);
    const idx = settlementsList.findIndex((s) => s.id === params.id);
    if (idx === -1) return errorResponse(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    if (settlementsList[idx].status !== 'pending') {
      return errorResponse(400, 'INVALID_STATUS', 'Only pending settlements can be approved');
    }
    const body = (await request.json()) as { notes?: string };
    settlementsList[idx] = { ...settlementsList[idx], status: 'processing', approved_by: 'admin-current', notes: body.notes ?? 'Approved for processing' };
    return wrap(settlementsList[idx]);
  }),

  // PATCH /payments/admin/settlements/:id/process — Mark a settlement as processed/paid
  http.patch(`${BASE}/payments/admin/settlements/:id/process`, async ({ params, request }) => {
    await delay(500);
    const idx = settlementsList.findIndex((s) => s.id === params.id);
    if (idx === -1) return errorResponse(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    if (settlementsList[idx].status !== 'processing') {
      return errorResponse(400, 'INVALID_STATUS', 'Only processing settlements can be marked completed');
    }
    const body = (await request.json()) as { payment_reference: string; notes?: string };
    const now = new Date().toISOString();
    settlementsList[idx] = {
      ...settlementsList[idx],
      status: 'completed',
      payment_reference: body.payment_reference,
      settlement_date: now,
      notes: body.notes ?? settlementsList[idx].notes,
    };
    return wrap(settlementsList[idx]);
  }),

  // PATCH /payments/admin/settlements/:id/reject — Reject a pending settlement
  http.patch(`${BASE}/payments/admin/settlements/:id/reject`, async ({ params, request }) => {
    await delay(400);
    const idx = settlementsList.findIndex((s) => s.id === params.id);
    if (idx === -1) return errorResponse(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    if (settlementsList[idx].status !== 'pending') {
      return errorResponse(400, 'INVALID_STATUS', 'Only pending settlements can be rejected');
    }
    const body = (await request.json()) as { notes: string };
    settlementsList[idx] = { ...settlementsList[idx], status: 'failed', notes: body.notes };
    return wrap(settlementsList[idx]);
  }),

  // PATCH /payments/admin/settlements/:id/adjust — Adjust settlement amount
  http.patch(`${BASE}/payments/admin/settlements/:id/adjust`, async ({ params, request }) => {
    await delay(400);
    const idx = settlementsList.findIndex((s) => s.id === params.id);
    if (idx === -1) return errorResponse(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    const body = (await request.json()) as { adjustment_amount: number; notes: string };
    const s = settlementsList[idx];
    const newFinal = s.net_amount - s.withholding_tax + body.adjustment_amount;
    settlementsList[idx] = {
      ...s,
      adjustment_amount: body.adjustment_amount,
      final_amount: newFinal,
      notes: body.notes,
    };
    return wrap(settlementsList[idx]);
  }),

  // POST /payments/admin/settlements/batch-process — Process multiple settlements
  http.post(`${BASE}/payments/admin/settlements/batch-process`, async ({ request }) => {
    await delay(800);
    const body = (await request.json()) as { settlement_ids: string[]; payment_reference_prefix: string };
    const now = new Date().toISOString();
    const processed: MockSettlement[] = [];
    body.settlement_ids.forEach((id, i) => {
      const idx = settlementsList.findIndex((s) => s.id === id);
      if (idx !== -1 && settlementsList[idx].status === 'processing') {
        settlementsList[idx] = {
          ...settlementsList[idx],
          status: 'completed',
          payment_reference: `${body.payment_reference_prefix}-${String(i + 1).padStart(3, '0')}`,
          settlement_date: now,
        };
        processed.push(settlementsList[idx]);
      }
    });
    return wrap({ processed_count: processed.length, settlements: processed });
  }),

  // GET /payments/admin/wallets
  http.get(`${BASE}/payments/admin/wallets`, async ({ request }) => {
    await delay(300);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const search = params.get('search')?.toLowerCase();
    const status = params.get('status');

    let filtered = [...accountingMockData.wallets];
    if (search) filtered = filtered.filter((w) => w.user_id.toLowerCase().includes(search));
    if (status === 'active') filtered = filtered.filter((w) => w.is_active);
    else if (status === 'inactive') filtered = filtered.filter((w) => !w.is_active);

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /payments/admin/wallet-stats
  http.get(`${BASE}/payments/admin/wallet-stats`, async () => {
    await delay(200);
    return wrap(accountingMockData.walletStats);
  }),

  // ===== VENDOR STATS =====
  // GET /vendors/admin/stats
  http.get(`${BASE}/vendors/admin/stats`, async () => {
    await delay(200);
    return wrap(vendorStatsMock);
  }),

  // ===== COUPONS (Admin) =====
  // GET /orders/admin/coupons
  http.get(`${BASE}/orders/admin/coupons`, async ({ request }) => {
    await delay(300);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const search = params.get('search')?.toLowerCase();
    const discountType = params.get('discount_type');
    const isActive = params.get('is_active');
    const isExpired = params.get('is_expired');

    let filtered = [...couponsList];
    if (search) {
      filtered = filtered.filter(
        (c) => c.code.toLowerCase().includes(search) || c.name.toLowerCase().includes(search),
      );
    }
    if (discountType) filtered = filtered.filter((c) => c.discount_type === discountType);
    if (isActive === 'true') filtered = filtered.filter((c) => c.is_active);
    if (isActive === 'false') filtered = filtered.filter((c) => !c.is_active);
    if (isExpired === 'true') filtered = filtered.filter((c) => new Date(c.valid_until) < new Date());
    if (isExpired === 'false') filtered = filtered.filter((c) => new Date(c.valid_until) >= new Date());

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /orders/admin/coupons/:id
  http.get(`${BASE}/orders/admin/coupons/:id`, async ({ params }) => {
    await delay(200);
    const coupon = couponsList.find((c) => c.id === params.id);
    if (!coupon) return errorResponse(404, 'COUPON_NOT_FOUND', 'Coupon not found');
    return wrap(coupon);
  }),

  // POST /orders/admin/coupons
  http.post(`${BASE}/orders/admin/coupons`, async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as Partial<MockCoupon>;
    const now = new Date().toISOString();
    const newCoupon: MockCoupon = {
      id: crypto.randomUUID(),
      code: body.code ?? 'NEW_CODE',
      name: body.name ?? 'New Coupon',
      description: body.description ?? null,
      discount_type: body.discount_type ?? 'percentage',
      discount_value: body.discount_value ?? 0,
      minimum_order_value: body.minimum_order_value ?? 0,
      maximum_discount: body.maximum_discount ?? null,
      applicable_categories: body.applicable_categories ?? null,
      applicable_stores: body.applicable_stores ?? null,
      usage_limit: body.usage_limit ?? null,
      usage_count: 0,
      per_user_limit: body.per_user_limit ?? 1,
      is_first_order_only: body.is_first_order_only ?? false,
      valid_from: body.valid_from ?? now,
      valid_until: body.valid_until ?? now,
      is_active: true,
      created_by: null,
      created_at: now,
      updated_at: now,
    };
    couponsList.unshift(newCoupon);
    return HttpResponse.json({ success: true, data: newCoupon, timestamp: now }, { status: 201 });
  }),

  // PATCH /orders/admin/coupons/:id
  http.patch(`${BASE}/orders/admin/coupons/:id`, async ({ params, request }) => {
    await delay(300);
    const idx = couponsList.findIndex((c) => c.id === params.id);
    if (idx === -1) return errorResponse(404, 'COUPON_NOT_FOUND', 'Coupon not found');
    const body = (await request.json()) as Partial<MockCoupon>;
    couponsList[idx] = { ...couponsList[idx], ...body, updated_at: new Date().toISOString() };
    return wrap(couponsList[idx]);
  }),

  // DELETE /orders/admin/coupons/:id
  http.delete(`${BASE}/orders/admin/coupons/:id`, async ({ params }) => {
    await delay(300);
    const idx = couponsList.findIndex((c) => c.id === params.id);
    if (idx === -1) return errorResponse(404, 'COUPON_NOT_FOUND', 'Coupon not found');
    if (couponsList[idx].usage_count > 0) {
      couponsList[idx].is_active = false;
      couponsList[idx].updated_at = new Date().toISOString();
    } else {
      couponsList.splice(idx, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // ===== COUPONS (Customer) =====
  // POST /orders/coupons/validate
  http.post(`${BASE}/orders/coupons/validate`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { code: string; subtotal: number; store_id?: string };
    const coupon = couponsList.find((c) => c.code === body.code.toUpperCase());

    if (!coupon || !coupon.is_active) {
      return wrap({ valid: false, coupon_code: body.code, discount_type: 'percentage', discount_value: 0, discount_amount: 0, message: 'Invalid or inactive coupon code' });
    }

    const now = new Date();
    if (new Date(coupon.valid_from) > now || new Date(coupon.valid_until) < now) {
      return wrap({ valid: false, coupon_code: body.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value, discount_amount: 0, message: 'This coupon has expired' });
    }

    if (coupon.minimum_order_value > 0 && body.subtotal < coupon.minimum_order_value) {
      return wrap({ valid: false, coupon_code: body.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value, discount_amount: 0, message: `Minimum order of P${coupon.minimum_order_value} required` });
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.round(body.subtotal * (coupon.discount_value / 100) * 100) / 100;
      if (coupon.maximum_discount && discountAmount > coupon.maximum_discount) {
        discountAmount = coupon.maximum_discount;
      }
    } else if (coupon.discount_type === 'fixed_amount') {
      discountAmount = coupon.discount_value;
    }

    return wrap({
      valid: true,
      coupon_code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discountAmount,
    });
  }),

  // ===== AUTH ADMIN USERS ALIASES =====
  // Admin panel uses /auth/admin/users/* instead of /admin/users/*
  http.get(`${BASE}/auth/admin/users`, async ({ request }) => {
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

  http.get(`${BASE}/auth/admin/users/:id`, async ({ params }) => {
    await delay(200);
    const user = users.find((u) => u.id === params.id);
    if (!user) return errorResponse(404, 'NOT_FOUND', 'User not found');
    return wrap(user);
  }),

  http.patch(`${BASE}/auth/admin/users/:id`, async ({ params, request }) => {
    await delay(300);
    const user = users.find((u) => u.id === params.id);
    if (!user) return errorResponse(404, 'NOT_FOUND', 'User not found');
    const body = (await request.json()) as Record<string, unknown>;
    return wrap({ ...user, ...body, updated_at: new Date().toISOString() });
  }),

  http.post(`${BASE}/auth/admin/users`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as Record<string, unknown>;
    const newUser = {
      id: `user-${Date.now()}`,
      ...body,
      is_verified: false,
      is_active: true,
      mfa_enabled: false,
      last_login_at: null,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(
      { success: true, data: newUser, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  http.post(`${BASE}/auth/admin/users/:id/reset-password`, async ({ params }) => {
    await delay(300);
    const user = users.find((u) => u.id === params.id);
    if (!user) return errorResponse(404, 'NOT_FOUND', 'User not found');
    return wrap({ temporary_password: 'TempPass123!' });
  }),

  // ===== PUBLIC CATEGORIES =====
  // GET /categories (customer-web uses this)
  http.get(`${BASE}/categories`, async () => {
    await delay(200);
    return wrap(categories);
  }),

  // ===== ADMIN ALIASES =====
  // Admin panel uses /vendors/admin/* instead of /admin/vendors/*
  http.get(`${BASE}/vendors/admin/stores`, async ({ request }) => {
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

  http.get(`${BASE}/vendors/admin/stores/:id`, async ({ params }) => {
    await delay(200);
    const store = stores.find((s) => s.id === params.id);
    if (!store) return errorResponse(404, 'NOT_FOUND', 'Vendor not found');
    return wrap(store);
  }),

  http.get(`${BASE}/vendors/admin/stats`, async () => {
    await delay(200);
    const active = stores.filter((s) => s.status === 'active').length;
    const pending = stores.filter((s) => s.status === 'pending').length;
    const suspended = stores.filter((s) => s.status === 'suspended').length;
    const categoryMap: Record<string, number> = {};
    stores.forEach((s) => { categoryMap[s.category] = (categoryMap[s.category] || 0) + 1; });
    return wrap({
      totalStores: stores.length,
      activeStores: active,
      pendingStores: pending,
      suspendedStores: suspended,
      storesByCategory: Object.entries(categoryMap).map(([category, count]) => ({ category, count })),
      storesByTier: [{ tier: 'basic', count: stores.length }],
      averageRating: +(stores.reduce((s, st) => s + (st.rating_average ?? 0), 0) / stores.length).toFixed(1),
      totalOrders: stores.reduce((s, st) => s + (st.total_orders ?? 0), 0),
    });
  }),

  http.post(`${BASE}/vendors/admin/stores/:id/approve`, async ({ params, request }) => {
    await delay(400);
    const store = stores.find((s) => s.id === params.id);
    if (!store) return errorResponse(404, 'NOT_FOUND', 'Vendor not found');
    const body = (await request.json()) as { commission_rate?: number };
    return wrap({
      ...store,
      status: 'active',
      commission_rate: body.commission_rate ?? store.commission_rate,
      updated_at: new Date().toISOString(),
    });
  }),

  http.post(`${BASE}/vendors/admin/stores/:id/suspend`, async ({ params, request }) => {
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

  http.post(`${BASE}/vendors/admin/stores/:id/reactivate`, async ({ params }) => {
    await delay(400);
    const store = stores.find((s) => s.id === params.id);
    if (!store) return errorResponse(404, 'NOT_FOUND', 'Vendor not found');
    return wrap({
      ...store,
      status: 'active',
      updated_at: new Date().toISOString(),
    });
  }),

  // Admin panel uses /orders/admin/* instead of /admin/orders/*
  http.get(`${BASE}/orders/admin/orders`, async ({ request }) => {
    await delay(300);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const search = params.get('search')?.toLowerCase();
    const status = params.get('status');
    const paymentMethod = params.get('payment_method');
    const storeId = params.get('store_id');

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

  http.get(`${BASE}/orders/admin/stats`, async () => {
    await delay(200);
    return wrap(adminDashboard);
  }),
];
