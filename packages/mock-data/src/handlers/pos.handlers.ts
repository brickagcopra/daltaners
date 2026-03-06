import { http, delay, HttpResponse } from 'msw';
import { wrap, paginatedWrap, cursorWrap, errorResponse, getSearchParams } from '../helpers';
import {
  posTerminals,
  posShifts,
  posTransactions,
  posCashMovements,
  posReceipts,
  posSalesSummary,
  posProductSales,
  posHourlySales,
  posPaymentBreakdown,
} from '../data/pos';
import { products, categories } from '../data';

const BASE = '/api/v1/pos';
const CATALOG_BASE = '/api/v1/catalog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

// Mutable copies for create/update operations
const terminals: Any[] = [...posTerminals];
const shifts: Any[] = [...posShifts];
const transactions: Any[] = [...posTransactions];
const cashMovements: Any[] = [...posCashMovements];

let txCounter = transactions.length + 1;

export const posHandlers = [
  // ── Terminals ──────────────────────────────────────────

  // List terminals by store
  http.get(`${BASE}/terminals/store/:storeId`, async ({ params, request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || 1);
    const limit = Number(sp.get('limit') || 20);
    const storeTerminals = terminals.filter((t) => t.store_id === params.storeId);
    return paginatedWrap(storeTerminals, page, limit);
  }),

  // Get terminal by ID
  http.get(`${BASE}/terminals/:id`, async ({ params }) => {
    await delay(150);
    const t = terminals.find((x) => x.id === params.id);
    if (!t) return errorResponse(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
    return wrap(t);
  }),

  // Create terminal
  http.post(`${BASE}/terminals`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as Record<string, unknown>;
    const dup = terminals.find((t) => t.terminal_code === body.terminal_code);
    if (dup) return errorResponse(409, 'DUPLICATE_CODE', 'Terminal code already exists');
    const newTerminal = {
      id: `term-${String(terminals.length + 1).padStart(3, '0')}`,
      store_id: body.store_id as string,
      name: body.name as string,
      terminal_code: body.terminal_code as string,
      status: 'active',
      hardware_config: (body.hardware_config as Record<string, unknown>) || null,
      last_heartbeat_at: null,
      ip_address: (body.ip_address as string) || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    terminals.push(newTerminal);
    return HttpResponse.json({ success: true, data: newTerminal, timestamp: new Date().toISOString() }, { status: 201 });
  }),

  // Update terminal
  http.patch(`${BASE}/terminals/:id`, async ({ params, request }) => {
    await delay(200);
    const idx = terminals.findIndex((t) => t.id === params.id);
    if (idx === -1) return errorResponse(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
    const body = (await request.json()) as Record<string, unknown>;
    terminals[idx] = { ...terminals[idx], ...body, updated_at: new Date().toISOString() };
    return wrap(terminals[idx]);
  }),

  // Delete terminal
  http.delete(`${BASE}/terminals/:id`, async ({ params }) => {
    await delay(200);
    const idx = terminals.findIndex((t) => t.id === params.id);
    if (idx === -1) return errorResponse(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
    terminals.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Heartbeat
  http.post(`${BASE}/terminals/:id/heartbeat`, async ({ params }) => {
    await delay(100);
    const t = terminals.find((x) => x.id === params.id);
    if (!t) return errorResponse(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
    t.last_heartbeat_at = new Date().toISOString();
    return wrap({ message: 'ok' });
  }),

  // ── Shifts ─────────────────────────────────────────────

  // Open shift
  http.post(`${BASE}/shifts/open`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as Record<string, unknown>;
    const terminal = terminals.find((t) => t.id === body.terminal_id);
    if (!terminal) return errorResponse(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
    const existingOpen = shifts.find((s) => s.terminal_id === body.terminal_id && s.status === 'open');
    if (existingOpen) return wrap(existingOpen);
    const newShift = {
      id: `shift-${String(shifts.length + 1).padStart(3, '0')}`,
      terminal_id: body.terminal_id as string,
      cashier_id: 'user-vendor-001',
      cashier_name: (body.cashier_name as string) || 'Aling Nena',
      status: 'open' as const,
      opening_cash: body.opening_cash as number,
      closing_cash: null,
      expected_cash: null,
      cash_difference: null,
      total_transactions: 0,
      total_sales: 0,
      total_refunds: 0,
      total_voids: 0,
      payment_totals: {},
      opened_at: new Date().toISOString(),
      closed_at: null,
      close_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    shifts.push(newShift);
    return HttpResponse.json({ success: true, data: newShift, timestamp: new Date().toISOString() }, { status: 201 });
  }),

  // List shifts by terminal
  http.get(`${BASE}/shifts/terminal/:terminalId`, async ({ params, request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || 1);
    const limit = Number(sp.get('limit') || 20);
    const filtered = shifts.filter((s) => s.terminal_id === params.terminalId);
    return paginatedWrap(filtered, page, limit);
  }),

  // List shifts by store
  http.get(`${BASE}/shifts/store/:storeId`, async ({ params, request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || 1);
    const limit = Number(sp.get('limit') || 20);
    const storeTerminalIds = terminals.filter((t) => t.store_id === params.storeId).map((t) => t.id);
    const filtered = shifts.filter((s) => storeTerminalIds.includes(s.terminal_id));
    return paginatedWrap(filtered, page, limit);
  }),

  // Get shift by ID
  http.get(`${BASE}/shifts/:id/summary`, async ({ params }) => {
    await delay(200);
    const s = shifts.find((x) => x.id === params.id);
    if (!s) return errorResponse(404, 'SHIFT_NOT_FOUND', 'Shift not found');
    const shiftTx = transactions.filter((t) => t.shift_id === s.id);
    const shiftCm = cashMovements.filter((c) => c.shift_id === s.id);
    return wrap({
      shift: s,
      transactions: shiftTx,
      cash_movements: shiftCm,
      summary: {
        total_transactions: shiftTx.length,
        total_sales: shiftTx.filter((t) => t.type === 'sale' && t.status === 'completed').reduce((sum, t) => sum + t.total, 0),
        total_refunds: shiftTx.filter((t) => t.type === 'refund').reduce((sum, t) => sum + t.total, 0),
        total_voided: shiftTx.filter((t) => t.status === 'voided').reduce((sum, t) => sum + t.total, 0),
      },
    });
  }),

  http.get(`${BASE}/shifts/:id`, async ({ params }) => {
    await delay(150);
    const s = shifts.find((x) => x.id === params.id);
    if (!s) return errorResponse(404, 'SHIFT_NOT_FOUND', 'Shift not found');
    return wrap(s);
  }),

  // Close shift
  http.post(`${BASE}/shifts/:id/close`, async ({ params, request }) => {
    await delay(300);
    const idx = shifts.findIndex((s) => s.id === params.id);
    if (idx === -1) return errorResponse(404, 'SHIFT_NOT_FOUND', 'Shift not found');
    if (shifts[idx].status !== 'open') return errorResponse(400, 'SHIFT_NOT_OPEN', 'Shift is not open');
    const body = (await request.json()) as Record<string, unknown>;
    const closingCash = body.closing_cash as number;
    const cashSales = (shifts[idx].payment_totals as Record<string, number>).cash || 0;
    const cashIn = cashMovements.filter((cm) => cm.shift_id === params.id && (cm.type === 'cash_in' || cm.type === 'float')).reduce((s, cm) => s + cm.amount, 0);
    const cashOut = cashMovements.filter((cm) => cm.shift_id === params.id && (cm.type === 'cash_out' || cm.type === 'pickup')).reduce((s, cm) => s + cm.amount, 0);
    const expected = shifts[idx].opening_cash + cashSales + cashIn - cashOut;
    shifts[idx] = {
      ...shifts[idx],
      status: 'closed',
      closing_cash: closingCash,
      expected_cash: expected,
      cash_difference: closingCash - expected,
      closed_at: new Date().toISOString(),
      close_notes: (body.close_notes as string) || null,
      updated_at: new Date().toISOString(),
    };
    return wrap(shifts[idx]);
  }),

  // ── Cash Movements ─────────────────────────────────────

  // Create cash movement
  http.post(`${BASE}/shifts/:shiftId/cash-movements`, async ({ params, request }) => {
    await delay(200);
    const shift = shifts.find((s) => s.id === params.shiftId);
    if (!shift) return errorResponse(404, 'SHIFT_NOT_FOUND', 'Shift not found');
    if (shift.status !== 'open') return errorResponse(400, 'SHIFT_NOT_OPEN', 'Shift is not open');
    const body = (await request.json()) as Record<string, unknown>;
    const cm = {
      id: `cm-${String(cashMovements.length + 1).padStart(3, '0')}`,
      shift_id: params.shiftId as string,
      type: body.type as string,
      amount: body.amount as number,
      reason: (body.reason as string) || null,
      performed_by: 'user-vendor-001',
      performed_by_name: 'Aling Nena',
      created_at: new Date().toISOString(),
    };
    cashMovements.push(cm);
    return HttpResponse.json({ success: true, data: cm, timestamp: new Date().toISOString() }, { status: 201 });
  }),

  // List cash movements
  http.get(`${BASE}/shifts/:shiftId/cash-movements`, async ({ params, request }) => {
    await delay(150);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || 1);
    const limit = Number(sp.get('limit') || 20);
    const filtered = cashMovements.filter((cm) => cm.shift_id === params.shiftId);
    return paginatedWrap(filtered, page, limit);
  }),

  // ── Transactions ───────────────────────────────────────

  // Create transaction
  http.post(`${BASE}/transactions`, async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as Record<string, unknown>;
    const shift = shifts.find((s) => s.id === body.shift_id);
    if (!shift) return errorResponse(404, 'SHIFT_NOT_FOUND', 'Shift not found');
    if (shift.status !== 'open') return errorResponse(400, 'SHIFT_NOT_OPEN', 'Shift is not open');

    const items = body.items as Array<Record<string, unknown>>;
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price as number) * (item.quantity as number), 0);
    const taxAmount = subtotal * 0.12;
    const discountAmount = (body.discount_amount as number) || 0;
    const total = subtotal + taxAmount - discountAmount;
    const amountTendered = (body.amount_tendered as number) || total;
    const changeAmount = Math.max(0, amountTendered - total);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const txNumber = `POS-${dateStr}-${String(txCounter++).padStart(6, '0')}`;

    const txItems = items.map((item, i) => ({
      id: `txi-gen-${Date.now()}-${i}`,
      transaction_id: `tx-gen-${Date.now()}`,
      product_id: item.product_id as string,
      product_name: item.product_name as string,
      barcode: (item.barcode as string) || null,
      sku: (item.sku as string) || null,
      unit_price: item.unit_price as number,
      quantity: item.quantity as number,
      tax_amount: (item.unit_price as number) * (item.quantity as number) * 0.12,
      discount_amount: (item.discount_amount as number) || 0,
      total: (item.unit_price as number) * (item.quantity as number),
    }));

    const tx = {
      id: `tx-gen-${Date.now()}`,
      transaction_number: txNumber,
      shift_id: body.shift_id as string,
      store_id: 'store-001',
      terminal_id: shift.terminal_id,
      cashier_id: shift.cashier_id,
      customer_id: (body.customer_id as string) || null,
      type: body.type as string,
      status: 'completed',
      subtotal,
      tax_amount: Math.round(taxAmount * 100) / 100,
      discount_amount: discountAmount,
      total: Math.round(total * 100) / 100,
      payment_method: body.payment_method as string,
      payment_details: (body.payment_details as Record<string, unknown>) || null,
      amount_tendered: Math.round(amountTendered * 100) / 100,
      change_amount: Math.round(changeAmount * 100) / 100,
      original_transaction_id: (body.original_transaction_id as string) || null,
      void_reason: null,
      refund_reason: (body.refund_reason as string) || null,
      idempotency_key: (body.idempotency_key as string) || null,
      loyalty_points_earned: Math.floor(total / 100),
      loyalty_points_redeemed: (body.loyalty_points_redeemed as number) || null,
      metadata: (body.metadata as Record<string, unknown>) || {},
      items: txItems,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    transactions.push(tx);

    // Update shift totals
    shift.total_transactions++;
    if (tx.type === 'sale') shift.total_sales += tx.total;
    if (tx.type === 'refund') shift.total_refunds += tx.total;
    const method = tx.payment_method as string;
    const pt = shift.payment_totals as Record<string, number>;
    pt[method] = (pt[method] || 0) + tx.total;

    return HttpResponse.json({ success: true, data: tx, timestamp: now.toISOString() }, { status: 201 });
  }),

  // List transactions by shift
  http.get(`${BASE}/transactions/shift/:shiftId`, async ({ params, request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || 1);
    const limit = Number(sp.get('limit') || 20);
    let filtered = transactions.filter((t) => t.shift_id === params.shiftId);
    const type = sp.get('type');
    if (type) filtered = filtered.filter((t) => t.type === type);
    const status = sp.get('status');
    if (status) filtered = filtered.filter((t) => t.status === status);
    return paginatedWrap(filtered, page, limit);
  }),

  // List transactions by store
  http.get(`${BASE}/transactions/store/:storeId`, async ({ params, request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || 1);
    const limit = Number(sp.get('limit') || 20);
    let filtered = transactions.filter((t) => t.store_id === params.storeId);
    const type = sp.get('type');
    if (type) filtered = filtered.filter((t) => t.type === type);
    const status = sp.get('status');
    if (status) filtered = filtered.filter((t) => t.status === status);
    return paginatedWrap(filtered, page, limit);
  }),

  // Get transaction by ID
  http.get(`${BASE}/transactions/:id/receipt`, async ({ params }) => {
    await delay(150);
    const r = posReceipts.find((x) => x.transaction_id === params.id);
    if (!r) return errorResponse(404, 'RECEIPT_NOT_FOUND', 'Receipt not found');
    return wrap(r);
  }),

  http.get(`${BASE}/transactions/:id`, async ({ params }) => {
    await delay(150);
    const t = transactions.find((x) => x.id === params.id);
    if (!t) return errorResponse(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    return wrap(t);
  }),

  // Void transaction
  http.post(`${BASE}/transactions/:id/void`, async ({ params, request }) => {
    await delay(300);
    const idx = transactions.findIndex((t) => t.id === params.id);
    if (idx === -1) return errorResponse(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    if (transactions[idx].status === 'voided') return errorResponse(400, 'ALREADY_VOIDED', 'Transaction already voided');
    const body = (await request.json()) as Record<string, unknown>;
    transactions[idx] = {
      ...transactions[idx],
      status: 'voided',
      void_reason: body.void_reason as string,
      updated_at: new Date().toISOString(),
    };
    return wrap(transactions[idx]);
  }),

  // ── Reports ────────────────────────────────────────────

  http.get(`${BASE}/reports/store/:storeId/sales-summary`, async () => {
    await delay(300);
    return wrap(posSalesSummary);
  }),

  http.get(`${BASE}/reports/store/:storeId/product-sales`, async () => {
    await delay(300);
    return wrap(posProductSales);
  }),

  http.get(`${BASE}/reports/store/:storeId/hourly-sales`, async () => {
    await delay(300);
    return wrap(posHourlySales);
  }),

  http.get(`${BASE}/reports/store/:storeId/cashier-performance`, async () => {
    await delay(300);
    return wrap([
      { cashier_id: 'user-vendor-001', cashier_name: 'Aling Nena', transactions: 12, total_sales: 8450.5, avg_transaction: 704.2 },
      { cashier_id: 'user-vendor-staff-001', cashier_name: 'Carlo Reyes', transactions: 5, total_sales: 3220.0, avg_transaction: 644.0 },
    ]);
  }),

  http.get(`${BASE}/reports/store/:storeId/payment-breakdown`, async () => {
    await delay(300);
    return wrap(posPaymentBreakdown);
  }),

  http.get(`${BASE}/reports/shift/:shiftId/summary`, async ({ params }) => {
    await delay(300);
    const s = shifts.find((x) => x.id === params.shiftId);
    if (!s) return errorResponse(404, 'SHIFT_NOT_FOUND', 'Shift not found');
    const shiftTx = transactions.filter((t) => t.shift_id === s.id);
    return wrap({
      shift: s,
      total_transactions: shiftTx.length,
      total_sales: shiftTx.filter((t) => t.type === 'sale' && t.status === 'completed').reduce((sum, t) => sum + t.total, 0),
      total_refunds: shiftTx.filter((t) => t.type === 'refund').reduce((sum, t) => sum + t.total, 0),
      total_voided: shiftTx.filter((t) => t.status === 'voided').reduce((sum, t) => sum + t.total, 0),
    });
  }),

  // ── Catalog aliases for POS (POS uses /catalog/* prefix) ──

  // GET /catalog/products — same logic as products handler
  http.get(`${CATALOG_BASE}/products`, async ({ request }) => {
    await delay(200);
    const params = getSearchParams(request);
    const cursor = params.get('cursor');
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const storeId = params.get('store_id');
    const search = params.get('search')?.toLowerCase();
    const categoryId = params.get('category_id');

    let filtered = [...products];
    if (storeId) filtered = filtered.filter((p) => p.store_id === storeId);
    if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
    if (categoryId) filtered = filtered.filter((p) => p.category_id === categoryId || p.category_id.startsWith(categoryId + '-'));

    return cursorWrap(filtered, cursor, limit);
  }),

  // GET /catalog/categories
  http.get(`${CATALOG_BASE}/categories`, async () => {
    await delay(150);
    return wrap(categories);
  }),
];
