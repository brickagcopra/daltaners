import { http, delay } from 'msw';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';
import { stores } from '../data';

const BASE = '/api/v1';

export const storesHandlers = [
  // GET /stores — general listing with query-param filtering
  http.get(`${BASE}/stores`, async ({ request }) => {
    await delay(200);
    const params = getSearchParams(request);
    const category = params.get('category');
    const search = params.get('search')?.toLowerCase();
    const cuisine = params.get('cuisine')?.toLowerCase();
    const openNow = params.get('open_now');
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);

    let filtered = [...stores].filter((s) => s.status === 'active');

    if (category) {
      filtered = filtered.filter((s) => s.category === category);
    }
    if (search) {
      filtered = filtered.filter(
        (s) => s.name.toLowerCase().includes(search) || s.slug.toLowerCase().includes(search),
      );
    }
    if (cuisine) {
      filtered = filtered.filter((s) => {
        const meta = s.metadata as Record<string, unknown>;
        const cuisineType = (meta?.cuisine_type as string || '').toLowerCase();
        return cuisineType.includes(cuisine);
      });
    }
    if (openNow === 'true') {
      // For mock data, treat all active stores as open
      filtered = filtered.filter(() => true);
    }

    // Add distance for display
    const withDistance = filtered.map((s) => ({
      ...s,
      distance_km: +(Math.random() * 5 + 0.5).toFixed(1),
    }));

    return paginatedWrap(withDistance, page, limit);
  }),

  // GET /stores/nearby
  http.get(`${BASE}/stores/nearby`, async ({ request }) => {
    await delay(300);
    const params = getSearchParams(request);
    const limit = parseInt(params.get('limit') ?? '10', 10);

    // Return all stores sorted by rating, simulating "nearby"
    const nearby = [...stores]
      .filter((s) => s.status === 'active')
      .sort((a, b) => b.rating_average - a.rating_average)
      .slice(0, limit)
      .map((s) => ({
        ...s,
        distance_km: +(Math.random() * 5 + 0.5).toFixed(1),
      }));

    return wrap(nearby);
  }),

  // GET /stores/:slug
  http.get(`${BASE}/stores/:slug`, async ({ params }) => {
    await delay(200);
    const slug = params.slug as string;
    const store = stores.find((s) => s.slug === slug || s.id === slug);
    if (!store) {
      return errorResponse(404, 'NOT_FOUND', 'Store not found');
    }
    return wrap(store);
  }),
];
