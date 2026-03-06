import { http, delay, HttpResponse } from 'msw';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';
import { stores, orders, products, productsByStore, vendorDashboard, vendorAnalyticsMock, vendorFinancials, users, settlementItems } from '../data';
import { getCurrentUser } from './auth.handlers';

const BASE = '/api/v1';

// Extract user ID from mock token: "mock-access-{userId}-{timestamp}"
function getUserFromToken(request: Request) {
  const auth = request.headers.get('authorization') ?? '';
  const match = auth.match(/^Bearer mock-access-(u-[a-z]+-\d+)-/);
  if (match) {
    const user = users.find((u) => u.id === match[1]);
    if (user) return user;
  }
  // Fallback to in-memory current user
  return getCurrentUser();
}

function getVendorStore(request?: Request) {
  const user = request ? getUserFromToken(request) : getCurrentUser();
  if (!user) return null;
  const vendorId = (user as Record<string, unknown>).vendor_id as string | undefined;
  if (!vendorId) return null;
  return stores.find((s) => s.id === vendorId) ?? null;
}

export const vendorHandlers = [
  // ===== STORE =====
  // GET /stores/me — vendor dashboard fetches current vendor's store
  http.get(`${BASE}/stores/me`, async ({ request }) => {
    await delay(200);
    const store = getVendorStore(request);
    if (!store) return errorResponse(403, 'FORBIDDEN', 'No store associated with this account');
    return wrap(store);
  }),

  // GET /vendor/store (legacy alias)
  http.get(`${BASE}/vendor/store`, async ({ request }) => {
    await delay(200);
    const store = getVendorStore(request);
    if (!store) return errorResponse(403, 'FORBIDDEN', 'No store associated with this account');
    return wrap(store);
  }),

  // PATCH /stores/:storeId (vendor updating their own store)
  http.patch(`${BASE}/stores/:storeId`, async ({ params, request }) => {
    await delay(300);
    const store = stores.find((s) => s.id === params.storeId);
    if (!store) return errorResponse(404, 'NOT_FOUND', 'Store not found');
    const body = (await request.json()) as Record<string, unknown>;
    return wrap({ ...store, ...body, updated_at: new Date().toISOString() });
  }),

  // ===== STAFF =====
  // GET /stores/:storeId/staff — returns camelCase for vendor dashboard
  http.get(`${BASE}/stores/:storeId/staff`, async ({ params }) => {
    await delay(200);
    const storeId = params.storeId as string;
    const staffUsers = users.filter(
      (u) =>
        (u.role === 'vendor_staff' || u.role === 'vendor_owner') &&
        (u as Record<string, unknown>).vendor_id === storeId,
    );
    const staff = staffUsers.map((u) => ({
      id: `staff-${u.id}`,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      permissions: u.role === 'vendor_owner'
        ? ['product:manage', 'order:manage', 'staff:manage', 'store:manage']
        : ['product:manage', 'order:manage'],
      isActive: true,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
    }));
    return wrap(staff);
  }),

  // POST /stores/:storeId/staff/invite
  http.post(`${BASE}/stores/:storeId/staff/invite`, async ({ params, request }) => {
    await delay(400);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        success: true,
        data: {
          id: `staff-invite-${Date.now()}`,
          store_id: params.storeId,
          email: body.email,
          role: body.role ?? 'staff',
          status: 'pending',
          invited_at: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  // DELETE /stores/:storeId/staff/:staffId
  http.delete(`${BASE}/stores/:storeId/staff/:staffId`, async () => {
    await delay(200);
    return new HttpResponse(null, { status: 204 });
  }),

  // PATCH /stores/:storeId/staff/:staffId/permissions
  http.patch(`${BASE}/stores/:storeId/staff/:staffId/permissions`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as Record<string, unknown>;
    return wrap({ permissions: body, updated_at: new Date().toISOString() });
  }),

  // ===== ORDERS =====
  // GET /stores/:storeId/orders
  http.get(`${BASE}/stores/:storeId/orders`, async ({ params, request }) => {
    await delay(300);
    const sp = getSearchParams(request);
    const page = parseInt(sp.get('page') ?? '1', 10);
    const limit = parseInt(sp.get('limit') ?? '20', 10);
    const status = sp.get('status');
    const search = sp.get('search')?.toLowerCase();

    let storeOrders = orders
      .filter((o) => o.store_id === params.storeId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (status) {
      storeOrders = storeOrders.filter((o) => o.status === status);
    }
    if (search) {
      storeOrders = storeOrders.filter(
        (o) => o.order_number.toLowerCase().includes(search) || o.id.toLowerCase().includes(search),
      );
    }

    return paginatedWrap(storeOrders, page, limit);
  }),

  // PATCH /orders/:orderId/status
  http.patch(`${BASE}/orders/:orderId/status`, async ({ params, request }) => {
    await delay(300);
    const order = orders.find((o) => o.id === params.orderId);
    if (!order) return errorResponse(404, 'NOT_FOUND', 'Order not found');
    const body = (await request.json()) as { status: string; reason?: string };
    return wrap({
      ...order,
      status: body.status,
      cancellation_reason: body.reason ?? order.cancellation_reason,
      updated_at: new Date().toISOString(),
    });
  }),

  // ===== PRODUCTS (vendor CRUD) =====
  // POST /stores/:storeId/products
  http.post(`${BASE}/stores/:storeId/products`, async ({ params, request }) => {
    await delay(400);
    const body = (await request.json()) as Record<string, unknown>;
    const newProduct = {
      id: `prod-${Date.now()}`,
      store_id: params.storeId,
      category_id: body.category_id ?? 'cat-001',
      name: body.name ?? 'New Product',
      slug: ((body.name as string) ?? 'new-product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: body.description ?? '',
      short_description: body.name ?? '',
      sku: `SKU-${Date.now()}`,
      barcode: null,
      brand: body.brand ?? null,
      unit_type: body.unit_type ?? 'piece',
      unit_value: body.unit_value ?? 1,
      base_price: body.base_price ?? 0,
      sale_price: body.sale_price ?? null,
      cost_price: body.cost_price ?? null,
      tax_rate: 0.12,
      is_taxable: true,
      weight_grams: body.weight_grams ?? 0,
      dimensions: null,
      is_active: body.is_active ?? true,
      is_featured: false,
      requires_prescription: false,
      is_perishable: body.is_perishable ?? false,
      shelf_life_days: body.shelf_life_days ?? null,
      nutritional_info: null,
      allergens: [],
      dietary_tags: [],
      rating_average: 0,
      rating_count: 0,
      total_sold: 0,
      images: [],
      variants: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(
      { success: true, data: newProduct, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // PATCH /products/:productId
  http.patch(`${BASE}/products/:productId`, async ({ params, request }) => {
    await delay(300);
    const product = products.find((p) => p.id === params.productId);
    if (!product) return errorResponse(404, 'NOT_FOUND', 'Product not found');
    const body = (await request.json()) as Record<string, unknown>;
    return wrap({ ...product, ...body, updated_at: new Date().toISOString() });
  }),

  // DELETE /products/:productId
  http.delete(`${BASE}/products/:productId`, async () => {
    await delay(200);
    return new HttpResponse(null, { status: 204 });
  }),

  // ===== CSV IMPORT =====
  // POST /catalog/products/import
  http.post(`${BASE}/catalog/products/import`, async () => {
    await delay(800);
    return wrap({
      total_rows: 10,
      successful: 8,
      failed: 2,
      errors: [
        { row: 4, field: 'category_id', message: 'Category ID must be a valid UUID' },
        { row: 7, field: 'base_price', message: 'Base price must be a non-negative number' },
      ],
    });
  }),

  // GET /catalog/products/import/template
  http.get(`${BASE}/catalog/products/import/template`, async () => {
    await delay(100);
    const csv = 'name,description,category_id,base_price,sale_price,sku,barcode,brand,unit_type,unit_value,cost_price,weight_grams,is_perishable,shelf_life_days,dietary_tags,allergens\nPancit Canton Original,Instant noodle stir-fry,<category-uuid>,12.50,,SKU-001,4800000000001,Lucky Me,pack,1,8.00,65,false,,noodles;instant,wheat;egg\n';
    return new HttpResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="product-import-template.csv"',
      },
    });
  }),

  // ===== VENDOR ANALYTICS =====
  // GET /orders/vendor/:storeId/analytics
  http.get(`${BASE}/orders/vendor/:storeId/analytics`, async () => {
    await delay(300);
    return wrap(vendorAnalyticsMock);
  }),

  // ===== INVENTORY =====
  // GET /stores/:storeId/inventory
  http.get(`${BASE}/stores/:storeId/inventory`, async ({ params, request }) => {
    await delay(250);
    const sp = getSearchParams(request);
    const page = parseInt(sp.get('page') ?? '1', 10);
    const limit = parseInt(sp.get('limit') ?? '20', 10);
    const search = sp.get('search')?.toLowerCase();
    const lowStockOnly = sp.get('lowStockOnly') === 'true';

    let storeProducts = productsByStore(params.storeId as string).map((p) => {
      const stock = Math.floor(Math.random() * 100);
      const reorderLevel = 10;
      return {
        product_id: p.id,
        product_name: p.name,
        product_image: p.images[0]?.thumbnail_url ?? null,
        sku: p.sku,
        stock_quantity: stock,
        reorder_level: reorderLevel,
        is_low_stock: stock <= reorderLevel,
        is_out_of_stock: stock === 0,
        unit_type: p.unit_type,
        last_restocked_at: '2026-02-25T10:00:00Z',
      };
    });

    if (search) {
      storeProducts = storeProducts.filter(
        (p) => p.product_name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search),
      );
    }
    if (lowStockOnly) {
      storeProducts = storeProducts.filter((p) => p.is_low_stock);
    }

    return paginatedWrap(storeProducts, page, limit);
  }),

  // POST /stores/:storeId/inventory/adjust
  http.post(`${BASE}/stores/:storeId/inventory/adjust`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as Record<string, unknown>;
    return wrap({
      product_id: body.product_id,
      adjustment: body.adjustment,
      new_quantity: Math.max(0, Math.floor(Math.random() * 100) + (body.adjustment as number ?? 0)),
      adjusted_at: new Date().toISOString(),
    });
  }),

  // ===== DASHBOARD =====
  // GET /stores/:storeId/dashboard
  http.get(`${BASE}/stores/:storeId/dashboard`, async () => {
    await delay(200);
    return wrap(vendorDashboard);
  }),

  // ===== FINANCIALS =====
  // GET /payments/settlements/summary
  http.get(`${BASE}/payments/settlements/summary`, async () => {
    await delay(200);
    return wrap(vendorFinancials.summary);
  }),

  // GET /payments/settlements
  http.get(`${BASE}/payments/settlements`, async ({ request }) => {
    await delay(300);
    const sp = getSearchParams(request);
    const page = parseInt(sp.get('page') ?? '1', 10);
    const limit = parseInt(sp.get('limit') ?? '10', 10);
    const status = sp.get('status');

    let settlements = [...vendorFinancials.settlements];
    if (status && status !== 'all') {
      settlements = settlements.filter((s) => s.status === status);
    }

    return paginatedWrap(settlements, page, limit);
  }),

  // GET /payments/settlements/:id — Vendor settlement detail with order breakdown
  http.get(`${BASE}/payments/settlements/:id`, async ({ params }) => {
    await delay(300);
    const settlement = vendorFinancials.settlements.find((s) => s.id === params.id);
    if (!settlement) return errorResponse(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    // Look up items from shared mock data; generate fallback items for vendor settlements
    const items = settlementItems[settlement.id] ?? [
      { id: `si-v-${settlement.id}-1`, settlement_id: settlement.id, order_id: 'ord-v-01', order_number: 'DAL-2026-V00101', subtotal: settlement.gross_amount * 0.4, commission_rate: 10, commission_amount: settlement.gross_amount * 0.04, net_amount: settlement.gross_amount * 0.36, delivered_at: settlement.period_start },
      { id: `si-v-${settlement.id}-2`, settlement_id: settlement.id, order_id: 'ord-v-02', order_number: 'DAL-2026-V00202', subtotal: settlement.gross_amount * 0.35, commission_rate: 10, commission_amount: settlement.gross_amount * 0.035, net_amount: settlement.gross_amount * 0.315, delivered_at: settlement.period_start },
      { id: `si-v-${settlement.id}-3`, settlement_id: settlement.id, order_id: 'ord-v-03', order_number: 'DAL-2026-V00303', subtotal: settlement.gross_amount * 0.25, commission_rate: 10, commission_amount: settlement.gross_amount * 0.025, net_amount: settlement.gross_amount * 0.225, delivered_at: settlement.period_end },
    ];
    return wrap({ ...settlement, items });
  }),

  // ===== VENDOR COUPONS =====
  // GET /orders/vendor/coupons
  http.get(`${BASE}/orders/vendor/coupons`, async ({ request }) => {
    await delay(250);
    const sp = getSearchParams(request);
    const page = parseInt(sp.get('page') ?? '1', 10);
    const limit = parseInt(sp.get('limit') ?? '10', 10);
    const search = sp.get('search')?.toLowerCase();
    const discountType = sp.get('discount_type');
    const isActive = sp.get('is_active');

    let coupons = [...vendorFinancials.vendorCoupons];

    if (search) {
      coupons = coupons.filter(
        (c) => c.code.toLowerCase().includes(search) || c.name.toLowerCase().includes(search),
      );
    }
    if (discountType) {
      coupons = coupons.filter((c) => c.discount_type === discountType);
    }
    if (isActive === 'true') {
      coupons = coupons.filter((c) => c.is_active);
    } else if (isActive === 'false') {
      coupons = coupons.filter((c) => !c.is_active);
    }

    return paginatedWrap(coupons, page, limit);
  }),

  // GET /orders/vendor/coupons/:id
  http.get(`${BASE}/orders/vendor/coupons/:id`, async ({ params }) => {
    await delay(200);
    const coupon = vendorFinancials.vendorCoupons.find((c) => c.id === params.id);
    if (!coupon) return errorResponse(404, 'NOT_FOUND', 'Coupon not found');
    return wrap(coupon);
  }),

  // POST /orders/vendor/coupons
  http.post(`${BASE}/orders/vendor/coupons`, async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as Record<string, unknown>;
    const newCoupon = {
      id: `vc-${Date.now()}`,
      code: ((body.code as string) ?? 'NEW').toUpperCase(),
      name: body.name ?? 'New Coupon',
      description: body.description ?? null,
      discount_type: body.discount_type ?? 'percentage',
      discount_value: body.discount_value ?? 0,
      minimum_order_value: body.minimum_order_value ?? 0,
      maximum_discount: body.maximum_discount ?? null,
      applicable_categories: body.applicable_categories ?? null,
      applicable_stores: ['vendor-001'],
      usage_limit: body.usage_limit ?? null,
      usage_count: 0,
      per_user_limit: body.per_user_limit ?? 1,
      is_first_order_only: body.is_first_order_only ?? false,
      valid_from: body.valid_from ?? new Date().toISOString(),
      valid_until: body.valid_until ?? new Date(Date.now() + 30 * 86400000).toISOString(),
      is_active: true,
      created_by: 'vendor-user-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(
      { success: true, data: newCoupon, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // PATCH /orders/vendor/coupons/:id
  http.patch(`${BASE}/orders/vendor/coupons/:id`, async ({ params, request }) => {
    await delay(300);
    const coupon = vendorFinancials.vendorCoupons.find((c) => c.id === params.id);
    if (!coupon) return errorResponse(404, 'NOT_FOUND', 'Coupon not found');
    const body = (await request.json()) as Record<string, unknown>;
    return wrap({ ...coupon, ...body, updated_at: new Date().toISOString() });
  }),

  // DELETE /orders/vendor/coupons/:id
  http.delete(`${BASE}/orders/vendor/coupons/:id`, async () => {
    await delay(200);
    return new HttpResponse(null, { status: 204 });
  }),
];
