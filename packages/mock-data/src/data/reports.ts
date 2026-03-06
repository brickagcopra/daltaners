// ============================================================
// Financial Reports + Audit Log Mock Data
// ============================================================

// ---------- Financial Reports Types ----------

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type RevenueCategory = 'grocery' | 'food' | 'pharmacy' | 'parcel';
export type RefundReason = 'cancelled_by_customer' | 'cancelled_by_vendor' | 'item_damaged' | 'item_missing' | 'wrong_item' | 'quality_issue' | 'late_delivery' | 'other';

export interface RevenueSummary {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  total_delivery_fees: number;
  total_service_fees: number;
  total_commission: number;
  total_refunds: number;
  net_revenue: number;
  growth_rate: number; // percent vs previous period
}

export interface RevenueByPeriod {
  period: string; // e.g., '2026-02-01', '2026-W08', '2026-02'
  revenue: number;
  orders: number;
  avg_order_value: number;
  delivery_fees: number;
  service_fees: number;
  commission: number;
  refunds: number;
  net_revenue: number;
}

export interface RevenueByCategory {
  category: RevenueCategory;
  revenue: number;
  orders: number;
  percentage: number;
  avg_order_value: number;
  growth_rate: number;
}

export interface RevenueByZone {
  zone_id: string;
  zone_name: string;
  city: string;
  revenue: number;
  orders: number;
  percentage: number;
  avg_delivery_time_minutes: number;
}

export interface RevenueByPaymentMethod {
  method: string;
  revenue: number;
  transactions: number;
  percentage: number;
}

export interface SettlementSummary {
  total_settled: number;
  total_pending: number;
  total_processing: number;
  total_failed: number;
  settlement_count: number;
  avg_settlement_amount: number;
  total_commission_collected: number;
  total_tax_withheld: number;
}

export interface FeeSummary {
  total_commission_earned: number;
  total_delivery_fees: number;
  total_service_fees: number;
  total_platform_fees: number;
  commission_by_category: { category: string; amount: number; percentage: number }[];
  avg_commission_rate: number;
}

export interface RefundSummary {
  total_refunds: number;
  total_refund_amount: number;
  avg_refund_amount: number;
  refund_rate: number; // percentage of orders
  refunds_by_reason: { reason: RefundReason; count: number; amount: number; percentage: number }[];
  refunds_by_method: { method: string; count: number; amount: number }[];
}

export interface MockFinancialReport {
  revenue_summary: RevenueSummary;
  revenue_by_period: RevenueByPeriod[];
  revenue_by_category: RevenueByCategory[];
  revenue_by_zone: RevenueByZone[];
  revenue_by_payment_method: RevenueByPaymentMethod[];
  settlement_summary: SettlementSummary;
  fee_summary: FeeSummary;
  refund_summary: RefundSummary;
}

// ---------- Audit Log Types ----------

export type AuditActionType =
  | 'user_create' | 'user_update' | 'user_suspend' | 'user_delete'
  | 'vendor_approve' | 'vendor_suspend' | 'vendor_reject' | 'vendor_update'
  | 'order_cancel' | 'order_refund' | 'order_reassign'
  | 'product_approve' | 'product_reject' | 'product_delete'
  | 'settlement_approve' | 'settlement_process' | 'settlement_reject'
  | 'coupon_create' | 'coupon_update' | 'coupon_delete'
  | 'zone_create' | 'zone_update' | 'zone_delete'
  | 'policy_rule_create' | 'policy_rule_update'
  | 'violation_create' | 'violation_resolve' | 'violation_dismiss'
  | 'appeal_approve' | 'appeal_deny'
  | 'campaign_approve' | 'campaign_reject' | 'campaign_suspend'
  | 'settings_update' | 'role_create' | 'role_update'
  | 'tax_config_update' | 'brand_verify' | 'brand_suspend';

export type AuditResourceType =
  | 'user' | 'vendor' | 'store' | 'order' | 'product'
  | 'settlement' | 'coupon' | 'zone' | 'policy_rule'
  | 'violation' | 'appeal' | 'campaign' | 'settings'
  | 'role' | 'tax_config' | 'brand' | 'category';

export interface AuditChange {
  field: string;
  old_value: string | number | boolean | null;
  new_value: string | number | boolean | null;
}

export interface MockAuditLogEntry {
  id: string;
  timestamp: string;
  admin_user_id: string;
  admin_name: string;
  admin_email: string;
  action_type: AuditActionType;
  resource_type: AuditResourceType;
  resource_id: string;
  resource_name: string;
  description: string;
  ip_address: string;
  user_agent: string;
  changes: AuditChange[];
  metadata: Record<string, unknown>;
}

export interface AuditLogStats {
  total_actions: number;
  actions_today: number;
  unique_admins: number;
  by_action_type: Record<string, number>;
  by_resource_type: Record<string, number>;
  most_active_admin: { name: string; action_count: number };
}

// ---------- Financial Reports Mock Data ----------

export const financialReport: MockFinancialReport = {
  revenue_summary: {
    total_revenue: 4_875_320.50,
    total_orders: 12_480,
    average_order_value: 390.65,
    total_delivery_fees: 624_500.00,
    total_service_fees: 312_250.00,
    total_commission: 731_298.08,
    total_refunds: 195_012.82,
    net_revenue: 1_473_035.26,
    growth_rate: 12.5,
  },
  revenue_by_period: [
    { period: '2026-02-01', revenue: 158_420.00, orders: 405, avg_order_value: 391.16, delivery_fees: 20_250.00, service_fees: 10_125.00, commission: 23_763.00, refunds: 6_336.80, net_revenue: 47_801.20 },
    { period: '2026-02-02', revenue: 142_850.00, orders: 368, avg_order_value: 388.18, delivery_fees: 18_400.00, service_fees: 9_200.00, commission: 21_427.50, refunds: 5_714.00, net_revenue: 43_313.50 },
    { period: '2026-02-03', revenue: 175_600.00, orders: 452, avg_order_value: 388.50, delivery_fees: 22_600.00, service_fees: 11_300.00, commission: 26_340.00, refunds: 7_024.00, net_revenue: 53_216.00 },
    { period: '2026-02-04', revenue: 168_750.00, orders: 430, avg_order_value: 392.44, delivery_fees: 21_500.00, service_fees: 10_750.00, commission: 25_312.50, refunds: 6_750.00, net_revenue: 50_812.50 },
    { period: '2026-02-05', revenue: 189_300.00, orders: 485, avg_order_value: 390.31, delivery_fees: 24_250.00, service_fees: 12_125.00, commission: 28_395.00, refunds: 7_572.00, net_revenue: 57_198.00 },
    { period: '2026-02-06', revenue: 195_500.00, orders: 502, avg_order_value: 389.44, delivery_fees: 25_100.00, service_fees: 12_550.00, commission: 29_325.00, refunds: 7_820.00, net_revenue: 59_155.00 },
    { period: '2026-02-07', revenue: 201_200.00, orders: 510, avg_order_value: 394.51, delivery_fees: 25_500.00, service_fees: 12_750.00, commission: 30_180.00, refunds: 8_048.00, net_revenue: 60_382.00 },
    { period: '2026-02-08', revenue: 155_800.00, orders: 398, avg_order_value: 391.46, delivery_fees: 19_900.00, service_fees: 9_950.00, commission: 23_370.00, refunds: 6_232.00, net_revenue: 46_988.00 },
    { period: '2026-02-09', revenue: 148_350.00, orders: 380, avg_order_value: 390.39, delivery_fees: 19_000.00, service_fees: 9_500.00, commission: 22_252.50, refunds: 5_934.00, net_revenue: 44_818.50 },
    { period: '2026-02-10', revenue: 172_400.00, orders: 442, avg_order_value: 390.05, delivery_fees: 22_100.00, service_fees: 11_050.00, commission: 25_860.00, refunds: 6_896.00, net_revenue: 52_114.00 },
    { period: '2026-02-11', revenue: 180_100.00, orders: 460, avg_order_value: 391.52, delivery_fees: 23_000.00, service_fees: 11_500.00, commission: 27_015.00, refunds: 7_204.00, net_revenue: 54_311.00 },
    { period: '2026-02-12', revenue: 166_800.00, orders: 425, avg_order_value: 392.47, delivery_fees: 21_300.00, service_fees: 10_650.00, commission: 25_020.00, refunds: 6_672.00, net_revenue: 50_298.00 },
    { period: '2026-02-13', revenue: 185_200.00, orders: 475, avg_order_value: 389.89, delivery_fees: 23_750.00, service_fees: 11_875.00, commission: 27_780.00, refunds: 7_408.00, net_revenue: 55_997.00 },
    { period: '2026-02-14', revenue: 210_500.00, orders: 535, avg_order_value: 393.46, delivery_fees: 26_750.00, service_fees: 13_375.00, commission: 31_575.00, refunds: 8_420.00, net_revenue: 63_280.00 },
  ],
  revenue_by_category: [
    { category: 'grocery', revenue: 2_437_660.25, orders: 5_990, percentage: 50.0, avg_order_value: 406.95, growth_rate: 10.2 },
    { category: 'food', revenue: 1_462_596.15, orders: 3_744, percentage: 30.0, avg_order_value: 390.67, growth_rate: 18.5 },
    { category: 'pharmacy', revenue: 731_298.08, orders: 1_872, percentage: 15.0, avg_order_value: 390.65, growth_rate: 8.3 },
    { category: 'parcel', revenue: 243_766.02, orders: 874, percentage: 5.0, avg_order_value: 278.91, growth_rate: 25.0 },
  ],
  revenue_by_zone: [
    { zone_id: 'zone-001', zone_name: 'Makati CBD', city: 'Metro Manila', revenue: 975_064.10, orders: 2_496, percentage: 20.0, avg_delivery_time_minutes: 35 },
    { zone_id: 'zone-002', zone_name: 'BGC & Taguig', city: 'Metro Manila', revenue: 828_804.49, orders: 2_122, percentage: 17.0, avg_delivery_time_minutes: 38 },
    { zone_id: 'zone-003', zone_name: 'Quezon City', city: 'Metro Manila', revenue: 731_298.08, orders: 1_872, percentage: 15.0, avg_delivery_time_minutes: 42 },
    { zone_id: 'zone-004', zone_name: 'Mandaluyong & Pasig', city: 'Metro Manila', revenue: 633_791.67, orders: 1_622, percentage: 13.0, avg_delivery_time_minutes: 40 },
    { zone_id: 'zone-cebu-001', zone_name: 'Cebu City Center', city: 'Cebu', revenue: 487_532.05, orders: 1_248, percentage: 10.0, avg_delivery_time_minutes: 32 },
    { zone_id: 'zone-cebu-002', zone_name: 'Mandaue & Lapu-Lapu', city: 'Cebu', revenue: 341_272.44, orders: 874, percentage: 7.0, avg_delivery_time_minutes: 45 },
    { zone_id: 'zone-davao-001', zone_name: 'Davao City Center', city: 'Davao', revenue: 390_025.64, orders: 998, percentage: 8.0, avg_delivery_time_minutes: 30 },
    { zone_id: 'zone-davao-002', zone_name: 'Davao Suburbs', city: 'Davao', revenue: 487_532.03, orders: 1_248, percentage: 10.0, avg_delivery_time_minutes: 50 },
  ],
  revenue_by_payment_method: [
    { method: 'gcash', revenue: 1_706_362.18, transactions: 4_368, percentage: 35.0 },
    { method: 'card', revenue: 1_218_830.13, transactions: 3_120, percentage: 25.0 },
    { method: 'cod', revenue: 975_064.10, transactions: 2_496, percentage: 20.0 },
    { method: 'maya', revenue: 487_532.05, transactions: 1_248, percentage: 10.0 },
    { method: 'wallet', revenue: 341_272.44, transactions: 874, percentage: 7.0 },
    { method: 'grabpay', revenue: 146_259.60, transactions: 374, percentage: 3.0 },
  ],
  settlement_summary: {
    total_settled: 3_412_724.35,
    total_pending: 731_298.08,
    total_processing: 487_532.05,
    total_failed: 48_753.20,
    settlement_count: 285,
    avg_settlement_amount: 11_974.47,
    total_commission_collected: 731_298.08,
    total_tax_withheld: 97_506.41,
  },
  fee_summary: {
    total_commission_earned: 731_298.08,
    total_delivery_fees: 624_500.00,
    total_service_fees: 312_250.00,
    total_platform_fees: 1_668_048.08,
    commission_by_category: [
      { category: 'Grocery (15%)', amount: 365_649.04, percentage: 50.0 },
      { category: 'Food (22%)', amount: 321_771.14, percentage: 44.0 },
      { category: 'Pharmacy (12%)', amount: 29_251.92, percentage: 4.0 },
      { category: 'Parcel (10%)', amount: 14_625.98, percentage: 2.0 },
    ],
    avg_commission_rate: 15.0,
  },
  refund_summary: {
    total_refunds: 624,
    total_refund_amount: 195_012.82,
    avg_refund_amount: 312.52,
    refund_rate: 5.0,
    refunds_by_reason: [
      { reason: 'cancelled_by_customer', count: 187, amount: 58_503.85, percentage: 30.0 },
      { reason: 'cancelled_by_vendor', count: 125, amount: 39_002.56, percentage: 20.0 },
      { reason: 'item_damaged', count: 94, amount: 29_251.92, percentage: 15.0 },
      { reason: 'item_missing', count: 75, amount: 23_401.54, percentage: 12.0 },
      { reason: 'wrong_item', count: 56, amount: 17_551.15, percentage: 9.0 },
      { reason: 'quality_issue', count: 44, amount: 13_650.90, percentage: 7.0 },
      { reason: 'late_delivery', count: 25, amount: 7_800.51, percentage: 4.0 },
      { reason: 'other', count: 18, amount: 5_850.39, percentage: 3.0 },
    ],
    refunds_by_method: [
      { method: 'Wallet Credit', count: 312, amount: 97_506.41 },
      { method: 'Original Payment', count: 187, amount: 58_503.85 },
      { method: 'GCash Refund', count: 75, amount: 23_401.54 },
      { method: 'Bank Transfer', count: 50, amount: 15_601.02 },
    ],
  },
};

// ---------- Audit Log Mock Data ----------

const adminUsers = [
  { id: 'admin-001', name: 'Carlos Mendoza', email: 'carlos.mendoza@daltaners.ph' },
  { id: 'admin-002', name: 'Maria Santos', email: 'maria.santos@daltaners.ph' },
  { id: 'admin-003', name: 'Jose Reyes', email: 'jose.reyes@daltaners.ph' },
  { id: 'admin-004', name: 'Ana Garcia', email: 'ana.garcia@daltaners.ph' },
  { id: 'admin-005', name: 'Rico Dela Cruz', email: 'rico.delacruz@daltaners.ph' },
];

export const auditLogEntries: MockAuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-02-28T14:32:15.000Z',
    admin_user_id: 'admin-001',
    admin_name: 'Carlos Mendoza',
    admin_email: 'carlos.mendoza@daltaners.ph',
    action_type: 'vendor_approve',
    resource_type: 'vendor',
    resource_id: 'vendor-new-001',
    resource_name: 'Aling Nena Sari-Sari Store',
    description: 'Approved vendor application after document verification',
    ip_address: '203.177.72.45',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0',
    changes: [
      { field: 'status', old_value: 'pending', new_value: 'active' },
      { field: 'commission_rate', old_value: null, new_value: 15 },
      { field: 'subscription_tier', old_value: null, new_value: 'free' },
    ],
    metadata: { approval_notes: 'All documents verified. DTI registration valid.' },
  },
  {
    id: 'audit-002',
    timestamp: '2026-02-28T13:15:42.000Z',
    admin_user_id: 'admin-002',
    admin_name: 'Maria Santos',
    admin_email: 'maria.santos@daltaners.ph',
    action_type: 'order_refund',
    resource_type: 'order',
    resource_id: 'order-refund-001',
    resource_name: 'ORD-2026-014523',
    description: 'Processed full refund for damaged items reported by customer',
    ip_address: '210.213.131.89',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    changes: [
      { field: 'payment_status', old_value: 'captured', new_value: 'refunded' },
      { field: 'status', old_value: 'delivered', new_value: 'refunded' },
    ],
    metadata: { refund_amount: 1250.00, refund_method: 'wallet', reason: 'item_damaged' },
  },
  {
    id: 'audit-003',
    timestamp: '2026-02-28T11:45:30.000Z',
    admin_user_id: 'admin-003',
    admin_name: 'Jose Reyes',
    admin_email: 'jose.reyes@daltaners.ph',
    action_type: 'settlement_approve',
    resource_type: 'settlement',
    resource_id: 'settle-003',
    resource_name: 'Settlement #STTL-2026-0289',
    description: 'Approved weekly settlement for SM Supermarket Makati',
    ip_address: '180.190.38.112',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/122.0',
    changes: [
      { field: 'status', old_value: 'pending', new_value: 'processing' },
      { field: 'approved_by', old_value: null, new_value: 'admin-003' },
    ],
    metadata: { settlement_amount: 45_680.50, vendor_name: 'SM Supermarket Makati' },
  },
  {
    id: 'audit-004',
    timestamp: '2026-02-28T10:20:18.000Z',
    admin_user_id: 'admin-001',
    admin_name: 'Carlos Mendoza',
    admin_email: 'carlos.mendoza@daltaners.ph',
    action_type: 'user_suspend',
    resource_type: 'user',
    resource_id: 'user-suspend-001',
    resource_name: 'Juan Dela Rosa',
    description: 'Suspended user account due to multiple fraudulent order attempts',
    ip_address: '203.177.72.45',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0',
    changes: [
      { field: 'is_active', old_value: true, new_value: false },
      { field: 'suspension_reason', old_value: null, new_value: 'fraud_detected' },
    ],
    metadata: { fraud_score: 92, flagged_orders: 5 },
  },
  {
    id: 'audit-005',
    timestamp: '2026-02-28T09:05:55.000Z',
    admin_user_id: 'admin-004',
    admin_name: 'Ana Garcia',
    admin_email: 'ana.garcia@daltaners.ph',
    action_type: 'campaign_approve',
    resource_type: 'campaign',
    resource_id: 'camp-approve-001',
    resource_name: 'Summer Sale 2026 Campaign',
    description: 'Approved advertising campaign for Mega Sardines',
    ip_address: '119.93.148.22',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/121.0',
    changes: [
      { field: 'status', old_value: 'pending_review', new_value: 'approved' },
    ],
    metadata: { campaign_budget: 25_000.00, campaign_type: 'sponsored_listing' },
  },
  {
    id: 'audit-006',
    timestamp: '2026-02-27T16:48:22.000Z',
    admin_user_id: 'admin-002',
    admin_name: 'Maria Santos',
    admin_email: 'maria.santos@daltaners.ph',
    action_type: 'product_reject',
    resource_type: 'product',
    resource_id: 'prod-reject-001',
    resource_name: 'Suspicious Health Supplement',
    description: 'Rejected product listing due to missing FDA certification',
    ip_address: '210.213.131.89',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    changes: [
      { field: 'status', old_value: 'pending_review', new_value: 'rejected' },
    ],
    metadata: { rejection_reason: 'Missing FDA certification for health supplement claims', vendor_name: 'Generic Health PH' },
  },
  {
    id: 'audit-007',
    timestamp: '2026-02-27T14:30:10.000Z',
    admin_user_id: 'admin-005',
    admin_name: 'Rico Dela Cruz',
    admin_email: 'rico.delacruz@daltaners.ph',
    action_type: 'zone_update',
    resource_type: 'zone',
    resource_id: 'zone-001',
    resource_name: 'Makati CBD Zone',
    description: 'Updated delivery fee and surge multiplier for Makati CBD',
    ip_address: '175.176.44.88',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0',
    changes: [
      { field: 'base_delivery_fee', old_value: 49, new_value: 59 },
      { field: 'per_km_fee', old_value: 8, new_value: 10 },
      { field: 'surge_multiplier', old_value: 1.0, new_value: 1.25 },
    ],
    metadata: { reason: 'Adjusted for increased fuel costs and peak demand' },
  },
  {
    id: 'audit-008',
    timestamp: '2026-02-27T11:15:45.000Z',
    admin_user_id: 'admin-003',
    admin_name: 'Jose Reyes',
    admin_email: 'jose.reyes@daltaners.ph',
    action_type: 'coupon_create',
    resource_type: 'coupon',
    resource_id: 'coupon-new-001',
    resource_name: 'SUMMER2026',
    description: 'Created platform-wide summer promotion coupon — 15% off, min order P500',
    ip_address: '180.190.38.112',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/122.0',
    changes: [
      { field: 'code', old_value: null, new_value: 'SUMMER2026' },
      { field: 'discount_type', old_value: null, new_value: 'percentage' },
      { field: 'discount_value', old_value: null, new_value: 15 },
      { field: 'minimum_order_value', old_value: null, new_value: 500 },
      { field: 'usage_limit', old_value: null, new_value: 10000 },
    ],
    metadata: { valid_from: '2026-03-01', valid_until: '2026-05-31' },
  },
  {
    id: 'audit-009',
    timestamp: '2026-02-27T09:30:00.000Z',
    admin_user_id: 'admin-001',
    admin_name: 'Carlos Mendoza',
    admin_email: 'carlos.mendoza@daltaners.ph',
    action_type: 'vendor_suspend',
    resource_type: 'vendor',
    resource_id: 'vendor-suspend-001',
    resource_name: 'Fake Products Store',
    description: 'Suspended vendor for selling counterfeit products — 3 customer complaints verified',
    ip_address: '203.177.72.45',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0',
    changes: [
      { field: 'status', old_value: 'active', new_value: 'suspended' },
    ],
    metadata: { suspension_reason: 'counterfeit_products', complaint_count: 3, investigation_id: 'INV-2026-0045' },
  },
  {
    id: 'audit-010',
    timestamp: '2026-02-26T17:22:38.000Z',
    admin_user_id: 'admin-004',
    admin_name: 'Ana Garcia',
    admin_email: 'ana.garcia@daltaners.ph',
    action_type: 'settings_update',
    resource_type: 'settings',
    resource_id: 'settings-commerce',
    resource_name: 'Commerce Settings',
    description: 'Updated minimum order values for grocery and food categories',
    ip_address: '119.93.148.22',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/121.0',
    changes: [
      { field: 'grocery_min_order', old_value: 200, new_value: 250 },
      { field: 'food_min_order', old_value: 150, new_value: 100 },
    ],
    metadata: { section: 'commerce', reason: 'Lowering food min to increase order volume' },
  },
  {
    id: 'audit-011',
    timestamp: '2026-02-26T15:10:05.000Z',
    admin_user_id: 'admin-002',
    admin_name: 'Maria Santos',
    admin_email: 'maria.santos@daltaners.ph',
    action_type: 'violation_create',
    resource_type: 'violation',
    resource_id: 'viol-new-001',
    resource_name: 'VIO-2026-0122',
    description: 'Created policy violation for repeatedly selling expired products',
    ip_address: '210.213.131.89',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    changes: [
      { field: 'status', old_value: null, new_value: 'pending' },
      { field: 'severity', old_value: null, new_value: 'high' },
      { field: 'category', old_value: null, new_value: 'product_quality' },
    ],
    metadata: { store_name: 'Budget Groceries', affected_orders: 8 },
  },
  {
    id: 'audit-012',
    timestamp: '2026-02-26T13:45:20.000Z',
    admin_user_id: 'admin-005',
    admin_name: 'Rico Dela Cruz',
    admin_email: 'rico.delacruz@daltaners.ph',
    action_type: 'tax_config_update',
    resource_type: 'tax_config',
    resource_id: 'tax-config-001',
    resource_name: 'Philippine VAT',
    description: 'Updated VAT effective date for new BIR compliance period',
    ip_address: '175.176.44.88',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0',
    changes: [
      { field: 'effective_from', old_value: '2026-01-01', new_value: '2026-03-01' },
      { field: 'description', old_value: 'Standard VAT for all transactions', new_value: 'Standard VAT - BIR 2026 Q1 compliance' },
    ],
    metadata: { tax_rate: 12, bir_reference: 'RR-2026-001' },
  },
  {
    id: 'audit-013',
    timestamp: '2026-02-26T10:08:33.000Z',
    admin_user_id: 'admin-003',
    admin_name: 'Jose Reyes',
    admin_email: 'jose.reyes@daltaners.ph',
    action_type: 'settlement_process',
    resource_type: 'settlement',
    resource_id: 'settle-001',
    resource_name: 'Settlement #STTL-2026-0285',
    description: 'Processed bank transfer for vendor settlement — Robinsons Supermarket',
    ip_address: '180.190.38.112',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/122.0',
    changes: [
      { field: 'status', old_value: 'processing', new_value: 'completed' },
      { field: 'payment_reference', old_value: null, new_value: 'BPI-2026022800145' },
    ],
    metadata: { final_amount: 128_450.00, bank: 'BPI', vendor_name: 'Robinsons Supermarket' },
  },
  {
    id: 'audit-014',
    timestamp: '2026-02-25T16:55:12.000Z',
    admin_user_id: 'admin-001',
    admin_name: 'Carlos Mendoza',
    admin_email: 'carlos.mendoza@daltaners.ph',
    action_type: 'brand_verify',
    resource_type: 'brand',
    resource_id: 'brand-verify-001',
    resource_name: 'Lucky Me!',
    description: 'Verified brand identity — trademark documents confirmed with IPO Philippines',
    ip_address: '203.177.72.45',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0',
    changes: [
      { field: 'status', old_value: 'pending', new_value: 'verified' },
      { field: 'verified_at', old_value: null, new_value: '2026-02-25T16:55:12.000Z' },
    ],
    metadata: { ipo_reference: 'TM-2025-00892', brand_owner: 'Monde Nissin Corporation' },
  },
  {
    id: 'audit-015',
    timestamp: '2026-02-25T14:20:48.000Z',
    admin_user_id: 'admin-004',
    admin_name: 'Ana Garcia',
    admin_email: 'ana.garcia@daltaners.ph',
    action_type: 'role_create',
    resource_type: 'role',
    resource_id: 'role-new-001',
    resource_name: 'Regional Manager',
    description: 'Created new admin role for regional expansion — Cebu & Davao ops management',
    ip_address: '119.93.148.22',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/121.0',
    changes: [
      { field: 'name', old_value: null, new_value: 'Regional Manager' },
      { field: 'permissions', old_value: null, new_value: '12 permissions assigned' },
    ],
    metadata: { permission_count: 12, regions: ['cebu', 'davao'] },
  },
  {
    id: 'audit-016',
    timestamp: '2026-02-25T11:40:30.000Z',
    admin_user_id: 'admin-002',
    admin_name: 'Maria Santos',
    admin_email: 'maria.santos@daltaners.ph',
    action_type: 'appeal_approve',
    resource_type: 'appeal',
    resource_id: 'appeal-approve-001',
    resource_name: 'Appeal #APP-2026-0034',
    description: 'Approved vendor appeal — violation dismissed after evidence review',
    ip_address: '210.213.131.89',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    changes: [
      { field: 'appeal_status', old_value: 'under_review', new_value: 'approved' },
      { field: 'violation_status', old_value: 'appealed', new_value: 'dismissed' },
    ],
    metadata: { store_name: 'Fresh Mart BGC', violation_category: 'late_fulfillment' },
  },
  {
    id: 'audit-017',
    timestamp: '2026-02-25T09:15:00.000Z',
    admin_user_id: 'admin-005',
    admin_name: 'Rico Dela Cruz',
    admin_email: 'rico.delacruz@daltaners.ph',
    action_type: 'order_reassign',
    resource_type: 'order',
    resource_id: 'order-reassign-001',
    resource_name: 'ORD-2026-014298',
    description: 'Reassigned delivery to new rider — original rider reported vehicle breakdown',
    ip_address: '175.176.44.88',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0',
    changes: [
      { field: 'delivery_personnel_id', old_value: 'rider-045', new_value: 'rider-078' },
    ],
    metadata: { old_rider_name: 'Kuya Mike', new_rider_name: 'Kuya Ben', reason: 'vehicle_breakdown' },
  },
  {
    id: 'audit-018',
    timestamp: '2026-02-24T15:30:22.000Z',
    admin_user_id: 'admin-003',
    admin_name: 'Jose Reyes',
    admin_email: 'jose.reyes@daltaners.ph',
    action_type: 'policy_rule_create',
    resource_type: 'policy_rule',
    resource_id: 'rule-new-001',
    resource_name: 'Maximum Response Time',
    description: 'Created new policy rule — vendors must respond to orders within 10 minutes',
    ip_address: '180.190.38.112',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/122.0',
    changes: [
      { field: 'code', old_value: null, new_value: 'MAX_RESPONSE_TIME' },
      { field: 'severity', old_value: null, new_value: 'medium' },
      { field: 'penalty_type', old_value: null, new_value: 'warning' },
      { field: 'max_violations', old_value: null, new_value: 5 },
    ],
    metadata: { category: 'response_time', auto_detect: true },
  },
  {
    id: 'audit-019',
    timestamp: '2026-02-24T12:05:18.000Z',
    admin_user_id: 'admin-001',
    admin_name: 'Carlos Mendoza',
    admin_email: 'carlos.mendoza@daltaners.ph',
    action_type: 'campaign_suspend',
    resource_type: 'campaign',
    resource_id: 'camp-suspend-001',
    resource_name: 'Misleading Promo Campaign',
    description: 'Suspended advertising campaign for misleading discount claims',
    ip_address: '203.177.72.45',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0',
    changes: [
      { field: 'status', old_value: 'active', new_value: 'suspended' },
    ],
    metadata: { suspension_reason: 'Advertised 80% off but actual discount was only 15%', vendor_name: 'Quick Deals PH' },
  },
  {
    id: 'audit-020',
    timestamp: '2026-02-24T09:45:00.000Z',
    admin_user_id: 'admin-004',
    admin_name: 'Ana Garcia',
    admin_email: 'ana.garcia@daltaners.ph',
    action_type: 'zone_create',
    resource_type: 'zone',
    resource_id: 'zone-cebu-003',
    resource_name: 'Cebu South Zone',
    description: 'Created new delivery zone for Cebu expansion — Talisay & Minglanilla',
    ip_address: '119.93.148.22',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/121.0',
    changes: [
      { field: 'name', old_value: null, new_value: 'Cebu South Zone' },
      { field: 'base_delivery_fee', old_value: null, new_value: 59 },
      { field: 'per_km_fee', old_value: null, new_value: 10 },
      { field: 'max_delivery_radius_km', old_value: null, new_value: 12 },
    ],
    metadata: { city: 'Cebu', coverage: ['Talisay', 'Minglanilla'] },
  },
];

// ---------- Helpers ----------

export function computeAuditLogStats(entries: MockAuditLogEntry[]): AuditLogStats {
  const today = new Date().toISOString().slice(0, 10);
  const byAction: Record<string, number> = {};
  const byResource: Record<string, number> = {};
  const byAdmin: Record<string, { name: string; count: number }> = {};
  let actionsToday = 0;
  const uniqueAdmins = new Set<string>();

  for (const entry of entries) {
    byAction[entry.action_type] = (byAction[entry.action_type] || 0) + 1;
    byResource[entry.resource_type] = (byResource[entry.resource_type] || 0) + 1;
    uniqueAdmins.add(entry.admin_user_id);
    if (entry.timestamp.startsWith(today)) actionsToday++;
    if (!byAdmin[entry.admin_user_id]) {
      byAdmin[entry.admin_user_id] = { name: entry.admin_name, count: 0 };
    }
    byAdmin[entry.admin_user_id].count++;
  }

  const mostActive = Object.values(byAdmin).sort((a, b) => b.count - a.count)[0] ?? { name: 'N/A', count: 0 };

  return {
    total_actions: entries.length,
    actions_today: actionsToday,
    unique_admins: uniqueAdmins.size,
    by_action_type: byAction,
    by_resource_type: byResource,
    most_active_admin: { name: mostActive.name, action_count: mostActive.count },
  };
}
