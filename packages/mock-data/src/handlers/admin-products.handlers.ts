import { http, delay, HttpResponse } from 'msw';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';
import { products } from '../data';

const BASE = '/api/v1';

// Extended product type with admin fields layered on top of MockProduct
interface AdminProduct {
  [key: string]: unknown;
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  slug: string;
  sku: string;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // Admin-specific fields
  status: string;
  stock_quantity: number;
  category_name: string;
  store_name: string;
}

// Category ID → display name mapping for stats
const categoryNames: Record<string, string> = {
  'cat-fruits-vegetables': 'Fruits & Vegetables',
  'cat-meat-seafood': 'Meat & Seafood',
  'cat-snacks-canned': 'Snacks & Canned Goods',
  'cat-beverages': 'Beverages',
  'cat-dairy-eggs': 'Dairy & Eggs',
  'cat-rice-grains': 'Rice & Grains',
  'cat-condiments': 'Condiments & Sauces',
  'cat-personal-care': 'Personal Care',
  'cat-household': 'Household',
  'cat-baby': 'Baby Products',
};

const storeNames: Record<string, string> = {
  'store-001': 'Metro Mart Makati',
  'store-002': 'Fresh Greens BGC',
  'store-003': "Lola's Sari-Sari Store",
  'store-004': 'Drugstore Plus',
  'store-005': 'Kusina ni Nena',
  'store-006': 'Palengke Express QC',
  'store-007': 'Aling Nida Bakery',
};

// Build mutable admin products list from mock products
const productsList: AdminProduct[] = products.map((p, idx) => ({
  ...p,
  status: p.is_active ? 'active' : (idx % 7 === 0 ? 'pending_review' : 'draft'),
  stock_quantity: Math.floor(Math.random() * 200) + 5,
  category_name: categoryNames[p.category_id] ?? p.category_id,
  store_name: storeNames[p.store_id] ?? p.store_id,
}));

// Seed a few pending_review products for admin workflow demo
if (productsList.length > 2) productsList[1].status = 'pending_review';
if (productsList.length > 5) productsList[4].status = 'pending_review';
if (productsList.length > 8) productsList[7].status = 'draft';

const computeProductStats = () => {
  const total = productsList.length;
  const active = productsList.filter((p) => p.status === 'active').length;
  const draft = productsList.filter((p) => p.status === 'draft').length;
  const pending = productsList.filter((p) => p.status === 'pending_review').length;
  const outOfStock = productsList.filter((p) => p.stock_quantity <= 0).length;
  const featured = productsList.filter((p) => p.is_featured).length;
  const avgPrice =
    total > 0
      ? productsList.reduce((sum, p) => sum + (p.sale_price ?? p.base_price), 0) / total
      : 0;

  return {
    total,
    active,
    draft,
    pending,
    outOfStock,
    featured,
    avgPrice: Math.round(avgPrice * 100) / 100,
    byCategory: Object.entries(
      productsList.reduce(
        (acc, p) => {
          const cat = p.category_name;
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    ).map(([category, count]) => ({ category, count })),
  };
};

export const adminProductsHandlers = [
  // GET /admin/products — list all products with filters
  http.get(`${BASE}/admin/products`, async ({ request }) => {
    await delay(300);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const search = params.get('search')?.toLowerCase();
    const status = params.get('status');
    const storeId = params.get('store_id');
    const categoryId = params.get('category_id');
    const isFeatured = params.get('is_featured');
    const priceMin = params.get('price_min');
    const priceMax = params.get('price_max');

    let filtered = [...productsList];

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.slug.toLowerCase().includes(search) ||
          (p.sku && p.sku.toLowerCase().includes(search)),
      );
    }
    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }
    if (storeId) {
      filtered = filtered.filter((p) => p.store_id === storeId);
    }
    if (categoryId) {
      filtered = filtered.filter((p) => p.category_id === categoryId);
    }
    if (isFeatured === 'true') {
      filtered = filtered.filter((p) => p.is_featured);
    }
    if (priceMin) {
      const min = parseFloat(priceMin);
      filtered = filtered.filter((p) => (p.sale_price ?? p.base_price) >= min);
    }
    if (priceMax) {
      const max = parseFloat(priceMax);
      filtered = filtered.filter((p) => (p.sale_price ?? p.base_price) <= max);
    }

    // Sort by newest first
    filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /admin/products/stats — product statistics
  http.get(`${BASE}/admin/products/stats`, async () => {
    await delay(200);
    return wrap(computeProductStats());
  }),

  // GET /admin/products/:id — product detail
  http.get(`${BASE}/admin/products/:id`, async ({ params }) => {
    await delay(200);
    const product = productsList.find((p) => p.id === params.id);
    if (!product) return errorResponse(404, 'NOT_FOUND', 'Product not found');
    return wrap(product);
  }),

  // PATCH /admin/products/:id/approve — approve product listing
  http.patch(`${BASE}/admin/products/:id/approve`, async ({ params }) => {
    await delay(400);
    const idx = productsList.findIndex((p) => p.id === params.id);
    if (idx === -1) return errorResponse(404, 'NOT_FOUND', 'Product not found');
    productsList[idx] = {
      ...productsList[idx],
      status: 'active',
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    return wrap(productsList[idx]);
  }),

  // PATCH /admin/products/:id/reject — reject product listing
  http.patch(`${BASE}/admin/products/:id/reject`, async ({ params, request }) => {
    await delay(400);
    const idx = productsList.findIndex((p) => p.id === params.id);
    if (idx === -1) return errorResponse(404, 'NOT_FOUND', 'Product not found');
    const body = (await request.json()) as { reason?: string };
    productsList[idx] = {
      ...productsList[idx],
      status: 'rejected',
      is_active: false,
      rejection_reason: body.reason ?? null,
      updated_at: new Date().toISOString(),
    };
    return wrap(productsList[idx]);
  }),

  // PATCH /admin/products/:id/feature — toggle featured status
  http.patch(`${BASE}/admin/products/:id/feature`, async ({ params }) => {
    await delay(300);
    const idx = productsList.findIndex((p) => p.id === params.id);
    if (idx === -1) return errorResponse(404, 'NOT_FOUND', 'Product not found');
    productsList[idx] = {
      ...productsList[idx],
      is_featured: !productsList[idx].is_featured,
      updated_at: new Date().toISOString(),
    };
    return wrap(productsList[idx]);
  }),

  // DELETE /admin/products/:id — remove product
  http.delete(`${BASE}/admin/products/:id`, async ({ params }) => {
    await delay(300);
    const idx = productsList.findIndex((p) => p.id === params.id);
    if (idx === -1) return errorResponse(404, 'NOT_FOUND', 'Product not found');
    productsList.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /admin/products/bulk-action — bulk approve/reject/feature
  http.post(`${BASE}/admin/products/bulk-action`, async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as {
      product_ids: string[];
      action: 'approve' | 'reject' | 'feature' | 'unfeature';
    };
    const now = new Date().toISOString();
    let affected = 0;

    body.product_ids.forEach((id) => {
      const idx = productsList.findIndex((p) => p.id === id);
      if (idx === -1) return;
      switch (body.action) {
        case 'approve':
          productsList[idx] = { ...productsList[idx], status: 'active', is_active: true, updated_at: now };
          break;
        case 'reject':
          productsList[idx] = { ...productsList[idx], status: 'rejected', is_active: false, updated_at: now };
          break;
        case 'feature':
          productsList[idx] = { ...productsList[idx], is_featured: true, updated_at: now };
          break;
        case 'unfeature':
          productsList[idx] = { ...productsList[idx], is_featured: false, updated_at: now };
          break;
      }
      affected++;
    });

    return wrap({ affected, action: body.action });
  }),
];
