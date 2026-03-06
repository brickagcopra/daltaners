import { http, HttpResponse, delay } from 'msw';
import {
  taxConfigs,
  taxInvoices,
  taxReports,
  computeInvoiceStats,
  computeReportStats,
  computeVendorTaxSummary,
  MockTaxConfig,
  MockTaxInvoice,
  MockTaxReport,
} from '../data/tax';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';

const BASE = '/api/v1';
let localConfigs = [...taxConfigs];
let localInvoices = [...taxInvoices];
let localReports = [...taxReports];
let nextConfigId = localConfigs.length + 1;
let nextReportId = localReports.length + 1;

// ────────────────────────────────────────────────────────
// Admin Tax Config endpoints
// ────────────────────────────────────────────────────────

async function handleListConfigs(request: Request) {
  await delay(150);
  const sp = getSearchParams(request);
  const taxType = sp.get('tax_type');
  const appliesTo = sp.get('applies_to');
  const search = sp.get('search');

  let filtered = [...localConfigs];
  if (taxType && taxType !== 'all') filtered = filtered.filter((c) => c.tax_type === taxType);
  if (appliesTo && appliesTo !== 'all') filtered = filtered.filter((c) => c.applies_to === appliesTo);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (c) => c.name.toLowerCase().includes(s) || c.description.toLowerCase().includes(s),
    );
  }
  return wrap(filtered);
}

async function handleListActiveConfigs() {
  await delay(100);
  return wrap(localConfigs.filter((c) => c.is_active));
}

async function handleGetConfig(id: string) {
  await delay(100);
  const config = localConfigs.find((c) => c.id === id);
  if (!config) return errorResponse(404, 'TAX_CONFIG_NOT_FOUND', 'Tax configuration not found');
  return wrap(config);
}

async function handleCreateConfig(request: Request) {
  await delay(250);
  const body = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();
  const config: MockTaxConfig = {
    id: `txcfg-new-${nextConfigId++}`,
    name: (body.name as string) || '',
    description: (body.description as string) || '',
    tax_type: (body.tax_type as MockTaxConfig['tax_type']) || 'vat',
    rate: (body.rate as number) || 0,
    applies_to: (body.applies_to as MockTaxConfig['applies_to']) || 'all',
    applies_to_value: (body.applies_to_value as string) || null,
    is_inclusive: body.is_inclusive !== false,
    is_active: body.is_active !== false,
    effective_from: (body.effective_from as string) || now,
    effective_until: (body.effective_until as string) || null,
    created_by: '00000000-0000-0000-0000-000000000001',
    metadata: (body.metadata as Record<string, unknown>) || {},
    created_at: now,
    updated_at: now,
  };
  localConfigs.push(config);
  return HttpResponse.json(
    { success: true, data: config, timestamp: now },
    { status: 201 },
  );
}

async function handleUpdateConfig(id: string, request: Request) {
  await delay(200);
  const idx = localConfigs.findIndex((c) => c.id === id);
  if (idx === -1) return errorResponse(404, 'TAX_CONFIG_NOT_FOUND', 'Tax configuration not found');
  const body = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();
  localConfigs[idx] = {
    ...localConfigs[idx],
    ...(body.name !== undefined && { name: body.name as string }),
    ...(body.description !== undefined && { description: body.description as string }),
    ...(body.rate !== undefined && { rate: body.rate as number }),
    ...(body.is_active !== undefined && { is_active: body.is_active as boolean }),
    ...(body.is_inclusive !== undefined && { is_inclusive: body.is_inclusive as boolean }),
    ...(body.effective_until !== undefined && { effective_until: body.effective_until as string | null }),
    updated_at: now,
  };
  return wrap(localConfigs[idx]);
}

async function handleDeleteConfig(id: string) {
  await delay(150);
  const idx = localConfigs.findIndex((c) => c.id === id);
  if (idx === -1) return errorResponse(404, 'TAX_CONFIG_NOT_FOUND', 'Tax configuration not found');
  localConfigs.splice(idx, 1);
  return new HttpResponse(null, { status: 204 });
}

// ────────────────────────────────────────────────────────
// Admin Tax Invoice endpoints
// ────────────────────────────────────────────────────────

async function handleAdminListInvoices(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = parseInt(sp.get('limit') || '20', 10);
  const invoiceType = sp.get('invoice_type');
  const status = sp.get('status');
  const vendorId = sp.get('vendor_id');
  const search = sp.get('search');
  const dateFrom = sp.get('date_from');
  const dateTo = sp.get('date_to');

  let filtered = [...localInvoices];
  if (invoiceType && invoiceType !== 'all') filtered = filtered.filter((i) => i.invoice_type === invoiceType);
  if (status && status !== 'all') filtered = filtered.filter((i) => i.status === status);
  if (vendorId) filtered = filtered.filter((i) => i.vendor_id === vendorId);
  if (dateFrom) filtered = filtered.filter((i) => i.created_at >= dateFrom);
  if (dateTo) filtered = filtered.filter((i) => i.created_at <= dateTo);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(s) ||
        i.vendor_name.toLowerCase().includes(s),
    );
  }
  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return paginatedWrap(filtered, page, limit);
}

async function handleAdminInvoiceStats() {
  await delay(150);
  return wrap(computeInvoiceStats(localInvoices));
}

async function handleGetInvoice(id: string) {
  await delay(100);
  const invoice = localInvoices.find((i) => i.id === id);
  if (!invoice) return errorResponse(404, 'INVOICE_NOT_FOUND', 'Tax invoice not found');
  return wrap(invoice);
}

async function handleCancelInvoice(id: string, request: Request) {
  await delay(200);
  const idx = localInvoices.findIndex((i) => i.id === id);
  if (idx === -1) return errorResponse(404, 'INVOICE_NOT_FOUND', 'Tax invoice not found');
  if (localInvoices[idx].status !== 'issued' && localInvoices[idx].status !== 'draft') {
    return errorResponse(400, 'INVALID_STATUS', 'Only issued or draft invoices can be cancelled');
  }
  const body = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();
  localInvoices[idx] = {
    ...localInvoices[idx],
    status: 'cancelled',
    cancelled_at: now,
    cancellation_reason: (body.reason as string) || 'Cancelled by admin',
    updated_at: now,
  };
  return wrap(localInvoices[idx]);
}

async function handleVoidInvoice(id: string, request: Request) {
  await delay(200);
  const idx = localInvoices.findIndex((i) => i.id === id);
  if (idx === -1) return errorResponse(404, 'INVOICE_NOT_FOUND', 'Tax invoice not found');
  if (localInvoices[idx].status !== 'issued') {
    return errorResponse(400, 'INVALID_STATUS', 'Only issued invoices can be voided');
  }
  const body = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();
  localInvoices[idx] = {
    ...localInvoices[idx],
    status: 'voided',
    cancelled_at: now,
    cancellation_reason: (body.reason as string) || 'Voided by admin',
    updated_at: now,
  };
  return wrap(localInvoices[idx]);
}

// ────────────────────────────────────────────────────────
// Admin Tax Report endpoints
// ────────────────────────────────────────────────────────

async function handleAdminListReports(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = parseInt(sp.get('limit') || '20', 10);
  const reportType = sp.get('report_type');
  const status = sp.get('status');
  const year = sp.get('year');
  const search = sp.get('search');

  let filtered = [...localReports];
  if (reportType && reportType !== 'all') filtered = filtered.filter((r) => r.report_type === reportType);
  if (status && status !== 'all') filtered = filtered.filter((r) => r.status === status);
  if (year) filtered = filtered.filter((r) => r.period_year === parseInt(year, 10));
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((r) => r.report_number.toLowerCase().includes(s));
  }
  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return paginatedWrap(filtered, page, limit);
}

async function handleAdminReportStats() {
  await delay(150);
  return wrap(computeReportStats(localReports));
}

async function handleGetReport(id: string) {
  await delay(100);
  const report = localReports.find((r) => r.id === id);
  if (!report) return errorResponse(404, 'REPORT_NOT_FOUND', 'Tax report not found');
  return wrap(report);
}

async function handleGenerateReport(request: Request) {
  await delay(400);
  const body = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();
  const reportType = (body.report_type as string) || 'monthly_vat';
  const year = (body.period_year as number) || 2026;
  const month = body.period_month as number | undefined;
  const quarter = body.period_quarter as number | undefined;

  let periodType: MockTaxReport['period_type'] = 'monthly';
  let periodStart = '';
  let periodEnd = '';

  if (reportType === 'quarterly_vat') {
    periodType = 'quarterly';
    const qStart = ((quarter || 1) - 1) * 3 + 1;
    const qEnd = qStart + 2;
    periodStart = `${year}-${String(qStart).padStart(2, '0')}-01T00:00:00Z`;
    const lastDay = new Date(year, qEnd, 0).getDate();
    periodEnd = `${year}-${String(qEnd).padStart(2, '0')}-${lastDay}T23:59:59Z`;
  } else if (reportType === 'annual_income') {
    periodType = 'annual';
    periodStart = `${year}-01-01T00:00:00Z`;
    periodEnd = `${year}-12-31T23:59:59Z`;
  } else {
    periodStart = `${year}-${String(month || 1).padStart(2, '0')}-01T00:00:00Z`;
    const lastDay = new Date(year, month || 1, 0).getDate();
    periodEnd = `${year}-${String(month || 1).padStart(2, '0')}-${lastDay}T23:59:59Z`;
  }

  const typeCode =
    reportType === 'monthly_vat'
      ? 'MONTHVAT'
      : reportType === 'quarterly_vat'
        ? 'QVAT'
        : reportType === 'annual_income'
          ? 'ANNUAL'
          : 'EWT';

  const report: MockTaxReport = {
    id: `txrpt-new-${nextReportId++}`,
    report_number: `TAX-${typeCode}-${year}-${String(nextReportId).padStart(4, '0')}`,
    report_type: reportType as MockTaxReport['report_type'],
    period_type: periodType,
    period_year: year,
    period_month: month || null,
    period_quarter: quarter || null,
    period_start: periodStart,
    period_end: periodEnd,
    total_gross_sales: 1100000 + Math.round(Math.random() * 500000),
    total_vat_collected: 132000 + Math.round(Math.random() * 60000),
    total_ewt_withheld: 22000 + Math.round(Math.random() * 10000),
    total_commissions: 165000 + Math.round(Math.random() * 75000),
    total_refunds: 5000 + Math.round(Math.random() * 10000),
    total_net_revenue: 160000 + Math.round(Math.random() * 65000),
    total_orders: 2800 + Math.round(Math.random() * 1500),
    total_vendors: 5,
    total_settlements: 5,
    breakdown_by_category: {
      grocery: { gross: 650000, vat: 78000, orders: 1800 },
      food: { gross: 300000, vat: 36000, orders: 700 },
      pharmacy: { gross: 150000, vat: 18000, orders: 300 },
    },
    breakdown_by_zone: {
      'Metro Manila': { gross: 800000, vat: 96000, orders: 2000 },
      Cebu: { gross: 180000, vat: 21600, orders: 450 },
      Davao: { gross: 120000, vat: 14400, orders: 350 },
    },
    breakdown_by_method: {
      gcash: { gross: 440000, orders: 1100 },
      card: { gross: 360000, orders: 900 },
      cod: { gross: 200000, orders: 500 },
      maya: { gross: 100000, orders: 300 },
    },
    status: 'draft',
    generated_by: '00000000-0000-0000-0000-000000000001',
    finalized_by: null,
    finalized_at: null,
    filed_at: null,
    filing_reference: null,
    notes: null,
    metadata: {},
    created_at: now,
    updated_at: now,
  };
  localReports.push(report);
  return HttpResponse.json(
    { success: true, data: report, timestamp: now },
    { status: 201 },
  );
}

async function handleFinalizeReport(id: string) {
  await delay(200);
  const idx = localReports.findIndex((r) => r.id === id);
  if (idx === -1) return errorResponse(404, 'REPORT_NOT_FOUND', 'Tax report not found');
  if (localReports[idx].status !== 'draft') {
    return errorResponse(400, 'INVALID_STATUS', 'Only draft reports can be finalized');
  }
  const now = new Date().toISOString();
  localReports[idx] = {
    ...localReports[idx],
    status: 'finalized',
    finalized_by: '00000000-0000-0000-0000-000000000001',
    finalized_at: now,
    updated_at: now,
  };
  return wrap(localReports[idx]);
}

async function handleFileReport(id: string, request: Request) {
  await delay(200);
  const idx = localReports.findIndex((r) => r.id === id);
  if (idx === -1) return errorResponse(404, 'REPORT_NOT_FOUND', 'Tax report not found');
  if (localReports[idx].status !== 'finalized') {
    return errorResponse(400, 'INVALID_STATUS', 'Only finalized reports can be filed');
  }
  const body = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();
  localReports[idx] = {
    ...localReports[idx],
    status: 'filed',
    filed_at: now,
    filing_reference: (body.filing_reference as string) || `BIR-REF-${Date.now()}`,
    notes: (body.notes as string) || localReports[idx].notes,
    updated_at: now,
  };
  return wrap(localReports[idx]);
}

// ────────────────────────────────────────────────────────
// Vendor Tax endpoints (read-only)
// ────────────────────────────────────────────────────────

async function handleVendorTaxSummary() {
  await delay(150);
  // Use first vendor for mock
  const summary = computeVendorTaxSummary('v-001-uuid-store-manila', localInvoices);
  return wrap(summary);
}

async function handleVendorListInvoices(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = parseInt(sp.get('limit') || '20', 10);
  const status = sp.get('status');
  const dateFrom = sp.get('date_from');
  const dateTo = sp.get('date_to');

  // Mock: show invoices for first vendor
  let filtered = localInvoices.filter((i) => i.vendor_id === 'v-001-uuid-store-manila');
  if (status && status !== 'all') filtered = filtered.filter((i) => i.status === status);
  if (dateFrom) filtered = filtered.filter((i) => i.created_at >= dateFrom);
  if (dateTo) filtered = filtered.filter((i) => i.created_at <= dateTo);
  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return paginatedWrap(filtered, page, limit);
}

async function handleVendorGetInvoice(id: string) {
  await delay(100);
  const invoice = localInvoices.find(
    (i) => i.id === id && i.vendor_id === 'v-001-uuid-store-manila',
  );
  if (!invoice) return errorResponse(404, 'INVOICE_NOT_FOUND', 'Tax invoice not found');
  return wrap(invoice);
}

// ────────────────────────────────────────────────────────
// Handler registrations
// ────────────────────────────────────────────────────────

export const taxHandlers = [
  // ── Admin Tax Config endpoints ──
  http.get(`${BASE}/payments/admin/tax/configs/active`, () => handleListActiveConfigs()),
  http.get(`${BASE}/payments/admin/tax/configs/:id`, ({ params }) =>
    handleGetConfig(params.id as string),
  ),
  http.get(`${BASE}/payments/admin/tax/configs`, ({ request }) => handleListConfigs(request)),
  http.post(`${BASE}/payments/admin/tax/configs`, ({ request }) => handleCreateConfig(request)),
  http.patch(`${BASE}/payments/admin/tax/configs/:id`, ({ params, request }) =>
    handleUpdateConfig(params.id as string, request),
  ),
  http.delete(`${BASE}/payments/admin/tax/configs/:id`, ({ params }) =>
    handleDeleteConfig(params.id as string),
  ),

  // ── Admin Tax Invoice endpoints ──
  http.get(`${BASE}/payments/admin/tax/invoice-stats`, () => handleAdminInvoiceStats()),
  http.get(`${BASE}/payments/admin/tax/invoices/:id`, ({ params }) =>
    handleGetInvoice(params.id as string),
  ),
  http.get(`${BASE}/payments/admin/tax/invoices`, ({ request }) =>
    handleAdminListInvoices(request),
  ),
  http.patch(`${BASE}/payments/admin/tax/invoices/:id/cancel`, ({ params, request }) =>
    handleCancelInvoice(params.id as string, request),
  ),
  http.patch(`${BASE}/payments/admin/tax/invoices/:id/void`, ({ params, request }) =>
    handleVoidInvoice(params.id as string, request),
  ),

  // ── Admin Tax Report endpoints ──
  http.get(`${BASE}/payments/admin/tax/report-stats`, () => handleAdminReportStats()),
  http.get(`${BASE}/payments/admin/tax/reports/:id`, ({ params }) =>
    handleGetReport(params.id as string),
  ),
  http.get(`${BASE}/payments/admin/tax/reports`, ({ request }) =>
    handleAdminListReports(request),
  ),
  http.post(`${BASE}/payments/admin/tax/reports/generate`, ({ request }) =>
    handleGenerateReport(request),
  ),
  http.patch(`${BASE}/payments/admin/tax/reports/:id/finalize`, ({ params }) =>
    handleFinalizeReport(params.id as string),
  ),
  http.patch(`${BASE}/payments/admin/tax/reports/:id/file`, ({ params, request }) =>
    handleFileReport(params.id as string, request),
  ),

  // ── Vendor Tax endpoints (read-only) ──
  http.get(`${BASE}/payments/tax/summary`, () => handleVendorTaxSummary()),
  http.get(`${BASE}/payments/tax/invoices/:id`, ({ params }) =>
    handleVendorGetInvoice(params.id as string),
  ),
  http.get(`${BASE}/payments/tax/invoices`, ({ request }) => handleVendorListInvoices(request)),
];
