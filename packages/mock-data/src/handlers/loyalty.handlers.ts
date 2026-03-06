import { http, HttpResponse } from 'msw';
import { loyaltyAccount, loyaltyTransactions, adminLoyaltyAccounts, adminLoyaltyStats } from '../data/loyalty';

export const loyaltyHandlers = [
  // GET /api/v1/loyalty/account — Get my loyalty account
  http.get('/api/v1/loyalty/account', () => {
    return HttpResponse.json({
      success: true,
      data: loyaltyAccount,
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /api/v1/loyalty/transactions — Get my loyalty transactions
  http.get('/api/v1/loyalty/transactions', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const type = url.searchParams.get('type');

    let filtered = loyaltyTransactions;
    if (type) {
      filtered = loyaltyTransactions.filter((t) => t.type === type);
    }

    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return HttpResponse.json({
      success: true,
      data: {
        items,
        meta: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      },
      timestamp: new Date().toISOString(),
    });
  }),

  // POST /api/v1/loyalty/redeem — Redeem points
  http.post('/api/v1/loyalty/redeem', async ({ request }) => {
    const body = (await request.json()) as { points: number; order_id?: string };

    if (body.points > loyaltyAccount.points_balance) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `Insufficient points. Available: ${loyaltyAccount.points_balance}, Requested: ${body.points}`,
            details: [],
            statusCode: 400,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const phpDiscount = body.points * 0.5;
    const newBalance = loyaltyAccount.points_balance - body.points;

    return HttpResponse.json({
      success: true,
      data: {
        points_redeemed: body.points,
        php_discount: phpDiscount,
        new_balance: newBalance,
        transaction_id: crypto.randomUUID(),
      },
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Admin Endpoints ──────────────────────────────────────────────────

  // GET /api/v1/loyalty/admin/accounts
  http.get('/api/v1/loyalty/admin/accounts', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const tier = url.searchParams.get('tier');
    const search = url.searchParams.get('search');

    let filtered = adminLoyaltyAccounts;
    if (tier) {
      filtered = filtered.filter((a) => a.tier === tier);
    }
    if (search) {
      filtered = filtered.filter(
        (a) => a.user_id.includes(search) || a.id.includes(search),
      );
    }

    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return HttpResponse.json({
      success: true,
      data: {
        items,
        meta: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      },
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /api/v1/loyalty/admin/stats
  http.get('/api/v1/loyalty/admin/stats', () => {
    return HttpResponse.json({
      success: true,
      data: adminLoyaltyStats,
      timestamp: new Date().toISOString(),
    });
  }),

  // POST /api/v1/loyalty/admin/accounts/:id/adjust
  http.post('/api/v1/loyalty/admin/accounts/:id/adjust', async ({ request, params }) => {
    const body = (await request.json()) as { points: number; reason: string };
    const account = adminLoyaltyAccounts.find((a) => a.id === params.id);

    if (!account) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Loyalty account ${params.id} not found`,
            details: [],
            statusCode: 404,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        ...account,
        points_balance: account.points_balance + body.points,
        lifetime_points: body.points > 0 ? account.lifetime_points + body.points : account.lifetime_points,
      },
      timestamp: new Date().toISOString(),
    });
  }),
];
