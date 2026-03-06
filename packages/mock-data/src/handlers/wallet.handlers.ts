import { http, HttpResponse } from 'msw';
import { walletBalance, walletTransactions } from '../data/loyalty';

export const walletHandlers = [
  // GET /api/v1/payments/wallet — Get wallet balance
  http.get('/api/v1/payments/wallet', () => {
    return HttpResponse.json({
      success: true,
      data: walletBalance,
      timestamp: new Date().toISOString(),
    });
  }),

  // POST /api/v1/payments/wallet/topup — Top up wallet
  http.post('/api/v1/payments/wallet/topup', async ({ request }) => {
    const body = (await request.json()) as { amount: number };
    const newBalance = walletBalance.balance + (body.amount || 0);

    return HttpResponse.json({
      success: true,
      data: {
        ...walletBalance,
        balance: newBalance,
      },
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /api/v1/payments/wallet/transactions — Get wallet transactions
  http.get('/api/v1/payments/wallet/transactions', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const start = (page - 1) * limit;
    const items = walletTransactions.slice(start, start + limit);

    return HttpResponse.json({
      success: true,
      data: {
        items,
        meta: {
          page,
          limit,
          total: walletTransactions.length,
          totalPages: Math.ceil(walletTransactions.length / limit),
        },
      },
      timestamp: new Date().toISOString(),
    });
  }),
];
