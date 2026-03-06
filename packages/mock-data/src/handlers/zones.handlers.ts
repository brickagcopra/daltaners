import { http, HttpResponse } from 'msw';
import { zones } from '../data/zones';

export const zonesHandlers = [
  // GET /api/v1/zones/cities — distinct cities
  http.get('*/api/v1/zones/cities', () => {
    const cities = [...new Set(zones.map((z) => z.city))];
    return HttpResponse.json({
      success: true,
      data: cities,
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /api/v1/zones/by-city/:city — zones for a city
  http.get('*/api/v1/zones/by-city/:city', ({ params }) => {
    const city = decodeURIComponent(params.city as string);
    const cityZones = zones.filter(
      (z) => z.city.toLowerCase() === city.toLowerCase() || z.province.toLowerCase() === city.toLowerCase(),
    );
    return HttpResponse.json({
      success: true,
      data: cityZones,
      meta: { total: cityZones.length },
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /api/v1/zones — paginated zone list
  http.get('*/api/v1/zones', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const limit = Number(url.searchParams.get('limit') || '20');
    const city = url.searchParams.get('city');

    let filtered = zones;
    if (city && city !== 'all') {
      filtered = zones.filter(
        (z) => z.city.toLowerCase() === city.toLowerCase() || z.province.toLowerCase() === city.toLowerCase(),
      );
    }

    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return HttpResponse.json({
      success: true,
      data: paged,
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
      timestamp: new Date().toISOString(),
    });
  }),

  // POST /api/v1/zones/delivery-fee — calculate delivery fee
  http.post('*/api/v1/zones/delivery-fee', async ({ request }) => {
    const body = (await request.json()) as {
      origin_lat?: number;
      origin_lng?: number;
      destination_lat?: number;
      destination_lng?: number;
      delivery_type?: string;
    };
    const deliveryType = body.delivery_type || 'standard';

    const baseFees: Record<string, number> = {
      standard: 49,
      express: 79,
      instant: 99,
      scheduled: 39,
    };

    return HttpResponse.json({
      success: true,
      data: {
        delivery_fee: baseFees[deliveryType] ?? 49,
        zone_name: 'Mock Zone',
        surge_multiplier: 1.0,
        estimated_minutes: deliveryType === 'instant' ? 15 : deliveryType === 'express' ? 25 : 40,
      },
      timestamp: new Date().toISOString(),
    });
  }),
];
