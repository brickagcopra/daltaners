import { http, delay } from 'msw';
import { wrap, errorResponse, getSearchParams } from '../helpers';
import { stores } from '../data';

const BASE = '/api/v1';

export const storesHandlers = [
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
