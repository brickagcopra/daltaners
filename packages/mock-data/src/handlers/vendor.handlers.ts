import { http, delay, HttpResponse } from 'msw';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';
import { stores, orders, products, productsByStore, vendorDashboard, users } from '../data';
import { getCurrentUser } from './auth.handlers';

const BASE = '/api/v1';

function getVendorStore() {
  const user = getCurrentUser();
  if (!user) return null;
  const vendorId = (user as Record<string, unknown>).vendor_id as string | undefined;
  if (!vendorId) return null;
  return stores.find((s) => s.id === vendorId) ?? null;
}

export const vendorHandlers = [
  // ===== STORE =====
  // GET /vendor/store
  http.get(`${BASE}/vendor/store`, async () => {
    await delay(200);
    const store = getVendorStore();
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
  // GET /stores/:storeId/staff
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
      store_id: storeId,
      user_id: u.id,
      user: { id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email, avatar_url: u.avatar_url },
      role: u.role === 'vendor_owner' ? 'manager' : 'staff',
      permissions: u.role === 'vendor_owner'
        ? { manage_products: true, manage_orders: true, manage_staff: true, manage_settings: true }
        : { manage_products: true, manage_orders: true, manage_staff: false, manage_settings: false },
      is_active: true,
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
];
