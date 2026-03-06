import { http, HttpResponse, delay } from 'msw';
import { disputes, computeDisputeStats, MockDispute, MockDisputeMessage } from '../data/disputes';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';

const BASE = '/api/v1';
let localDisputes = [...disputes];
let nextDispId = localDisputes.length + 1;
let nextMsgId = 100;

// ============================================================
// Customer endpoints: /api/v1/disputes/*
// ============================================================

// POST /disputes — create dispute
async function handleCreateDispute(request: Request) {
  await delay(300);
  const body = (await request.json()) as Record<string, unknown>;

  const orderId = body.order_id as string;
  if (!orderId) {
    return errorResponse(400, 'VALIDATION_ERROR', 'order_id is required');
  }
  if (!body.subject || !body.description || !body.category) {
    return errorResponse(400, 'VALIDATION_ERROR', 'subject, description, and category are required');
  }

  // Check for duplicate active dispute on same order
  const existing = localDisputes.find(
    (d) => d.order_id === orderId && !['resolved', 'closed'].includes(d.status),
  );
  if (existing) {
    return errorResponse(400, 'DUPLICATE_DISPUTE', 'An active dispute already exists for this order');
  }

  const newDispute: MockDispute = {
    id: `disp-new-${nextDispId}`,
    dispute_number: `DSP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(nextDispId).padStart(3, '0')}`,
    order_id: orderId,
    return_request_id: (body.return_request_id as string) || null,
    customer_id: 'u-cust-001',
    store_id: 'store-001',
    category: body.category as MockDispute['category'],
    status: 'open',
    priority: body.category === 'unauthorized_charge' ? 'urgent' : 'medium',
    subject: body.subject as string,
    description: body.description as string,
    evidence_urls: (body.evidence_urls as string[]) || [],
    requested_resolution: (body.requested_resolution as MockDispute['requested_resolution']) || 'refund',
    resolution_type: null,
    resolution_amount: 0,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    escalated_at: null,
    escalation_reason: null,
    vendor_response_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    admin_assigned_to: null,
    messages: [
      {
        id: `msg-new-${nextMsgId++}`,
        dispute_id: `disp-new-${nextDispId}`,
        sender_id: 'u-cust-001',
        sender_role: 'customer',
        message: body.description as string,
        attachments: (body.evidence_urls as string[]) || [],
        is_internal: false,
        created_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  nextDispId++;
  localDisputes.unshift(newDispute);

  return HttpResponse.json(
    { success: true, data: newDispute, timestamp: new Date().toISOString() },
    { status: 201 },
  );
}

// GET /disputes/my — list customer's disputes
async function handleMyDisputes(request: Request) {
  await delay(200);
  const params = getSearchParams(request);
  const page = parseInt(params.get('page') || '1', 10);
  const limit = parseInt(params.get('limit') || '20', 10);
  const status = params.get('status');
  const category = params.get('category');
  const priority = params.get('priority');
  const date_from = params.get('date_from');
  const date_to = params.get('date_to');

  let filtered = localDisputes.filter((d) => d.customer_id === 'u-cust-001');

  if (status) filtered = filtered.filter((d) => d.status === status);
  if (category) filtered = filtered.filter((d) => d.category === category);
  if (priority) filtered = filtered.filter((d) => d.priority === priority);
  if (date_from) filtered = filtered.filter((d) => d.created_at >= date_from);
  if (date_to) filtered = filtered.filter((d) => d.created_at <= date_to);

  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return paginatedWrap(filtered, page, limit);
}

// GET /disputes/:id — get dispute detail
async function handleGetDispute(id: string | readonly string[] | undefined, isAdmin = false) {
  await delay(150);
  const disp = localDisputes.find((d) => d.id === id);
  if (!disp) return errorResponse(404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  // Non-admins don't see internal messages
  if (!isAdmin) {
    const filtered = {
      ...disp,
      messages: disp.messages.filter((m) => !m.is_internal),
    };
    return wrap(filtered);
  }

  return wrap(disp);
}

// GET /disputes/:id/messages — get dispute messages
async function handleGetMessages(id: string | readonly string[] | undefined, isAdmin = false) {
  await delay(150);
  const disp = localDisputes.find((d) => d.id === id);
  if (!disp) return errorResponse(404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  const messages = isAdmin
    ? disp.messages
    : disp.messages.filter((m) => !m.is_internal);

  return wrap(messages);
}

// POST /disputes/:id/messages — add message to dispute
async function handleAddMessage(
  id: string | readonly string[] | undefined,
  request: Request,
  senderRole: MockDisputeMessage['sender_role'] = 'customer',
) {
  await delay(200);
  const disp = localDisputes.find((d) => d.id === id);
  if (!disp) return errorResponse(404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  const body = (await request.json()) as Record<string, unknown>;
  if (!body.message) {
    return errorResponse(400, 'VALIDATION_ERROR', 'message is required');
  }

  const newMsg: MockDisputeMessage = {
    id: `msg-new-${nextMsgId++}`,
    dispute_id: disp.id,
    sender_id: senderRole === 'customer' ? 'u-cust-001' : senderRole === 'admin' ? 'u-admin-001' : 'u-vendor-001',
    sender_role: senderRole,
    message: body.message as string,
    attachments: (body.attachments as string[]) || [],
    is_internal: (body.is_internal as boolean) || false,
    created_at: new Date().toISOString(),
  };

  disp.messages.push(newMsg);

  // Update dispute status based on sender role
  if (senderRole === 'customer' && disp.status === 'vendor_response') {
    disp.status = 'customer_reply';
  }

  disp.updated_at = new Date().toISOString();

  return HttpResponse.json(
    { success: true, data: newMsg, timestamp: new Date().toISOString() },
    { status: 201 },
  );
}

// PATCH /disputes/:id/escalate — customer escalate dispute
async function handleCustomerEscalate(id: string | readonly string[] | undefined, request: Request) {
  await delay(250);
  const disp = localDisputes.find((d) => d.id === id);
  if (!disp) return errorResponse(404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  const body = (await request.json()) as Record<string, unknown>;
  disp.status = 'escalated';
  disp.escalated_at = new Date().toISOString();
  if (body.escalation_reason) disp.escalation_reason = body.escalation_reason as string;
  disp.updated_at = new Date().toISOString();

  return wrap(disp);
}

// ============================================================
// Vendor endpoints: /api/v1/vendor/disputes/*
// ============================================================

// GET /vendor/disputes — list disputes for vendor's store
async function handleVendorDisputes(request: Request) {
  await delay(200);
  const params = getSearchParams(request);
  const page = parseInt(params.get('page') || '1', 10);
  const limit = parseInt(params.get('limit') || '20', 10);
  const status = params.get('status');
  const category = params.get('category');
  const priority = params.get('priority');

  // Mock: vendor owns store-001 and store-005
  let filtered = localDisputes.filter((d) => ['store-001', 'store-005'].includes(d.store_id));

  if (status) filtered = filtered.filter((d) => d.status === status);
  if (category) filtered = filtered.filter((d) => d.category === category);
  if (priority) filtered = filtered.filter((d) => d.priority === priority);

  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return paginatedWrap(filtered, page, limit);
}

// POST /vendor/disputes/:id/respond — vendor responds to dispute
async function handleVendorRespond(id: string | readonly string[] | undefined, request: Request) {
  await delay(250);
  const disp = localDisputes.find((d) => d.id === id);
  if (!disp) return errorResponse(404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  const body = (await request.json()) as Record<string, unknown>;
  if (!body.message) {
    return errorResponse(400, 'VALIDATION_ERROR', 'message is required');
  }

  const newMsg: MockDisputeMessage = {
    id: `msg-new-${nextMsgId++}`,
    dispute_id: disp.id,
    sender_id: 'u-vendor-001',
    sender_role: 'vendor_owner',
    message: body.message as string,
    attachments: [],
    is_internal: false,
    created_at: new Date().toISOString(),
  };

  disp.messages.push(newMsg);
  disp.status = 'vendor_response';
  disp.updated_at = new Date().toISOString();

  return wrap(disp);
}

// ============================================================
// Admin endpoints: /api/v1/admin/disputes/*
// ============================================================

// GET /admin/disputes — list all disputes with advanced filters
async function handleAdminDisputes(request: Request) {
  await delay(200);
  const params = getSearchParams(request);
  const page = parseInt(params.get('page') || '1', 10);
  const limit = parseInt(params.get('limit') || '20', 10);
  const status = params.get('status');
  const category = params.get('category');
  const priority = params.get('priority');
  const search = params.get('search')?.toLowerCase();
  const store_id = params.get('store_id');
  const customer_id = params.get('customer_id');
  const assigned_to = params.get('assigned_to');
  const date_from = params.get('date_from');
  const date_to = params.get('date_to');

  let filtered = [...localDisputes];

  if (status) filtered = filtered.filter((d) => d.status === status);
  if (category) filtered = filtered.filter((d) => d.category === category);
  if (priority) filtered = filtered.filter((d) => d.priority === priority);
  if (store_id) filtered = filtered.filter((d) => d.store_id === store_id);
  if (customer_id) filtered = filtered.filter((d) => d.customer_id === customer_id);
  if (assigned_to) filtered = filtered.filter((d) => d.admin_assigned_to === assigned_to);
  if (date_from) filtered = filtered.filter((d) => d.created_at >= date_from);
  if (date_to) filtered = filtered.filter((d) => d.created_at <= date_to);
  if (search) {
    filtered = filtered.filter(
      (d) =>
        d.dispute_number.toLowerCase().includes(search) ||
        d.subject.toLowerCase().includes(search) ||
        d.order_id.toLowerCase().includes(search),
    );
  }

  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return paginatedWrap(filtered, page, limit);
}

// GET /admin/disputes/stats
async function handleAdminStats(request: Request) {
  await delay(150);
  const params = getSearchParams(request);
  const date_from = params.get('date_from');
  const date_to = params.get('date_to');

  let filtered = [...localDisputes];
  if (date_from) filtered = filtered.filter((d) => d.created_at >= date_from);
  if (date_to) filtered = filtered.filter((d) => d.created_at <= date_to);

  return wrap(computeDisputeStats(filtered));
}

// PATCH /admin/disputes/:id/assign — assign to admin
async function handleAdminAssign(id: string | readonly string[] | undefined, request: Request) {
  await delay(250);
  const disp = localDisputes.find((d) => d.id === id);
  if (!disp) return errorResponse(404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  const body = (await request.json()) as Record<string, unknown>;
  disp.admin_assigned_to = (body.admin_id as string) || 'u-admin-001';
  if (disp.status === 'open' || disp.status === 'escalated') {
    disp.status = 'under_review';
  }
  disp.updated_at = new Date().toISOString();

  return wrap(disp);
}

// PATCH /admin/disputes/:id/escalate
async function handleAdminEscalate(id: string | readonly string[] | undefined, request: Request) {
  await delay(250);
  const disp = localDisputes.find((d) => d.id === id);
  if (!disp) return errorResponse(404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  const body = (await request.json()) as Record<string, unknown>;
  disp.status = 'escalated';
  disp.escalated_at = new Date().toISOString();
  if (body.escalation_reason) disp.escalation_reason = body.escalation_reason as string;
  disp.updated_at = new Date().toISOString();

  return wrap(disp);
}

// PATCH /admin/disputes/:id/resolve
async function handleAdminResolve(id: string | readonly string[] | undefined, request: Request) {
  await delay(300);
  const disp = localDisputes.find((d) => d.id === id);
  if (!disp) return errorResponse(404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  const body = (await request.json()) as Record<string, unknown>;
  if (!body.resolution_type) {
    return errorResponse(400, 'VALIDATION_ERROR', 'resolution_type is required');
  }

  disp.status = 'resolved';
  disp.resolution_type = body.resolution_type as MockDispute['resolution_type'];
  if (body.resolution_amount !== undefined) disp.resolution_amount = body.resolution_amount as number;
  if (body.resolution_notes) disp.resolution_notes = body.resolution_notes as string;
  disp.resolved_by = 'u-admin-001';
  disp.resolved_at = new Date().toISOString();
  disp.updated_at = new Date().toISOString();

  return wrap(disp);
}

// PATCH /admin/disputes/:id/close
async function handleAdminClose(id: string | readonly string[] | undefined) {
  await delay(200);
  const disp = localDisputes.find((d) => d.id === id);
  if (!disp) return errorResponse(404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  disp.status = 'closed';
  disp.updated_at = new Date().toISOString();

  return wrap(disp);
}

// POST /admin/disputes/auto-escalate
async function handleAutoEscalate() {
  await delay(300);
  const now = new Date();
  let count = 0;
  for (const d of localDisputes) {
    if (
      d.status === 'open' &&
      d.vendor_response_deadline &&
      new Date(d.vendor_response_deadline) < now
    ) {
      d.status = 'escalated';
      d.escalated_at = now.toISOString();
      d.escalation_reason = 'Auto-escalated: vendor missed 48-hour response deadline';
      d.updated_at = now.toISOString();
      count++;
    }
  }
  return wrap({ escalated_count: count });
}

// ============================================================
// Export all handlers
// ============================================================

export const disputesHandlers = [
  // ---- Customer endpoints ----
  http.post(`${BASE}/disputes`, ({ request }) => handleCreateDispute(request)),
  http.get(`${BASE}/disputes/my`, ({ request }) => handleMyDisputes(request)),
  http.get(`${BASE}/disputes/:id/messages`, ({ params }) => handleGetMessages(params.id)),
  http.post(`${BASE}/disputes/:id/messages`, ({ params, request }) => handleAddMessage(params.id, request, 'customer')),
  http.patch(`${BASE}/disputes/:id/escalate`, ({ params, request }) => handleCustomerEscalate(params.id, request)),
  http.get(`${BASE}/disputes/:id`, ({ params }) => handleGetDispute(params.id)),

  // ---- Also listen on backend convention: /api/v1/orders/disputes ----
  http.post(`${BASE}/orders/disputes`, ({ request }) => handleCreateDispute(request)),
  http.get(`${BASE}/orders/disputes/my`, ({ request }) => handleMyDisputes(request)),
  http.get(`${BASE}/orders/disputes/:id/messages`, ({ params }) => handleGetMessages(params.id)),
  http.post(`${BASE}/orders/disputes/:id/messages`, ({ params, request }) => handleAddMessage(params.id, request, 'customer')),
  http.patch(`${BASE}/orders/disputes/:id/escalate`, ({ params, request }) => handleCustomerEscalate(params.id, request)),
  http.get(`${BASE}/orders/disputes/:id`, ({ params }) => handleGetDispute(params.id)),

  // ---- Vendor endpoints ----
  http.get(`${BASE}/vendor/disputes`, ({ request }) => handleVendorDisputes(request)),
  http.get(`${BASE}/vendor/disputes/:id/messages`, ({ params }) => handleGetMessages(params.id)),
  http.post(`${BASE}/vendor/disputes/:id/respond`, ({ params, request }) => handleVendorRespond(params.id, request)),
  http.get(`${BASE}/vendor/disputes/:id`, ({ params }) => handleGetDispute(params.id)),

  // Also on /api/v1/orders/vendor/disputes
  http.get(`${BASE}/orders/vendor/disputes`, ({ request }) => handleVendorDisputes(request)),
  http.get(`${BASE}/orders/vendor/disputes/:id/messages`, ({ params }) => handleGetMessages(params.id)),
  http.post(`${BASE}/orders/vendor/disputes/:id/respond`, ({ params, request }) => handleVendorRespond(params.id, request)),
  http.get(`${BASE}/orders/vendor/disputes/:id`, ({ params }) => handleGetDispute(params.id)),

  // ---- Admin endpoints ----
  http.get(`${BASE}/admin/disputes/stats`, ({ request }) => handleAdminStats(request)),
  http.get(`${BASE}/admin/disputes`, ({ request }) => handleAdminDisputes(request)),
  http.get(`${BASE}/admin/disputes/:id/messages`, ({ params }) => handleGetMessages(params.id, true)),
  http.post(`${BASE}/admin/disputes/:id/messages`, ({ params, request }) => handleAddMessage(params.id, request, 'admin')),
  http.patch(`${BASE}/admin/disputes/:id/assign`, ({ params, request }) => handleAdminAssign(params.id, request)),
  http.patch(`${BASE}/admin/disputes/:id/escalate`, ({ params, request }) => handleAdminEscalate(params.id, request)),
  http.patch(`${BASE}/admin/disputes/:id/resolve`, ({ params, request }) => handleAdminResolve(params.id, request)),
  http.patch(`${BASE}/admin/disputes/:id/close`, ({ params }) => handleAdminClose(params.id)),
  http.post(`${BASE}/admin/disputes/auto-escalate`, () => handleAutoEscalate()),
  http.get(`${BASE}/admin/disputes/:id`, ({ params }) => handleGetDispute(params.id, true)),

  // Also on /api/v1/orders/admin/disputes
  http.get(`${BASE}/orders/admin/disputes/stats`, ({ request }) => handleAdminStats(request)),
  http.get(`${BASE}/orders/admin/disputes`, ({ request }) => handleAdminDisputes(request)),
  http.get(`${BASE}/orders/admin/disputes/:id/messages`, ({ params }) => handleGetMessages(params.id, true)),
  http.post(`${BASE}/orders/admin/disputes/:id/messages`, ({ params, request }) => handleAddMessage(params.id, request, 'admin')),
  http.patch(`${BASE}/orders/admin/disputes/:id/assign`, ({ params, request }) => handleAdminAssign(params.id, request)),
  http.patch(`${BASE}/orders/admin/disputes/:id/escalate`, ({ params, request }) => handleAdminEscalate(params.id, request)),
  http.patch(`${BASE}/orders/admin/disputes/:id/resolve`, ({ params, request }) => handleAdminResolve(params.id, request)),
  http.patch(`${BASE}/orders/admin/disputes/:id/close`, ({ params }) => handleAdminClose(params.id)),
  http.post(`${BASE}/orders/admin/disputes/auto-escalate`, () => handleAutoEscalate()),
  http.get(`${BASE}/orders/admin/disputes/:id`, ({ params }) => handleGetDispute(params.id, true)),
];
