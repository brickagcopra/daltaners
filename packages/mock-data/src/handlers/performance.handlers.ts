import { http, delay } from 'msw';
import {
  performanceMetrics,
  performanceBenchmarks,
  generatePerformanceHistory,
} from '../data/performance';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';

const BASE = '/api/v1';

// Current vendor's store ID (first store in mock data)
const CURRENT_VENDOR_STORE_ID = 'store-001';

// ============================================================
// Vendor endpoints: /api/v1/vendors/performance/*
// ============================================================

async function handleGetMyPerformance() {
  await delay(200);
  const metrics = performanceMetrics.find((m) => m.store_id === CURRENT_VENDOR_STORE_ID);
  if (!metrics) return errorResponse(404, 'NOT_FOUND', 'Performance metrics not found');
  return wrap(metrics);
}

async function handleGetMyHistory(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const days = parseInt(sp.get('days') || '30', 10);
  const history = generatePerformanceHistory(CURRENT_VENDOR_STORE_ID);
  const sliced = history.slice(-days);
  return wrap(sliced);
}

async function handleGetBenchmarks() {
  await delay(200);
  return wrap(performanceBenchmarks);
}

// ============================================================
// Admin endpoints: /api/v1/vendors/admin/performance/*
// ============================================================

async function handleAdminListPerformance(request: Request) {
  await delay(300);
  const sp = getSearchParams(request);
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = parseInt(sp.get('limit') || '20', 10);
  const search = sp.get('search') || '';
  const tier = sp.get('tier') || '';
  const category = sp.get('category') || '';
  const sortBy = sp.get('sort_by') || 'performance_score';
  const sortOrder = sp.get('sort_order') || 'DESC';
  const minScore = sp.get('min_score') ? parseFloat(sp.get('min_score')!) : undefined;
  const maxScore = sp.get('max_score') ? parseFloat(sp.get('max_score')!) : undefined;

  let filtered = [...performanceMetrics];

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((m) => m.store_name?.toLowerCase().includes(q));
  }
  if (tier) {
    filtered = filtered.filter((m) => m.performance_tier === tier);
  }
  if (category) {
    filtered = filtered.filter((m) => m.store_category === category);
  }
  if (minScore !== undefined) {
    filtered = filtered.filter((m) => m.performance_score >= minScore);
  }
  if (maxScore !== undefined) {
    filtered = filtered.filter((m) => m.performance_score <= maxScore);
  }

  // Sort
  const sortField = sortBy as keyof typeof filtered[0];
  filtered.sort((a, b) => {
    const aVal = (a as unknown as Record<string, number>)[sortField];
    const bVal = (b as unknown as Record<string, number>)[sortField];
    return sortOrder === 'ASC' ? aVal - bVal : bVal - aVal;
  });

  return paginatedWrap(filtered, page, limit);
}

async function handleAdminGetStorePerformance(request: Request) {
  await delay(200);
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const storeId = parts[parts.indexOf('stores') + 1];

  const metrics = performanceMetrics.find((m) => m.store_id === storeId);
  if (!metrics) return errorResponse(404, 'NOT_FOUND', 'Performance metrics not found');
  return wrap(metrics);
}

async function handleAdminGetStoreHistory(request: Request) {
  await delay(200);
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const storeId = parts[parts.indexOf('stores') + 1];
  const sp = getSearchParams(request);
  const days = parseInt(sp.get('days') || '30', 10);

  const history = generatePerformanceHistory(storeId);
  const sliced = history.slice(-days);
  return wrap(sliced);
}

async function handleAdminGetTopPerformers(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const limit = parseInt(sp.get('limit') || '10', 10);

  const sorted = [...performanceMetrics]
    .filter((m) => m.performance_tier !== 'unrated')
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, limit);

  return wrap(sorted);
}

async function handleAdminGetBottomPerformers(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const limit = parseInt(sp.get('limit') || '10', 10);

  const sorted = [...performanceMetrics]
    .filter((m) => m.performance_tier !== 'unrated')
    .sort((a, b) => a.performance_score - b.performance_score)
    .slice(0, limit);

  return wrap(sorted);
}

async function handleAdminRecalculate() {
  await delay(1000);
  return wrap({ stores_processed: performanceMetrics.length });
}

async function handleAdminRecalculateStore(request: Request) {
  await delay(500);
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const storeId = parts[parts.indexOf('stores') + 1];

  const metrics = performanceMetrics.find((m) => m.store_id === storeId);
  if (!metrics) return errorResponse(404, 'NOT_FOUND', 'Store not found');
  return wrap({ ...metrics, calculated_at: new Date().toISOString() });
}

// ============================================================
// Export handlers
// ============================================================

export const performanceHandlers = [
  // Vendor endpoints
  http.get(`${BASE}/vendors/performance/me`, () => handleGetMyPerformance()),
  http.get(`${BASE}/vendors/performance/me/history`, ({ request }) => handleGetMyHistory(request)),
  http.get(`${BASE}/vendors/performance/me/benchmarks`, () => handleGetBenchmarks()),

  // Also register on /api/v1/stores/performance/* for frontend convenience
  http.get(`${BASE}/stores/performance/me`, () => handleGetMyPerformance()),
  http.get(`${BASE}/stores/performance/me/history`, ({ request }) => handleGetMyHistory(request)),
  http.get(`${BASE}/stores/performance/me/benchmarks`, () => handleGetBenchmarks()),

  // Admin endpoints
  http.get(`${BASE}/vendors/admin/performance`, ({ request }) => handleAdminListPerformance(request)),
  http.get(`${BASE}/vendors/admin/performance/benchmarks`, () => handleGetBenchmarks()),
  http.get(`${BASE}/vendors/admin/performance/top`, ({ request }) => handleAdminGetTopPerformers(request)),
  http.get(`${BASE}/vendors/admin/performance/bottom`, ({ request }) => handleAdminGetBottomPerformers(request)),
  http.get(`${BASE}/vendors/admin/performance/stores/:id`, ({ request }) => handleAdminGetStorePerformance(request)),
  http.get(`${BASE}/vendors/admin/performance/stores/:id/history`, ({ request }) => handleAdminGetStoreHistory(request)),
  http.post(`${BASE}/vendors/admin/performance/recalculate`, () => handleAdminRecalculate()),
  http.post(`${BASE}/vendors/admin/performance/stores/:id/recalculate`, ({ request }) => handleAdminRecalculateStore(request)),

  // Also register admin endpoints under /admin path for frontend routing
  http.get(`${BASE}/admin/performance`, ({ request }) => handleAdminListPerformance(request)),
  http.get(`${BASE}/admin/performance/benchmarks`, () => handleGetBenchmarks()),
  http.get(`${BASE}/admin/performance/top`, ({ request }) => handleAdminGetTopPerformers(request)),
  http.get(`${BASE}/admin/performance/bottom`, ({ request }) => handleAdminGetBottomPerformers(request)),
  http.get(`${BASE}/admin/performance/stores/:id`, ({ request }) => handleAdminGetStorePerformance(request)),
  http.get(`${BASE}/admin/performance/stores/:id/history`, ({ request }) => handleAdminGetStoreHistory(request)),
  http.post(`${BASE}/admin/performance/recalculate`, () => handleAdminRecalculate()),
  http.post(`${BASE}/admin/performance/stores/:id/recalculate`, ({ request }) => handleAdminRecalculateStore(request)),
];
