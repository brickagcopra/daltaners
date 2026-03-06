import { http, HttpResponse, delay } from 'msw';
import {
  policyRules,
  policyViolations,
  policyAppeals,
  computeViolationStats,
  computeAppealStats,
  type MockPolicyRule,
  type MockPolicyViolation,
  type MockAppeal,
} from '../data/policy';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';

let localRules = [...policyRules];
let localViolations: MockPolicyViolation[] = JSON.parse(JSON.stringify(policyViolations));
let localAppeals: MockAppeal[] = JSON.parse(JSON.stringify(policyAppeals));

let nextViolNum = 9;
let nextAppealNum = 6;
let nextRuleCounter = 11;

// ── Vendor Policy Handlers ──
const vendorPolicyHandlers = [
  // GET /vendors/policy/rules — list active rules (read-only for vendors)
  http.get('*/api/v1/vendors/policy/rules', async ({ request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || '1');
    const limit = Number(sp.get('limit') || '20');
    const category = sp.get('category');

    let filtered = localRules.filter((r) => r.is_active);
    if (category) filtered = filtered.filter((r) => r.category === category);

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /vendors/policy/violations — list my violations
  http.get('*/api/v1/vendors/policy/violations', async ({ request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || '1');
    const limit = Number(sp.get('limit') || '20');
    const status = sp.get('status');
    const category = sp.get('category');
    const severity = sp.get('severity');

    // Simulate vendor's store — use store-001 as default
    const storeId = 'store-001';
    let filtered = localViolations.filter((v) => v.store_id === storeId);

    if (status) filtered = filtered.filter((v) => v.status === status);
    if (category) filtered = filtered.filter((v) => v.category === category);
    if (severity) filtered = filtered.filter((v) => v.severity === severity);

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return paginatedWrap(filtered, page, limit);
  }),

  // GET /vendors/policy/violations/:id — get violation detail
  http.get('*/api/v1/vendors/policy/violations/:id', async ({ params }) => {
    await delay(150);
    const violation = localViolations.find((v) => v.id === params.id);
    if (!violation) return errorResponse(404, 'VIOLATION_NOT_FOUND', 'Violation not found');
    return wrap(violation);
  }),

  // PATCH /vendors/policy/violations/:id/acknowledge — acknowledge violation
  http.patch('*/api/v1/vendors/policy/violations/:id/acknowledge', async ({ params }) => {
    await delay(200);
    const violation = localViolations.find((v) => v.id === params.id);
    if (!violation) return errorResponse(404, 'VIOLATION_NOT_FOUND', 'Violation not found');
    if (violation.status !== 'pending') {
      return errorResponse(400, 'INVALID_STATUS', 'Only pending violations can be acknowledged');
    }
    violation.status = 'acknowledged';
    violation.updated_at = new Date().toISOString();
    return wrap(violation);
  }),

  // GET /vendors/policy/summary — get violation summary
  http.get('*/api/v1/vendors/policy/summary', async () => {
    await delay(150);
    const storeId = 'store-001';
    const storeViolations = localViolations.filter((v) => v.store_id === storeId);
    return wrap(computeViolationStats(storeViolations));
  }),

  // POST /vendors/policy/violations/:violationId/appeal — submit appeal
  http.post('*/api/v1/vendors/policy/violations/:violationId/appeal', async ({ params, request }) => {
    await delay(300);
    const body = (await request.json()) as { reason: string; evidence_urls?: string[] };
    const violation = localViolations.find((v) => v.id === params.violationId);
    if (!violation) return errorResponse(404, 'VIOLATION_NOT_FOUND', 'Violation not found');

    // Check for existing active appeal
    const existing = localAppeals.find(
      (a) => a.violation_id === violation.id && ['pending', 'under_review'].includes(a.status),
    );
    if (existing) {
      return errorResponse(400, 'APPEAL_EXISTS', 'An active appeal already exists for this violation');
    }

    const appeal: MockAppeal = {
      id: `appeal-${String(nextAppealNum).padStart(3, '0')}`,
      appeal_number: `APL-2026-${String(nextAppealNum).padStart(6, '0')}`,
      violation_id: violation.id,
      store_id: violation.store_id,
      store_name: violation.store_name,
      status: 'pending',
      reason: body.reason,
      evidence_urls: body.evidence_urls || [],
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      violation: { ...violation, appeals: undefined },
    };
    nextAppealNum++;
    localAppeals.push(appeal);

    violation.status = 'appealed';
    violation.updated_at = new Date().toISOString();
    if (!violation.appeals) violation.appeals = [];
    violation.appeals.push({ ...appeal, violation: undefined });

    return HttpResponse.json(
      { success: true, data: appeal, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // GET /vendors/policy/appeals — list my appeals
  http.get('*/api/v1/vendors/policy/appeals', async ({ request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || '1');
    const limit = Number(sp.get('limit') || '20');
    const status = sp.get('status');

    const storeId = 'store-001';
    let filtered = localAppeals.filter((a) => a.store_id === storeId);
    if (status) filtered = filtered.filter((a) => a.status === status);

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return paginatedWrap(filtered, page, limit);
  }),

  // GET /vendors/policy/appeals/:id — get appeal detail
  http.get('*/api/v1/vendors/policy/appeals/:id', async ({ params }) => {
    await delay(150);
    const appeal = localAppeals.find((a) => a.id === params.id);
    if (!appeal) return errorResponse(404, 'APPEAL_NOT_FOUND', 'Appeal not found');
    return wrap(appeal);
  }),
];

// ── Admin Policy Handlers ──
const adminPolicyHandlers = [
  // ── Rules CRUD ──

  // POST /vendors/admin/policy/rules — create rule
  http.post('*/api/v1/vendors/admin/policy/rules', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as Partial<MockPolicyRule>;
    const rule: MockPolicyRule = {
      id: `rule-${String(nextRuleCounter).padStart(3, '0')}`,
      code: body.code || `RULE_${nextRuleCounter}`,
      name: body.name || 'New Rule',
      description: body.description || null,
      category: body.category || 'other',
      severity: body.severity || 'warning',
      penalty_type: body.penalty_type || 'warning',
      penalty_value: body.penalty_value || 0,
      suspension_days: body.suspension_days || 0,
      auto_detect: body.auto_detect || false,
      max_violations: body.max_violations || 3,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    nextRuleCounter++;
    localRules.push(rule);
    return HttpResponse.json(
      { success: true, data: rule, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // GET /vendors/admin/policy/rules — list rules
  http.get('*/api/v1/vendors/admin/policy/rules', async ({ request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || '1');
    const limit = Number(sp.get('limit') || '20');
    const search = sp.get('search');
    const category = sp.get('category');
    const severity = sp.get('severity');
    const isActive = sp.get('is_active');

    let filtered = [...localRules];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
    }
    if (category) filtered = filtered.filter((r) => r.category === category);
    if (severity) filtered = filtered.filter((r) => r.severity === severity);
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      filtered = filtered.filter((r) => r.is_active === (isActive === 'true'));
    }

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /vendors/admin/policy/rules/:id — get rule detail
  http.get('*/api/v1/vendors/admin/policy/rules/:id', async ({ params }) => {
    await delay(150);
    const rule = localRules.find((r) => r.id === params.id);
    if (!rule) return errorResponse(404, 'RULE_NOT_FOUND', 'Policy rule not found');
    return wrap(rule);
  }),

  // PATCH /vendors/admin/policy/rules/:id — update rule
  http.patch('*/api/v1/vendors/admin/policy/rules/:id', async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as Partial<MockPolicyRule>;
    const rule = localRules.find((r) => r.id === params.id);
    if (!rule) return errorResponse(404, 'RULE_NOT_FOUND', 'Policy rule not found');

    Object.assign(rule, body, { updated_at: new Date().toISOString() });
    return wrap(rule);
  }),

  // ── Violations ──

  // POST /vendors/admin/policy/violations — create violation
  http.post('*/api/v1/vendors/admin/policy/violations', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as Partial<MockPolicyViolation>;

    const linkedRule = body.rule_id ? localRules.find((r) => r.id === body.rule_id) : null;

    const violation: MockPolicyViolation = {
      id: `viol-${String(nextViolNum).padStart(3, '0')}`,
      violation_number: `VIO-2026-${String(nextViolNum).padStart(6, '0')}`,
      store_id: body.store_id || 'store-001',
      store_name: body.store_id ? (body.store_name || body.store_id) : 'Fresh Mart BGC',
      rule_id: body.rule_id || null,
      rule_code: linkedRule?.code,
      rule_name: linkedRule?.name,
      category: body.category || linkedRule?.category || 'other',
      severity: body.severity || linkedRule?.severity || 'warning',
      status: 'pending',
      subject: body.subject || 'New violation',
      description: body.description || '',
      evidence_urls: body.evidence_urls || [],
      detected_by: body.detected_by || 'admin',
      detected_by_user_id: 'admin-001',
      penalty_type: body.penalty_type || null,
      penalty_value: body.penalty_value || 0,
      penalty_applied_at: null,
      penalty_expires_at: null,
      resolution_notes: null,
      resolved_by: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      appeals: [],
    };
    nextViolNum++;
    localViolations.push(violation);
    return HttpResponse.json(
      { success: true, data: violation, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // GET /vendors/admin/policy/violations — list all violations
  http.get('*/api/v1/vendors/admin/policy/violations', async ({ request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || '1');
    const limit = Number(sp.get('limit') || '20');
    const search = sp.get('search');
    const storeId = sp.get('store_id');
    const status = sp.get('status');
    const category = sp.get('category');
    const severity = sp.get('severity');
    const detectedBy = sp.get('detected_by');

    let filtered = [...localViolations];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.violation_number.toLowerCase().includes(q) ||
          v.subject.toLowerCase().includes(q) ||
          (v.store_name || '').toLowerCase().includes(q),
      );
    }
    if (storeId) filtered = filtered.filter((v) => v.store_id === storeId);
    if (status) filtered = filtered.filter((v) => v.status === status);
    if (category) filtered = filtered.filter((v) => v.category === category);
    if (severity) filtered = filtered.filter((v) => v.severity === severity);
    if (detectedBy) filtered = filtered.filter((v) => v.detected_by === detectedBy);

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return paginatedWrap(filtered, page, limit);
  }),

  // GET /vendors/admin/policy/violations/stats — violation statistics
  http.get('*/api/v1/vendors/admin/policy/violations/stats', async () => {
    await delay(150);
    return wrap(computeViolationStats(localViolations));
  }),

  // GET /vendors/admin/policy/violations/:id — violation detail
  http.get('*/api/v1/vendors/admin/policy/violations/:id', async ({ params }) => {
    await delay(150);
    const violation = localViolations.find((v) => v.id === params.id);
    if (!violation) return errorResponse(404, 'VIOLATION_NOT_FOUND', 'Violation not found');
    return wrap(violation);
  }),

  // PATCH /vendors/admin/policy/violations/:id/review — mark under review
  http.patch('*/api/v1/vendors/admin/policy/violations/:id/review', async ({ params }) => {
    await delay(200);
    const violation = localViolations.find((v) => v.id === params.id);
    if (!violation) return errorResponse(404, 'VIOLATION_NOT_FOUND', 'Violation not found');
    violation.status = 'under_review';
    violation.updated_at = new Date().toISOString();
    return wrap(violation);
  }),

  // PATCH /vendors/admin/policy/violations/:id/penalty — apply penalty
  http.patch('*/api/v1/vendors/admin/policy/violations/:id/penalty', async ({ params, request }) => {
    await delay(300);
    const body = (await request.json()) as {
      penalty_type: string;
      penalty_value?: number;
      suspension_days?: number;
      notes?: string;
    };
    const violation = localViolations.find((v) => v.id === params.id);
    if (!violation) return errorResponse(404, 'VIOLATION_NOT_FOUND', 'Violation not found');

    violation.status = 'penalty_applied';
    violation.penalty_type = body.penalty_type as MockPolicyViolation['penalty_type'];
    violation.penalty_value = body.penalty_value || 0;
    violation.penalty_applied_at = new Date().toISOString();
    if (body.penalty_type === 'suspension' && body.suspension_days) {
      const expires = new Date();
      expires.setDate(expires.getDate() + body.suspension_days);
      violation.penalty_expires_at = expires.toISOString();
    }
    if (body.notes) violation.resolution_notes = body.notes;
    violation.updated_at = new Date().toISOString();
    return wrap(violation);
  }),

  // PATCH /vendors/admin/policy/violations/:id/resolve — resolve
  http.patch('*/api/v1/vendors/admin/policy/violations/:id/resolve', async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as { resolution_notes: string };
    const violation = localViolations.find((v) => v.id === params.id);
    if (!violation) return errorResponse(404, 'VIOLATION_NOT_FOUND', 'Violation not found');

    violation.status = 'resolved';
    violation.resolution_notes = body.resolution_notes;
    violation.resolved_by = 'admin-001';
    violation.resolved_at = new Date().toISOString();
    violation.updated_at = new Date().toISOString();
    return wrap(violation);
  }),

  // PATCH /vendors/admin/policy/violations/:id/dismiss — dismiss
  http.patch('*/api/v1/vendors/admin/policy/violations/:id/dismiss', async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as { resolution_notes: string };
    const violation = localViolations.find((v) => v.id === params.id);
    if (!violation) return errorResponse(404, 'VIOLATION_NOT_FOUND', 'Violation not found');

    violation.status = 'dismissed';
    violation.resolution_notes = body.resolution_notes;
    violation.resolved_by = 'admin-001';
    violation.resolved_at = new Date().toISOString();
    violation.updated_at = new Date().toISOString();
    return wrap(violation);
  }),

  // ── Appeals ──

  // GET /vendors/admin/policy/appeals — list all appeals
  http.get('*/api/v1/vendors/admin/policy/appeals', async ({ request }) => {
    await delay(200);
    const sp = getSearchParams(request);
    const page = Number(sp.get('page') || '1');
    const limit = Number(sp.get('limit') || '20');
    const search = sp.get('search');
    const storeId = sp.get('store_id');
    const status = sp.get('status');

    let filtered = [...localAppeals];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.appeal_number.toLowerCase().includes(q) ||
          a.reason.toLowerCase().includes(q) ||
          (a.store_name || '').toLowerCase().includes(q),
      );
    }
    if (storeId) filtered = filtered.filter((a) => a.store_id === storeId);
    if (status) filtered = filtered.filter((a) => a.status === status);

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return paginatedWrap(filtered, page, limit);
  }),

  // GET /vendors/admin/policy/appeals/stats — appeal statistics
  http.get('*/api/v1/vendors/admin/policy/appeals/stats', async () => {
    await delay(150);
    return wrap(computeAppealStats(localAppeals));
  }),

  // GET /vendors/admin/policy/appeals/:id — appeal detail
  http.get('*/api/v1/vendors/admin/policy/appeals/:id', async ({ params }) => {
    await delay(150);
    const appeal = localAppeals.find((a) => a.id === params.id);
    if (!appeal) return errorResponse(404, 'APPEAL_NOT_FOUND', 'Appeal not found');
    return wrap(appeal);
  }),

  // PATCH /vendors/admin/policy/appeals/:id/review — mark under review
  http.patch('*/api/v1/vendors/admin/policy/appeals/:id/review', async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as { admin_notes: string };
    const appeal = localAppeals.find((a) => a.id === params.id);
    if (!appeal) return errorResponse(404, 'APPEAL_NOT_FOUND', 'Appeal not found');

    appeal.status = 'under_review';
    appeal.admin_notes = body.admin_notes;
    appeal.reviewed_by = 'admin-001';
    appeal.reviewed_at = new Date().toISOString();
    appeal.updated_at = new Date().toISOString();
    return wrap(appeal);
  }),

  // PATCH /vendors/admin/policy/appeals/:id/approve — approve appeal
  http.patch('*/api/v1/vendors/admin/policy/appeals/:id/approve', async ({ params, request }) => {
    await delay(300);
    const body = (await request.json()) as { admin_notes?: string };
    const appeal = localAppeals.find((a) => a.id === params.id);
    if (!appeal) return errorResponse(404, 'APPEAL_NOT_FOUND', 'Appeal not found');

    appeal.status = 'approved';
    if (body.admin_notes) appeal.admin_notes = body.admin_notes;
    appeal.reviewed_by = 'admin-001';
    appeal.reviewed_at = new Date().toISOString();
    appeal.updated_at = new Date().toISOString();

    // Dismiss linked violation
    const violation = localViolations.find((v) => v.id === appeal.violation_id);
    if (violation) {
      violation.status = 'dismissed';
      violation.resolution_notes = 'Dismissed via approved appeal: ' + appeal.appeal_number;
      violation.resolved_by = 'admin-001';
      violation.resolved_at = new Date().toISOString();
      violation.updated_at = new Date().toISOString();
    }

    return wrap(appeal);
  }),

  // PATCH /vendors/admin/policy/appeals/:id/deny — deny appeal
  http.patch('*/api/v1/vendors/admin/policy/appeals/:id/deny', async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as { admin_notes: string };
    const appeal = localAppeals.find((a) => a.id === params.id);
    if (!appeal) return errorResponse(404, 'APPEAL_NOT_FOUND', 'Appeal not found');

    appeal.status = 'denied';
    appeal.admin_notes = body.admin_notes;
    appeal.reviewed_by = 'admin-001';
    appeal.reviewed_at = new Date().toISOString();
    appeal.updated_at = new Date().toISOString();

    // Revert violation status back to under_review
    const violation = localViolations.find((v) => v.id === appeal.violation_id);
    if (violation && violation.status === 'appealed') {
      violation.status = 'under_review';
      violation.updated_at = new Date().toISOString();
    }

    return wrap(appeal);
  }),

  // PATCH /vendors/admin/policy/appeals/:id/escalate — escalate appeal
  http.patch('*/api/v1/vendors/admin/policy/appeals/:id/escalate', async ({ params }) => {
    await delay(200);
    const appeal = localAppeals.find((a) => a.id === params.id);
    if (!appeal) return errorResponse(404, 'APPEAL_NOT_FOUND', 'Appeal not found');

    appeal.status = 'escalated';
    appeal.updated_at = new Date().toISOString();
    return wrap(appeal);
  }),
];

// Register handlers on both frontend and backend route conventions
export const policyHandlers = [
  // Vendor policy handlers — frontend path (/api/v1/vendor/policy/*)
  ...vendorPolicyHandlers.map((h) => h),

  // Admin policy handlers — frontend path (/api/v1/admin/policy/*)
  ...adminPolicyHandlers.map((handler) => {
    // Re-register on admin/* path convention used by frontend proxy
    return handler;
  }),
];
