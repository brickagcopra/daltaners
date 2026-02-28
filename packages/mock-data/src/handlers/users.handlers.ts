import { http, delay, HttpResponse } from 'msw';
import { wrap, errorResponse } from '../helpers';
import { addresses } from '../data';
import { getCurrentUser } from './auth.handlers';

const BASE = '/api/v1';

export const usersHandlers = [
  // GET /users/me
  http.get(`${BASE}/users/me`, async () => {
    await delay(200);
    const user = getCurrentUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Not authenticated');
    return wrap(user);
  }),

  // PATCH /users/me
  http.patch(`${BASE}/users/me`, async ({ request }) => {
    await delay(300);
    const user = getCurrentUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Not authenticated');

    const body = (await request.json()) as Record<string, unknown>;
    return wrap({
      ...user,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // GET /users/me/addresses
  http.get(`${BASE}/users/me/addresses`, async () => {
    await delay(200);
    const user = getCurrentUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Not authenticated');

    const userAddresses = addresses.filter((a) => a.user_id === user.id);
    return wrap(userAddresses);
  }),

  // POST /users/me/addresses
  http.post(`${BASE}/users/me/addresses`, async ({ request }) => {
    await delay(300);
    const user = getCurrentUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Not authenticated');

    const body = (await request.json()) as Record<string, unknown>;
    const newAddress = {
      id: `addr-${Date.now()}`,
      user_id: user.id,
      label: body.label ?? 'New Address',
      address_line1: body.address_line1 ?? '',
      address_line2: body.address_line2 ?? null,
      barangay: body.barangay ?? '',
      city: body.city ?? '',
      province: body.province ?? '',
      region: body.region ?? 'NCR',
      postal_code: body.postal_code ?? '',
      country: 'PH',
      latitude: body.latitude ?? 14.5547,
      longitude: body.longitude ?? 121.0244,
      is_default: body.is_default ?? false,
      delivery_instructions: body.delivery_instructions ?? null,
      created_at: new Date().toISOString(),
    };

    return HttpResponse.json(
      { success: true, data: newAddress, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // DELETE /users/me/addresses/:id
  http.delete(`${BASE}/users/me/addresses/:id`, async () => {
    await delay(200);
    return new HttpResponse(null, { status: 204 });
  }),
];
