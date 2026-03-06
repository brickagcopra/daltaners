import { http, delay } from 'msw';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';
import {
  financialReport,
  auditLogEntries,
  computeAuditLogStats,
} from '../data/reports';
import type { MockAuditLogEntry } from '../data/reports';

const BASE = '/api/v1';

// Mutable copy for audit entries (new entries can be added)
const auditList: MockAuditLogEntry[] = [...auditLogEntries];

export const reportsHandlers = [
  // ===== FINANCIAL REPORTS =====

  // GET /admin/reports/revenue-summary — Revenue summary with optional period filter
  http.get(`${BASE}/admin/reports/revenue-summary`, async ({ request }) => {
    await delay(400);
    const params = getSearchParams(request);
    // period param available: daily, weekly, monthly, quarterly, yearly — mock returns same data
    void params.get('period');
    return wrap(financialReport.revenue_summary);
  }),

  // GET /admin/reports/revenue-by-period — Revenue breakdown by time periods
  http.get(`${BASE}/admin/reports/revenue-by-period`, async ({ request }) => {
    await delay(400);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '14', 10);
    const dateFrom = params.get('date_from');
    const dateTo = params.get('date_to');

    let filtered = [...financialReport.revenue_by_period];
    if (dateFrom) filtered = filtered.filter((r) => r.period >= dateFrom);
    if (dateTo) filtered = filtered.filter((r) => r.period <= dateTo);

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /admin/reports/revenue-by-category — Revenue by service category
  http.get(`${BASE}/admin/reports/revenue-by-category`, async () => {
    await delay(300);
    return wrap(financialReport.revenue_by_category);
  }),

  // GET /admin/reports/revenue-by-zone — Revenue by delivery zone
  http.get(`${BASE}/admin/reports/revenue-by-zone`, async () => {
    await delay(300);
    return wrap(financialReport.revenue_by_zone);
  }),

  // GET /admin/reports/revenue-by-payment-method — Revenue by payment method
  http.get(`${BASE}/admin/reports/revenue-by-payment-method`, async () => {
    await delay(300);
    return wrap(financialReport.revenue_by_payment_method);
  }),

  // GET /admin/reports/settlement-summary — Settlement aggregation
  http.get(`${BASE}/admin/reports/settlement-summary`, async () => {
    await delay(300);
    return wrap(financialReport.settlement_summary);
  }),

  // GET /admin/reports/fee-summary — Platform fee breakdown
  http.get(`${BASE}/admin/reports/fee-summary`, async () => {
    await delay(300);
    return wrap(financialReport.fee_summary);
  }),

  // GET /admin/reports/refund-summary — Refund analytics
  http.get(`${BASE}/admin/reports/refund-summary`, async () => {
    await delay(300);
    return wrap(financialReport.refund_summary);
  }),

  // GET /admin/reports/full — Complete financial report (all sections)
  http.get(`${BASE}/admin/reports/full`, async () => {
    await delay(600);
    return wrap(financialReport);
  }),

  // POST /admin/reports/export — Export report as CSV/PDF
  http.post(`${BASE}/admin/reports/export`, async ({ request }) => {
    await delay(800);
    const body = (await request.json()) as { format: string; section: string };
    return wrap({
      download_url: `https://cdn.daltaners.ph/reports/financial-report-${body.section}-${Date.now()}.${body.format}`,
      filename: `financial-report-${body.section}-${new Date().toISOString().slice(0, 10)}.${body.format}`,
      generated_at: new Date().toISOString(),
    });
  }),

  // ===== AUDIT LOG =====

  // GET /admin/audit-log — List audit entries with filters
  http.get(`${BASE}/admin/audit-log`, async ({ request }) => {
    await delay(400);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const search = params.get('search');
    const actionType = params.get('action_type');
    const resourceType = params.get('resource_type');
    const adminId = params.get('admin_user_id');
    const dateFrom = params.get('date_from');
    const dateTo = params.get('date_to');

    let filtered = [...auditList];

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.admin_name.toLowerCase().includes(s) ||
          e.resource_name.toLowerCase().includes(s) ||
          e.description.toLowerCase().includes(s) ||
          e.action_type.toLowerCase().includes(s),
      );
    }
    if (actionType && actionType !== 'all') {
      filtered = filtered.filter((e) => e.action_type === actionType);
    }
    if (resourceType && resourceType !== 'all') {
      filtered = filtered.filter((e) => e.resource_type === resourceType);
    }
    if (adminId && adminId !== 'all') {
      filtered = filtered.filter((e) => e.admin_user_id === adminId);
    }
    if (dateFrom) {
      filtered = filtered.filter((e) => e.timestamp >= dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setDate(toDate.getDate() + 1);
      filtered = filtered.filter((e) => e.timestamp < toDate.toISOString());
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return paginatedWrap(filtered, page, limit);
  }),

  // GET /admin/audit-log/stats — Audit log stats
  http.get(`${BASE}/admin/audit-log/stats`, async () => {
    await delay(300);
    const stats = computeAuditLogStats(auditList);
    return wrap(stats);
  }),

  // GET /admin/audit-log/:id — Single audit entry detail
  http.get(`${BASE}/admin/audit-log/:id`, async ({ params }) => {
    await delay(200);
    const entry = auditList.find((e) => e.id === params.id);
    if (!entry) return errorResponse(404, 'AUDIT_ENTRY_NOT_FOUND', 'Audit log entry not found');
    return wrap(entry);
  }),

  // POST /admin/audit-log/export — Export audit log as CSV
  http.post(`${BASE}/admin/audit-log/export`, async ({ request }) => {
    await delay(800);
    const body = (await request.json()) as { format: string; date_from?: string; date_to?: string };
    return wrap({
      download_url: `https://cdn.daltaners.ph/reports/audit-log-${Date.now()}.${body.format}`,
      filename: `audit-log-${new Date().toISOString().slice(0, 10)}.${body.format}`,
      entries_count: auditList.length,
      generated_at: new Date().toISOString(),
    });
  }),
];
