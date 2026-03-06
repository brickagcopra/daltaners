import { http, HttpResponse, delay } from 'msw';
import { brands, computeBrandStats, MockBrand } from '../data/brands';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';

const BASE = '/api/v1';
let localBrands = [...brands];
let nextBrandId = localBrands.length + 1;

// ────────────────────────────────────────────────────
// Shared handler functions
// ────────────────────────────────────────────────────

function filterBrands(params: URLSearchParams): MockBrand[] {
  let filtered = [...localBrands];

  const search = params.get('search');
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((b) => b.name.toLowerCase().includes(q));
  }

  const status = params.get('status');
  if (status) {
    filtered = filtered.filter((b) => b.status === status);
  }

  const isFeatured = params.get('is_featured');
  if (isFeatured !== null && isFeatured !== '') {
    filtered = filtered.filter((b) => b.is_featured === (isFeatured === 'true'));
  }

  const country = params.get('country_of_origin');
  if (country) {
    filtered = filtered.filter((b) => b.country_of_origin === country);
  }

  const sortBy = params.get('sort_by') || 'name';
  const sortOrder = params.get('sort_order') || 'ASC';

  filtered.sort((a, b) => {
    const aVal = (a as any)[sortBy];
    const bVal = (b as any)[sortBy];
    if (aVal < bVal) return sortOrder === 'ASC' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'ASC' ? 1 : -1;
    return 0;
  });

  return filtered;
}

// ────────────────────────────────────────────────────
// Public endpoints: /api/v1/catalog/brands/*
// ────────────────────────────────────────────────────

async function handleGetActiveBrands() {
  await delay(150);
  const active = localBrands.filter((b) => b.status === 'active' || b.status === 'verified');
  return wrap(active);
}

async function handleGetFeaturedBrands() {
  await delay(100);
  const featured = localBrands.filter((b) => b.is_featured && b.status === 'active');
  return wrap(featured);
}

async function handleGetBrand(idOrSlug: string) {
  await delay(100);
  const brand = localBrands.find((b) => b.id === idOrSlug || b.slug === idOrSlug);
  if (!brand) return errorResponse(404, 'BRAND_NOT_FOUND', 'Brand not found');
  return wrap(brand);
}

// ────────────────────────────────────────────────────
// Admin endpoints: /api/v1/admin/brands/*
// ────────────────────────────────────────────────────

async function handleAdminListBrands(request: Request) {
  await delay(200);
  const params = getSearchParams(request);
  const filtered = filterBrands(params);
  const page = parseInt(params.get('page') || '1', 10);
  const limit = parseInt(params.get('limit') || '20', 10);
  return paginatedWrap(filtered, page, limit);
}

async function handleAdminGetBrandStats() {
  await delay(100);
  const stats = computeBrandStats();
  return wrap(stats);
}

async function handleAdminGetBrand(id: string) {
  await delay(100);
  const brand = localBrands.find((b) => b.id === id);
  if (!brand) return errorResponse(404, 'BRAND_NOT_FOUND', 'Brand not found');
  return wrap(brand);
}

async function handleAdminCreateBrand(request: Request) {
  await delay(300);
  const body = (await request.json()) as Record<string, unknown>;
  const name = (body.name as string) || 'New Brand';
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  const existing = localBrands.find((b) => b.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    return errorResponse(409, 'BRAND_EXISTS', `Brand "${name}" already exists`);
  }

  const newBrand: MockBrand = {
    id: `brand-${String(nextBrandId++).padStart(3, '0')}`,
    name,
    slug,
    description: (body.description as string) || null,
    logo_url: (body.logo_url as string) || null,
    banner_url: (body.banner_url as string) || null,
    website_url: (body.website_url as string) || null,
    country_of_origin: (body.country_of_origin as string) || null,
    status: 'pending',
    verified_at: null,
    verified_by: null,
    is_featured: false,
    product_count: 0,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localBrands.push(newBrand);

  return HttpResponse.json(
    { success: true, data: newBrand, timestamp: new Date().toISOString() },
    { status: 201 },
  );
}

async function handleAdminUpdateBrand(id: string, request: Request) {
  await delay(200);
  const brand = localBrands.find((b) => b.id === id);
  if (!brand) return errorResponse(404, 'BRAND_NOT_FOUND', 'Brand not found');
  const body = (await request.json()) as Record<string, unknown>;
  const updated = { ...brand, ...body, updated_at: new Date().toISOString() };
  if (body.name && body.name !== brand.name) {
    updated.slug = (body.name as string)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  }
  const idx = localBrands.findIndex((b) => b.id === id);
  localBrands[idx] = updated as MockBrand;
  return wrap(updated);
}

async function handleAdminVerifyBrand(id: string) {
  await delay(200);
  const brand = localBrands.find((b) => b.id === id);
  if (!brand) return errorResponse(404, 'BRAND_NOT_FOUND', 'Brand not found');
  if (brand.status !== 'pending') {
    return errorResponse(400, 'INVALID_STATUS', `Brand can only be verified from "pending" status`);
  }
  brand.status = 'verified';
  brand.verified_at = new Date().toISOString();
  brand.verified_by = 'u-admin-001';
  brand.updated_at = new Date().toISOString();
  return wrap(brand);
}

async function handleAdminActivateBrand(id: string) {
  await delay(200);
  const brand = localBrands.find((b) => b.id === id);
  if (!brand) return errorResponse(404, 'BRAND_NOT_FOUND', 'Brand not found');
  if (brand.status !== 'verified' && brand.status !== 'suspended') {
    return errorResponse(400, 'INVALID_STATUS', `Brand can only be activated from "verified" or "suspended" status`);
  }
  brand.status = 'active';
  brand.updated_at = new Date().toISOString();
  return wrap(brand);
}

async function handleAdminRejectBrand(id: string) {
  await delay(200);
  const brand = localBrands.find((b) => b.id === id);
  if (!brand) return errorResponse(404, 'BRAND_NOT_FOUND', 'Brand not found');
  if (brand.status !== 'pending') {
    return errorResponse(400, 'INVALID_STATUS', `Brand can only be rejected from "pending" status`);
  }
  brand.status = 'rejected';
  brand.updated_at = new Date().toISOString();
  return wrap(brand);
}

async function handleAdminSuspendBrand(id: string) {
  await delay(200);
  const brand = localBrands.find((b) => b.id === id);
  if (!brand) return errorResponse(404, 'BRAND_NOT_FOUND', 'Brand not found');
  if (brand.status !== 'active' && brand.status !== 'verified') {
    return errorResponse(400, 'INVALID_STATUS', `Brand can only be suspended from "active" or "verified" status`);
  }
  brand.status = 'suspended';
  brand.updated_at = new Date().toISOString();
  return wrap(brand);
}

async function handleAdminDeleteBrand(id: string) {
  await delay(200);
  const idx = localBrands.findIndex((b) => b.id === id);
  if (idx < 0) return errorResponse(404, 'BRAND_NOT_FOUND', 'Brand not found');
  if (localBrands[idx].product_count > 0) {
    return errorResponse(400, 'HAS_PRODUCTS', 'Cannot delete brand with linked products');
  }
  localBrands.splice(idx, 1);
  return new HttpResponse(null, { status: 204 });
}

// ────────────────────────────────────────────────────
// Export handlers with dual-path registration
// ────────────────────────────────────────────────────

export const brandsHandlers = [
  // Public endpoints — frontend path
  http.get(`${BASE}/brands`, handleGetActiveBrands),
  http.get(`${BASE}/brands/featured`, handleGetFeaturedBrands),
  http.get(`${BASE}/brands/:idOrSlug`, ({ params }) => handleGetBrand(params.idOrSlug as string)),

  // Public endpoints — backend path
  http.get(`${BASE}/catalog/brands`, handleGetActiveBrands),
  http.get(`${BASE}/catalog/brands/featured`, handleGetFeaturedBrands),
  http.get(`${BASE}/catalog/brands/:idOrSlug`, ({ params }) => handleGetBrand(params.idOrSlug as string)),

  // Admin endpoints
  http.get(`${BASE}/admin/brands`, ({ request }) => handleAdminListBrands(request)),
  http.get(`${BASE}/admin/brands/stats`, handleAdminGetBrandStats),
  http.get(`${BASE}/admin/brands/:id`, ({ params }) => handleAdminGetBrand(params.id as string)),
  http.post(`${BASE}/admin/brands`, ({ request }) => handleAdminCreateBrand(request)),
  http.patch(`${BASE}/admin/brands/:id`, ({ params, request }) => handleAdminUpdateBrand(params.id as string, request)),
  http.patch(`${BASE}/admin/brands/:id/verify`, ({ params }) => handleAdminVerifyBrand(params.id as string)),
  http.patch(`${BASE}/admin/brands/:id/activate`, ({ params }) => handleAdminActivateBrand(params.id as string)),
  http.patch(`${BASE}/admin/brands/:id/reject`, ({ params }) => handleAdminRejectBrand(params.id as string)),
  http.patch(`${BASE}/admin/brands/:id/suspend`, ({ params }) => handleAdminSuspendBrand(params.id as string)),
  http.delete(`${BASE}/admin/brands/:id`, ({ params }) => handleAdminDeleteBrand(params.id as string)),
];
