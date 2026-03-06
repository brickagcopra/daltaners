import { http, HttpResponse, delay } from 'msw';
import { returnRequests, computeReturnStats, MockReturnRequest } from '../data/returns';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';

const BASE = '/api/v1';
let localReturns = [...returnRequests];
let nextRetId = localReturns.length + 1;

// ============================================================
// Customer endpoints: /api/v1/returns/*
// ============================================================

// POST /returns — create return request
async function handleCreateReturn(request: Request) {
  await delay(300);
  const body = (await request.json()) as Record<string, unknown>;

  const orderId = body.order_id as string;
  if (!orderId) {
    return errorResponse(400, 'VALIDATION_ERROR', 'order_id is required');
  }

  const items = (body.items as Array<Record<string, unknown>>) || [];
  if (items.length === 0) {
    return errorResponse(400, 'VALIDATION_ERROR', 'At least one item is required');
  }

  const returnItems = items.map((item, idx) => {
    const unitPrice = 100 + idx * 25;
    const qty = (item.quantity as number) || 1;
    return {
      id: `ret-item-new-${nextRetId}-${idx}`,
      return_request_id: `ret-new-${nextRetId}`,
      order_item_id: item.order_item_id as string,
      product_id: null,
      product_name: `Product Item ${idx + 1}`,
      quantity: qty,
      unit_price: unitPrice,
      refund_amount: unitPrice * qty,
      condition: (item.condition as MockReturnRequest['items'][0]['condition']) || 'unknown',
      restockable: false,
      inventory_adjusted: false,
    };
  });

  const totalRefund = returnItems.reduce((sum, i) => sum + i.refund_amount, 0);

  const newReturn: MockReturnRequest = {
    id: `ret-new-${nextRetId}`,
    order_id: orderId,
    customer_id: 'u-cust-001',
    store_id: 'store-001',
    request_number: `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(nextRetId).padStart(3, '0')}`,
    status: 'pending',
    reason_category: (body.reason_category as MockReturnRequest['reason_category']) || 'other',
    reason_details: (body.reason_details as string) || null,
    evidence_urls: (body.evidence_urls as string[]) || [],
    requested_resolution: (body.requested_resolution as MockReturnRequest['requested_resolution']) || 'refund',
    refund_amount: totalRefund,
    vendor_response: null,
    vendor_responded_at: null,
    admin_notes: null,
    items: returnItems,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  nextRetId++;
  localReturns.unshift(newReturn);

  return HttpResponse.json(
    { success: true, data: newReturn, timestamp: new Date().toISOString() },
    { status: 201 },
  );
}

// GET /returns/my — list customer's return requests (offset paginated)
async function handleMyReturns(request: Request) {
  await delay(200);
  const params = getSearchParams(request);
  const page = parseInt(params.get('page') || '1', 10);
  const limit = parseInt(params.get('limit') || '20', 10);
  const status = params.get('status');
  const reason_category = params.get('reason_category');
  const date_from = params.get('date_from');
  const date_to = params.get('date_to');

  // Filter to current customer
  let filtered = localReturns.filter((r) => r.customer_id === 'u-cust-001');

  if (status) filtered = filtered.filter((r) => r.status === status);
  if (reason_category) filtered = filtered.filter((r) => r.reason_category === reason_category);
  if (date_from) filtered = filtered.filter((r) => r.created_at >= date_from);
  if (date_to) filtered = filtered.filter((r) => r.created_at <= date_to);

  // Sort by created_at descending
  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return paginatedWrap(filtered, page, limit);
}

// GET /returns/:id — get return request detail
async function handleGetReturn(id: string | readonly string[] | undefined) {
  await delay(150);
  const ret = localReturns.find((r) => r.id === id);
  if (!ret) return errorResponse(404, 'RETURN_NOT_FOUND', 'Return request not found');
  return wrap(ret);
}

// PATCH /returns/:id/cancel — cancel pending return
async function handleCancelReturn(id: string | readonly string[] | undefined) {
  await delay(200);
  const ret = localReturns.find((r) => r.id === id);
  if (!ret) return errorResponse(404, 'RETURN_NOT_FOUND', 'Return request not found');
  if (ret.status !== 'pending') {
    return errorResponse(400, 'INVALID_STATUS', 'Only pending returns can be cancelled');
  }
  ret.status = 'cancelled';
  ret.updated_at = new Date().toISOString();
  return wrap(ret);
}

// ============================================================
// Vendor endpoints: /api/v1/vendor/returns/*
// ============================================================

// GET /vendor/returns — list returns for vendor's store
async function handleVendorReturns(request: Request) {
  await delay(200);
  const params = getSearchParams(request);
  const page = parseInt(params.get('page') || '1', 10);
  const limit = parseInt(params.get('limit') || '20', 10);
  const status = params.get('status');
  const reason_category = params.get('reason_category');

  // Mock: vendor owns store-001 and store-005
  let filtered = localReturns.filter((r) => ['store-001', 'store-005'].includes(r.store_id));

  if (status) filtered = filtered.filter((r) => r.status === status);
  if (reason_category) filtered = filtered.filter((r) => r.reason_category === reason_category);

  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return paginatedWrap(filtered, page, limit);
}

// PATCH /vendor/returns/:id/approve
async function handleVendorApprove(id: string | readonly string[] | undefined, request: Request) {
  await delay(250);
  const ret = localReturns.find((r) => r.id === id);
  if (!ret) return errorResponse(404, 'RETURN_NOT_FOUND', 'Return request not found');
  if (ret.status !== 'pending' && ret.status !== 'escalated') {
    return errorResponse(400, 'INVALID_STATUS', 'Return request cannot be approved in current status');
  }

  const body = (await request.json()) as Record<string, unknown>;
  ret.status = 'approved';
  ret.vendor_response = (body.vendor_response as string) || null;
  ret.vendor_responded_at = new Date().toISOString();
  if (body.refund_amount !== undefined) ret.refund_amount = body.refund_amount as number;
  ret.updated_at = new Date().toISOString();

  return wrap(ret);
}

// PATCH /vendor/returns/:id/deny
async function handleVendorDeny(id: string | readonly string[] | undefined, request: Request) {
  await delay(250);
  const ret = localReturns.find((r) => r.id === id);
  if (!ret) return errorResponse(404, 'RETURN_NOT_FOUND', 'Return request not found');
  if (ret.status !== 'pending') {
    return errorResponse(400, 'INVALID_STATUS', 'Return request cannot be denied in current status');
  }

  const body = (await request.json()) as Record<string, unknown>;
  if (!body.vendor_response) {
    return errorResponse(400, 'VALIDATION_ERROR', 'vendor_response is required when denying');
  }

  ret.status = 'denied';
  ret.vendor_response = body.vendor_response as string;
  ret.vendor_responded_at = new Date().toISOString();
  ret.updated_at = new Date().toISOString();

  return wrap(ret);
}

// PATCH /vendor/returns/:id/received
async function handleVendorReceived(id: string | readonly string[] | undefined, request: Request) {
  await delay(250);
  const ret = localReturns.find((r) => r.id === id);
  if (!ret) return errorResponse(404, 'RETURN_NOT_FOUND', 'Return request not found');
  if (ret.status !== 'approved') {
    return errorResponse(400, 'INVALID_STATUS', 'Only approved returns can be marked as received');
  }

  const body = (await request.json()) as Record<string, unknown>;
  ret.status = 'received';
  if (body.vendor_response) ret.vendor_response = body.vendor_response as string;
  ret.updated_at = new Date().toISOString();

  return wrap(ret);
}

// ============================================================
// Admin endpoints: /api/v1/admin/returns/*
// ============================================================

// GET /admin/returns — list all returns with advanced filters
async function handleAdminReturns(request: Request) {
  await delay(200);
  const params = getSearchParams(request);
  const page = parseInt(params.get('page') || '1', 10);
  const limit = parseInt(params.get('limit') || '20', 10);
  const status = params.get('status');
  const reason_category = params.get('reason_category');
  const search = params.get('search')?.toLowerCase();
  const store_id = params.get('store_id');
  const customer_id = params.get('customer_id');
  const date_from = params.get('date_from');
  const date_to = params.get('date_to');

  let filtered = [...localReturns];

  if (status) filtered = filtered.filter((r) => r.status === status);
  if (reason_category) filtered = filtered.filter((r) => r.reason_category === reason_category);
  if (store_id) filtered = filtered.filter((r) => r.store_id === store_id);
  if (customer_id) filtered = filtered.filter((r) => r.customer_id === customer_id);
  if (date_from) filtered = filtered.filter((r) => r.created_at >= date_from);
  if (date_to) filtered = filtered.filter((r) => r.created_at <= date_to);
  if (search) {
    filtered = filtered.filter(
      (r) =>
        r.request_number.toLowerCase().includes(search) ||
        r.order_id.toLowerCase().includes(search) ||
        r.reason_details?.toLowerCase().includes(search),
    );
  }

  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return paginatedWrap(filtered, page, limit);
}

// GET /admin/returns/stats
async function handleAdminStats(request: Request) {
  await delay(150);
  const params = getSearchParams(request);
  const date_from = params.get('date_from');
  const date_to = params.get('date_to');

  let filtered = [...localReturns];
  if (date_from) filtered = filtered.filter((r) => r.created_at >= date_from);
  if (date_to) filtered = filtered.filter((r) => r.created_at <= date_to);

  return wrap(computeReturnStats(filtered));
}

// PATCH /admin/returns/:id/escalate
async function handleAdminEscalate(id: string | readonly string[] | undefined, request: Request) {
  await delay(250);
  const ret = localReturns.find((r) => r.id === id);
  if (!ret) return errorResponse(404, 'RETURN_NOT_FOUND', 'Return request not found');

  const body = (await request.json()) as Record<string, unknown>;
  ret.status = 'escalated';
  if (body.admin_notes) ret.admin_notes = body.admin_notes as string;
  if (body.refund_amount !== undefined) ret.refund_amount = body.refund_amount as number;
  ret.updated_at = new Date().toISOString();

  return wrap(ret);
}

// PATCH /admin/returns/:id/override-approve
async function handleAdminOverrideApprove(id: string | readonly string[] | undefined, request: Request) {
  await delay(250);
  const ret = localReturns.find((r) => r.id === id);
  if (!ret) return errorResponse(404, 'RETURN_NOT_FOUND', 'Return request not found');

  const body = (await request.json()) as Record<string, unknown>;
  ret.status = 'approved';
  if (body.admin_notes) ret.admin_notes = body.admin_notes as string;
  if (body.refund_amount !== undefined) ret.refund_amount = body.refund_amount as number;
  ret.updated_at = new Date().toISOString();

  return wrap(ret);
}

// PATCH /admin/returns/:id/override-deny
async function handleAdminOverrideDeny(id: string | readonly string[] | undefined, request: Request) {
  await delay(250);
  const ret = localReturns.find((r) => r.id === id);
  if (!ret) return errorResponse(404, 'RETURN_NOT_FOUND', 'Return request not found');

  const body = (await request.json()) as Record<string, unknown>;
  ret.status = 'denied';
  if (body.admin_notes) ret.admin_notes = body.admin_notes as string;
  ret.updated_at = new Date().toISOString();

  return wrap(ret);
}

// ============================================================
// Export all handlers
// ============================================================

export const returnsHandlers = [
  // ---- Customer endpoints (frontend convention: /api/v1/returns) ----
  http.post(`${BASE}/returns`, ({ request }) => handleCreateReturn(request)),
  http.get(`${BASE}/returns/my`, ({ request }) => handleMyReturns(request)),
  http.get(`${BASE}/returns/:id`, ({ params }) => handleGetReturn(params.id)),
  http.patch(`${BASE}/returns/:id/cancel`, ({ params }) => handleCancelReturn(params.id)),

  // ---- Also listen on backend convention: /api/v1/orders/returns ----
  http.post(`${BASE}/orders/returns`, ({ request }) => handleCreateReturn(request)),
  http.get(`${BASE}/orders/returns/my`, ({ request }) => handleMyReturns(request)),
  http.get(`${BASE}/orders/returns/:id`, ({ params }) => handleGetReturn(params.id)),
  http.patch(`${BASE}/orders/returns/:id/cancel`, ({ params }) => handleCancelReturn(params.id)),

  // ---- Vendor endpoints ----
  http.get(`${BASE}/vendor/returns`, ({ request }) => handleVendorReturns(request)),
  http.get(`${BASE}/vendor/returns/:id`, ({ params }) => handleGetReturn(params.id)),
  http.patch(`${BASE}/vendor/returns/:id/approve`, ({ params, request }) => handleVendorApprove(params.id, request)),
  http.patch(`${BASE}/vendor/returns/:id/deny`, ({ params, request }) => handleVendorDeny(params.id, request)),
  http.patch(`${BASE}/vendor/returns/:id/received`, ({ params, request }) => handleVendorReceived(params.id, request)),

  // Also on /api/v1/orders/vendor/returns
  http.get(`${BASE}/orders/vendor/returns`, ({ request }) => handleVendorReturns(request)),
  http.get(`${BASE}/orders/vendor/returns/:id`, ({ params }) => handleGetReturn(params.id)),
  http.patch(`${BASE}/orders/vendor/returns/:id/approve`, ({ params, request }) => handleVendorApprove(params.id, request)),
  http.patch(`${BASE}/orders/vendor/returns/:id/deny`, ({ params, request }) => handleVendorDeny(params.id, request)),
  http.patch(`${BASE}/orders/vendor/returns/:id/received`, ({ params, request }) => handleVendorReceived(params.id, request)),

  // ---- Admin endpoints ----
  http.get(`${BASE}/admin/returns`, ({ request }) => handleAdminReturns(request)),
  http.get(`${BASE}/admin/returns/stats`, ({ request }) => handleAdminStats(request)),
  http.get(`${BASE}/admin/returns/:id`, ({ params }) => handleGetReturn(params.id)),
  http.patch(`${BASE}/admin/returns/:id/escalate`, ({ params, request }) => handleAdminEscalate(params.id, request)),
  http.patch(`${BASE}/admin/returns/:id/override-approve`, ({ params, request }) => handleAdminOverrideApprove(params.id, request)),
  http.patch(`${BASE}/admin/returns/:id/override-deny`, ({ params, request }) => handleAdminOverrideDeny(params.id, request)),

  // Also on /api/v1/orders/admin/returns
  http.get(`${BASE}/orders/admin/returns`, ({ request }) => handleAdminReturns(request)),
  http.get(`${BASE}/orders/admin/returns/stats`, ({ request }) => handleAdminStats(request)),
  http.get(`${BASE}/orders/admin/returns/:id`, ({ params }) => handleGetReturn(params.id)),
  http.patch(`${BASE}/orders/admin/returns/:id/escalate`, ({ params, request }) => handleAdminEscalate(params.id, request)),
  http.patch(`${BASE}/orders/admin/returns/:id/override-approve`, ({ params, request }) => handleAdminOverrideApprove(params.id, request)),
  http.patch(`${BASE}/orders/admin/returns/:id/override-deny`, ({ params, request }) => handleAdminOverrideDeny(params.id, request)),
];
