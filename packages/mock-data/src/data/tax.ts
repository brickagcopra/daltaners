// Tax & Compliance mock data

// ── Types ──────────────────────────────────────────────

export type TaxType = 'vat' | 'ewt' | 'percentage_tax' | 'excise' | 'custom';
export type TaxAppliesTo = 'all' | 'category' | 'zone' | 'vendor_tier';
export type InvoiceType = 'official_receipt' | 'sales_invoice' | 'ewt_certificate' | 'credit_note';
export type InvoiceStatus = 'draft' | 'issued' | 'cancelled' | 'voided';
export type ReportType = 'monthly_vat' | 'quarterly_vat' | 'annual_income' | 'ewt_summary';
export type ReportStatus = 'draft' | 'finalized' | 'filed' | 'amended';
export type PeriodType = 'monthly' | 'quarterly' | 'annual';

export interface MockTaxConfig {
  id: string;
  name: string;
  description: string;
  tax_type: TaxType;
  rate: number;
  applies_to: TaxAppliesTo;
  applies_to_value: string | null;
  is_inclusive: boolean;
  is_active: boolean;
  effective_from: string;
  effective_until: string | null;
  created_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MockTaxInvoice {
  id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  vendor_id: string;
  vendor_name: string;
  vendor_tin: string;
  vendor_address: string;
  settlement_id: string | null;
  order_id: string | null;
  period_start: string;
  period_end: string;
  gross_amount: number;
  vat_amount: number;
  ewt_amount: number;
  net_amount: number;
  vat_rate: number;
  ewt_rate: number;
  status: InvoiceStatus;
  issued_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockTaxReport {
  id: string;
  report_number: string;
  report_type: ReportType;
  period_type: PeriodType;
  period_year: number;
  period_month: number | null;
  period_quarter: number | null;
  period_start: string;
  period_end: string;
  total_gross_sales: number;
  total_vat_collected: number;
  total_ewt_withheld: number;
  total_commissions: number;
  total_refunds: number;
  total_net_revenue: number;
  total_orders: number;
  total_vendors: number;
  total_settlements: number;
  breakdown_by_category: Record<string, unknown>;
  breakdown_by_zone: Record<string, unknown>;
  breakdown_by_method: Record<string, unknown>;
  status: ReportStatus;
  generated_by: string;
  finalized_by: string | null;
  finalized_at: string | null;
  filed_at: string | null;
  filing_reference: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TaxInvoiceStats {
  total_invoices: number;
  issued_count: number;
  draft_count: number;
  cancelled_count: number;
  voided_count: number;
  total_vat_amount: number;
  total_ewt_amount: number;
  total_gross_amount: number;
}

export interface TaxReportStats {
  total_reports: number;
  draft_count: number;
  finalized_count: number;
  filed_count: number;
  amended_count: number;
  total_gross_sales: number;
  total_vat_collected: number;
  total_ewt_withheld: number;
}

export interface VendorTaxSummary {
  vendor_id: string;
  total_gross: number;
  total_vat: number;
  total_ewt: number;
  total_invoices: number;
  total_settlements: number;
  total_commissions: number;
}

// ── Constants ──────────────────────────────────────────

const ADMIN_ID = '00000000-0000-0000-0000-000000000001';

const VENDOR_IDS = [
  'v-001-uuid-store-manila',
  'v-002-uuid-store-cebu',
  'v-003-uuid-store-davao',
  'v-004-uuid-store-quezon',
  'v-005-uuid-store-makati',
];

const VENDOR_NAMES = [
  'Manila Fresh Market',
  'Cebu Grocery Hub',
  'Davao Farm Produce',
  'QC Daily Essentials',
  'Makati Superstore',
];

const VENDOR_TINS = [
  '123-456-789-000',
  '234-567-890-001',
  '345-678-901-002',
  '456-789-012-003',
  '567-890-123-004',
];

const VENDOR_ADDRESSES = [
  '123 Rizal Ave, Ermita, Manila',
  '45 Mango Ave, Cebu City',
  '78 Bolton St, Davao City',
  '321 Commonwealth Ave, Quezon City',
  '99 Ayala Ave, Makati City',
];

// ── Mock Data ──────────────────────────────────────────

export const taxConfigs: MockTaxConfig[] = [
  {
    id: 'txcfg-001',
    name: 'Standard VAT',
    description: 'Philippine standard value-added tax at 12%',
    tax_type: 'vat',
    rate: 0.12,
    applies_to: 'all',
    applies_to_value: null,
    is_inclusive: true,
    is_active: true,
    effective_from: '2026-01-01T00:00:00Z',
    effective_until: null,
    created_by: ADMIN_ID,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'txcfg-002',
    name: 'Expanded Withholding Tax',
    description: 'EWT for vendor settlements at 2%',
    tax_type: 'ewt',
    rate: 0.02,
    applies_to: 'all',
    applies_to_value: null,
    is_inclusive: false,
    is_active: true,
    effective_from: '2026-01-01T00:00:00Z',
    effective_until: null,
    created_by: ADMIN_ID,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'txcfg-003',
    name: 'Grocery Category VAT',
    description: 'Reduced VAT for essential grocery items',
    tax_type: 'vat',
    rate: 0.0,
    applies_to: 'category',
    applies_to_value: 'grocery-essentials',
    is_inclusive: true,
    is_active: true,
    effective_from: '2026-01-01T00:00:00Z',
    effective_until: '2026-12-31T23:59:59Z',
    created_by: ADMIN_ID,
    metadata: { note: 'Tax exemption for basic necessities' },
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'txcfg-004',
    name: 'Platinum Vendor EWT',
    description: 'Reduced EWT for platinum-tier vendors',
    tax_type: 'ewt',
    rate: 0.01,
    applies_to: 'vendor_tier',
    applies_to_value: 'platinum',
    is_inclusive: false,
    is_active: true,
    effective_from: '2026-02-01T00:00:00Z',
    effective_until: null,
    created_by: ADMIN_ID,
    metadata: {},
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-02-01T08:00:00Z',
  },
  {
    id: 'txcfg-005',
    name: 'Metro Manila Zone Excise',
    description: 'Special excise tax for Metro Manila delivery zone',
    tax_type: 'excise',
    rate: 0.005,
    applies_to: 'zone',
    applies_to_value: 'zone-metro-manila',
    is_inclusive: false,
    is_active: false,
    effective_from: '2026-03-01T00:00:00Z',
    effective_until: '2026-06-30T23:59:59Z',
    created_by: ADMIN_ID,
    metadata: { reason: 'Pilot excise tax program' },
    created_at: '2026-02-15T14:00:00Z',
    updated_at: '2026-02-20T09:00:00Z',
  },
  {
    id: 'txcfg-006',
    name: 'Percentage Tax (Non-VAT)',
    description: 'Alternative percentage tax for non-VAT registered sellers',
    tax_type: 'percentage_tax',
    rate: 0.03,
    applies_to: 'vendor_tier',
    applies_to_value: 'free',
    is_inclusive: false,
    is_active: true,
    effective_from: '2026-01-01T00:00:00Z',
    effective_until: null,
    created_by: ADMIN_ID,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

function generateInvoices(): MockTaxInvoice[] {
  const invoices: MockTaxInvoice[] = [];
  const months = ['01', '02'];
  let seq = 1;

  for (const month of months) {
    for (let vi = 0; vi < VENDOR_IDS.length; vi++) {
      const gross = 50000 + Math.round(Math.random() * 150000);
      const vatAmount = Math.round(gross * 0.12 * 100) / 100;
      const ewtAmount = Math.round(gross * 0.02 * 100) / 100;
      const net = Math.round((gross - ewtAmount) * 100) / 100;
      const seqStr = String(seq).padStart(6, '0');
      const isIssued = month === '01' || vi < 3;
      const status: InvoiceStatus = isIssued ? 'issued' : 'draft';

      invoices.push({
        id: `txinv-${month}-${vi + 1}`,
        invoice_number: `EWT-2026${month}-${seqStr}`,
        invoice_type: 'ewt_certificate',
        vendor_id: VENDOR_IDS[vi],
        vendor_name: VENDOR_NAMES[vi],
        vendor_tin: VENDOR_TINS[vi],
        vendor_address: VENDOR_ADDRESSES[vi],
        settlement_id: `stl-2026${month}-${vi + 1}`,
        order_id: null,
        period_start: `2026-${month}-01T00:00:00Z`,
        period_end: `2026-${month}-${month === '02' ? '28' : '31'}T23:59:59Z`,
        gross_amount: gross,
        vat_amount: vatAmount,
        ewt_amount: ewtAmount,
        net_amount: net,
        vat_rate: 0.12,
        ewt_rate: 0.02,
        status,
        issued_at: isIssued ? `2026-${month === '01' ? '02' : '03'}-05T10:00:00Z` : null,
        cancelled_at: null,
        cancellation_reason: null,
        created_at: `2026-${month === '01' ? '02' : '03'}-01T08:00:00Z`,
        updated_at: `2026-${month === '01' ? '02' : '03'}-05T10:00:00Z`,
      });
      seq++;
    }
  }

  // Add a cancelled invoice
  invoices.push({
    id: 'txinv-cancelled-1',
    invoice_number: 'EWT-202601-900001',
    invoice_type: 'ewt_certificate',
    vendor_id: VENDOR_IDS[0],
    vendor_name: VENDOR_NAMES[0],
    vendor_tin: VENDOR_TINS[0],
    vendor_address: VENDOR_ADDRESSES[0],
    settlement_id: 'stl-202601-cancelled',
    order_id: null,
    period_start: '2026-01-01T00:00:00Z',
    period_end: '2026-01-31T23:59:59Z',
    gross_amount: 25000,
    vat_amount: 3000,
    ewt_amount: 500,
    net_amount: 24500,
    vat_rate: 0.12,
    ewt_rate: 0.02,
    status: 'cancelled',
    issued_at: '2026-02-01T10:00:00Z',
    cancelled_at: '2026-02-10T14:00:00Z',
    cancellation_reason: 'Settlement reversed due to dispute resolution',
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-02-10T14:00:00Z',
  });

  // Add a credit note
  invoices.push({
    id: 'txinv-credit-1',
    invoice_number: 'EWT-202602-800001',
    invoice_type: 'credit_note',
    vendor_id: VENDOR_IDS[1],
    vendor_name: VENDOR_NAMES[1],
    vendor_tin: VENDOR_TINS[1],
    vendor_address: VENDOR_ADDRESSES[1],
    settlement_id: null,
    order_id: 'ord-refund-001',
    period_start: '2026-02-01T00:00:00Z',
    period_end: '2026-02-28T23:59:59Z',
    gross_amount: -5000,
    vat_amount: -600,
    ewt_amount: -100,
    net_amount: -4900,
    vat_rate: 0.12,
    ewt_rate: 0.02,
    status: 'issued',
    issued_at: '2026-02-20T10:00:00Z',
    cancelled_at: null,
    cancellation_reason: null,
    created_at: '2026-02-20T08:00:00Z',
    updated_at: '2026-02-20T10:00:00Z',
  });

  return invoices;
}

export const taxInvoices: MockTaxInvoice[] = generateInvoices();

export const taxReports: MockTaxReport[] = [
  {
    id: 'txrpt-001',
    report_number: 'TAX-MONTHVAT-2026-0001',
    report_type: 'monthly_vat',
    period_type: 'monthly',
    period_year: 2026,
    period_month: 1,
    period_quarter: null,
    period_start: '2026-01-01T00:00:00Z',
    period_end: '2026-01-31T23:59:59Z',
    total_gross_sales: 1250000,
    total_vat_collected: 150000,
    total_ewt_withheld: 25000,
    total_commissions: 187500,
    total_refunds: 12500,
    total_net_revenue: 175000,
    total_orders: 3200,
    total_vendors: 5,
    total_settlements: 5,
    breakdown_by_category: {
      grocery: { gross: 750000, vat: 90000, orders: 2000 },
      food: { gross: 350000, vat: 42000, orders: 800 },
      pharmacy: { gross: 150000, vat: 18000, orders: 400 },
    },
    breakdown_by_zone: {
      'Metro Manila': { gross: 900000, vat: 108000, orders: 2300 },
      Cebu: { gross: 200000, vat: 24000, orders: 500 },
      Davao: { gross: 150000, vat: 18000, orders: 400 },
    },
    breakdown_by_method: {
      gcash: { gross: 500000, orders: 1300 },
      card: { gross: 400000, orders: 1000 },
      cod: { gross: 250000, orders: 600 },
      maya: { gross: 100000, orders: 300 },
    },
    status: 'filed',
    generated_by: ADMIN_ID,
    finalized_by: ADMIN_ID,
    finalized_at: '2026-02-10T10:00:00Z',
    filed_at: '2026-02-15T14:00:00Z',
    filing_reference: 'BIR-VAT-2026-01-REF-001',
    notes: 'January 2026 monthly VAT return filed on time',
    metadata: {},
    created_at: '2026-02-05T08:00:00Z',
    updated_at: '2026-02-15T14:00:00Z',
  },
  {
    id: 'txrpt-002',
    report_number: 'TAX-MONTHVAT-2026-0002',
    report_type: 'monthly_vat',
    period_type: 'monthly',
    period_year: 2026,
    period_month: 2,
    period_quarter: null,
    period_start: '2026-02-01T00:00:00Z',
    period_end: '2026-02-28T23:59:59Z',
    total_gross_sales: 1380000,
    total_vat_collected: 165600,
    total_ewt_withheld: 27600,
    total_commissions: 207000,
    total_refunds: 8500,
    total_net_revenue: 198500,
    total_orders: 3500,
    total_vendors: 5,
    total_settlements: 5,
    breakdown_by_category: {
      grocery: { gross: 820000, vat: 98400, orders: 2200 },
      food: { gross: 380000, vat: 45600, orders: 850 },
      pharmacy: { gross: 180000, vat: 21600, orders: 450 },
    },
    breakdown_by_zone: {
      'Metro Manila': { gross: 1000000, vat: 120000, orders: 2500 },
      Cebu: { gross: 220000, vat: 26400, orders: 550 },
      Davao: { gross: 160000, vat: 19200, orders: 450 },
    },
    breakdown_by_method: {
      gcash: { gross: 560000, orders: 1400 },
      card: { gross: 440000, orders: 1100 },
      cod: { gross: 260000, orders: 650 },
      maya: { gross: 120000, orders: 350 },
    },
    status: 'finalized',
    generated_by: ADMIN_ID,
    finalized_by: ADMIN_ID,
    finalized_at: '2026-03-02T10:00:00Z',
    filed_at: null,
    filing_reference: null,
    notes: 'February 2026 monthly VAT — ready for filing',
    metadata: {},
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-02T10:00:00Z',
  },
  {
    id: 'txrpt-003',
    report_number: 'TAX-QVAT-2026-0001',
    report_type: 'quarterly_vat',
    period_type: 'quarterly',
    period_year: 2026,
    period_month: null,
    period_quarter: 1,
    period_start: '2026-01-01T00:00:00Z',
    period_end: '2026-03-31T23:59:59Z',
    total_gross_sales: 2630000,
    total_vat_collected: 315600,
    total_ewt_withheld: 52600,
    total_commissions: 394500,
    total_refunds: 21000,
    total_net_revenue: 373500,
    total_orders: 6700,
    total_vendors: 5,
    total_settlements: 10,
    breakdown_by_category: {
      grocery: { gross: 1570000, vat: 188400, orders: 4200 },
      food: { gross: 730000, vat: 87600, orders: 1650 },
      pharmacy: { gross: 330000, vat: 39600, orders: 850 },
    },
    breakdown_by_zone: {
      'Metro Manila': { gross: 1900000, vat: 228000, orders: 4800 },
      Cebu: { gross: 420000, vat: 50400, orders: 1050 },
      Davao: { gross: 310000, vat: 37200, orders: 850 },
    },
    breakdown_by_method: {
      gcash: { gross: 1060000, orders: 2700 },
      card: { gross: 840000, orders: 2100 },
      cod: { gross: 510000, orders: 1250 },
      maya: { gross: 220000, orders: 650 },
    },
    status: 'draft',
    generated_by: ADMIN_ID,
    finalized_by: null,
    finalized_at: null,
    filed_at: null,
    filing_reference: null,
    notes: 'Q1 2026 quarterly VAT — awaiting finalization',
    metadata: {},
    created_at: '2026-03-02T08:00:00Z',
    updated_at: '2026-03-02T08:00:00Z',
  },
  {
    id: 'txrpt-004',
    report_number: 'TAX-EWT-2026-0001',
    report_type: 'ewt_summary',
    period_type: 'monthly',
    period_year: 2026,
    period_month: 1,
    period_quarter: null,
    period_start: '2026-01-01T00:00:00Z',
    period_end: '2026-01-31T23:59:59Z',
    total_gross_sales: 1250000,
    total_vat_collected: 0,
    total_ewt_withheld: 25000,
    total_commissions: 187500,
    total_refunds: 0,
    total_net_revenue: 162500,
    total_orders: 3200,
    total_vendors: 5,
    total_settlements: 5,
    breakdown_by_category: {},
    breakdown_by_zone: {},
    breakdown_by_method: {},
    status: 'filed',
    generated_by: ADMIN_ID,
    finalized_by: ADMIN_ID,
    finalized_at: '2026-02-10T10:00:00Z',
    filed_at: '2026-02-15T14:30:00Z',
    filing_reference: 'BIR-EWT-2026-01-REF-001',
    notes: 'January 2026 EWT summary — filed',
    metadata: {},
    created_at: '2026-02-05T08:00:00Z',
    updated_at: '2026-02-15T14:30:00Z',
  },
];

// ── Stats Helpers ──────────────────────────────────────

export function computeInvoiceStats(invoices: MockTaxInvoice[]): TaxInvoiceStats {
  return {
    total_invoices: invoices.length,
    issued_count: invoices.filter((i) => i.status === 'issued').length,
    draft_count: invoices.filter((i) => i.status === 'draft').length,
    cancelled_count: invoices.filter((i) => i.status === 'cancelled').length,
    voided_count: invoices.filter((i) => i.status === 'voided').length,
    total_vat_amount: invoices.reduce((s, i) => s + Math.abs(i.vat_amount), 0),
    total_ewt_amount: invoices.reduce((s, i) => s + Math.abs(i.ewt_amount), 0),
    total_gross_amount: invoices.reduce((s, i) => s + Math.abs(i.gross_amount), 0),
  };
}

export function computeReportStats(reports: MockTaxReport[]): TaxReportStats {
  return {
    total_reports: reports.length,
    draft_count: reports.filter((r) => r.status === 'draft').length,
    finalized_count: reports.filter((r) => r.status === 'finalized').length,
    filed_count: reports.filter((r) => r.status === 'filed').length,
    amended_count: reports.filter((r) => r.status === 'amended').length,
    total_gross_sales: reports.reduce((s, r) => s + r.total_gross_sales, 0),
    total_vat_collected: reports.reduce((s, r) => s + r.total_vat_collected, 0),
    total_ewt_withheld: reports.reduce((s, r) => s + r.total_ewt_withheld, 0),
  };
}

export function computeVendorTaxSummary(
  vendorId: string,
  invoices: MockTaxInvoice[],
): VendorTaxSummary {
  const vendorInvoices = invoices.filter((i) => i.vendor_id === vendorId);
  return {
    vendor_id: vendorId,
    total_gross: vendorInvoices.reduce((s, i) => s + Math.abs(i.gross_amount), 0),
    total_vat: vendorInvoices.reduce((s, i) => s + Math.abs(i.vat_amount), 0),
    total_ewt: vendorInvoices.reduce((s, i) => s + Math.abs(i.ewt_amount), 0),
    total_invoices: vendorInvoices.length,
    total_settlements: vendorInvoices.filter((i) => i.settlement_id).length,
    total_commissions: Math.round(
      vendorInvoices.reduce((s, i) => s + Math.abs(i.gross_amount) * 0.15, 0) * 100,
    ) / 100,
  };
}
