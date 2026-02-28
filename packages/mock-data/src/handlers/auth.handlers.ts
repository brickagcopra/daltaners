import { http, delay } from 'msw';
import { wrap, errorResponse } from '../helpers';
import { users, credentials } from '../data';

const BASE = '/api/v1';

function makeTokens(userId: string) {
  return {
    access_token: `mock-access-${userId}-${Date.now()}`,
    refresh_token: `mock-refresh-${userId}-${Date.now()}`,
    expires_in: 900,
    token_type: 'Bearer',
  };
}

// Track "logged in" user per session
let currentUserId: string | null = 'u-cust-001';

export function setCurrentUser(userId: string | null) {
  currentUserId = userId;
}

export function getCurrentUser() {
  return users.find((u) => u.id === currentUserId) ?? null;
}

export const authHandlers = [
  // POST /auth/login
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { email?: string; phone?: string; password?: string };
    const email = body.email ?? '';
    const cred = credentials[email];

    if (!cred || cred.password !== body.password) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    currentUserId = cred.userId;
    const user = users.find((u) => u.id === cred.userId)!;
    const tokens = makeTokens(cred.userId);

    return wrap({ user, ...tokens });
  }),

  // POST /auth/vendor/login (vendor dashboard uses separate endpoint)
  http.post(`${BASE}/auth/vendor/login`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email ?? '';
    const cred = credentials[email];

    if (!cred || cred.password !== body.password) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const user = users.find((u) => u.id === cred.userId);
    if (!user || (user.role !== 'vendor_owner' && user.role !== 'vendor_staff')) {
      return errorResponse(403, 'FORBIDDEN', 'Only vendor accounts can log in here');
    }

    currentUserId = cred.userId;
    const tokens = makeTokens(cred.userId);

    return wrap({ user, ...tokens });
  }),

  // POST /auth/register
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as Record<string, string>;
    const newUser = {
      id: `u-new-${Date.now()}`,
      email: body.email,
      phone: body.phone ?? null,
      first_name: body.first_name,
      last_name: body.last_name,
      display_name: `${body.first_name} ${body.last_name?.[0] ?? ''}.`,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${body.first_name}`,
      role: 'customer',
      is_verified: false,
      is_active: true,
      gender: null,
      locale: 'en-PH',
      timezone: 'Asia/Manila',
      preferences: {},
      dietary_preferences: [],
      allergens: [],
      date_of_birth: null,
      mfa_enabled: false,
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    currentUserId = newUser.id;
    const tokens = makeTokens(newUser.id);
    return wrap({ user: newUser, ...tokens });
  }),

  // POST /auth/refresh
  http.post(`${BASE}/auth/refresh`, async () => {
    await delay(200);
    if (!currentUserId) {
      return errorResponse(401, 'TOKEN_EXPIRED', 'Refresh token is invalid or expired');
    }
    return wrap(makeTokens(currentUserId));
  }),

  // POST /auth/logout
  http.post(`${BASE}/auth/logout`, async () => {
    await delay(100);
    currentUserId = null;
    return wrap({ message: 'Logged out successfully' });
  }),

  // GET /auth/me
  http.get(`${BASE}/auth/me`, async () => {
    await delay(200);
    const user = getCurrentUser();
    if (!user) {
      return errorResponse(401, 'UNAUTHORIZED', 'Not authenticated');
    }
    return wrap(user);
  }),
];
