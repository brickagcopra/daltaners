export const adminDashboard = {
  totalUsers: 15420,
  totalVendors: 86,
  totalOrders: 48230,
  totalRevenue: 28450000,
  activeDeliveryPersonnel: 124,
  pendingVendorApprovals: 5,
  todayOrders: 342,
  todayRevenue: 485600,
  pendingOrders: 28,
  cancelledOrders: 7,
  averageOrderValue: 589.83,
  monthlyGrowth: 12.5,
  ordersByStatus: {
    pending: 28,
    confirmed: 45,
    preparing: 32,
    ready: 18,
    picked_up: 12,
    in_transit: 35,
    delivered: 165,
    cancelled: 7,
  },
  ordersByDay: [
    { date: '2026-02-26', count: 310, revenue: 182600 },
    { date: '2026-02-27', count: 328, revenue: 193200 },
    { date: '2026-02-28', count: 345, revenue: 203400 },
    { date: '2026-03-01', count: 362, revenue: 213500 },
    { date: '2026-03-02', count: 318, revenue: 187500 },
    { date: '2026-03-03', count: 295, revenue: 173900 },
    { date: '2026-03-04', count: 342, revenue: 485600 },
  ],
  revenueByMonth: [
    { month: 'Sep 2025', revenue: 1850000 },
    { month: 'Oct 2025', revenue: 2120000 },
    { month: 'Nov 2025', revenue: 2340000 },
    { month: 'Dec 2025', revenue: 3150000 },
    { month: 'Jan 2026', revenue: 2780000 },
    { month: 'Feb 2026', revenue: 2950000 },
  ],
  topStores: [
    { store_id: 'store-006', name: 'Palengke Express QC', orders: 15600, revenue: 4250000 },
    { store_id: 'store-003', name: "Lola's Sari-Sari Store", orders: 12300, revenue: 2100000 },
    { store_id: 'store-005', name: 'Kusina ni Nena', orders: 9800, revenue: 3850000 },
    { store_id: 'store-001', name: 'Metro Mart Makati', orders: 8540, revenue: 5120000 },
    { store_id: 'store-007', name: 'Aling Nida Bakery', orders: 6700, revenue: 1450000 },
  ],
  topCategories: [
    { category: 'Snacks & Canned Goods', orders: 12400 },
    { category: 'Meat & Seafood', orders: 9800 },
    { category: 'Rice & Grains', orders: 8500 },
    { category: 'Beverages', orders: 7200 },
    { category: 'Fruits & Vegetables', orders: 6800 },
  ],
};

// Settlement item type for order-level breakdown
export interface MockSettlementItem {
  id: string;
  settlement_id: string;
  order_id: string;
  order_number: string;
  subtotal: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  delivered_at: string;
}

export interface MockSettlement {
  id: string;
  vendor_id: string;
  vendor_name: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  withholding_tax: number;
  adjustment_amount: number;
  final_amount: number;
  order_count: number;
  status: string;
  notes: string | null;
  approved_by: string | null;
  payment_reference: string | null;
  settlement_date: string | null;
  created_at: string;
}

// Settlement items (order-level breakdown)
export const settlementItems: Record<string, MockSettlementItem[]> = {
  'settle-001': [
    { id: 'si-001', settlement_id: 'settle-001', order_id: 'ord-s1-01', order_number: 'DAL-2026-010201', subtotal: 48500.00, commission_rate: 10, commission_amount: 4850.00, net_amount: 43650.00, delivered_at: '2026-02-03T14:20:00Z' },
    { id: 'si-002', settlement_id: 'settle-001', order_id: 'ord-s1-02', order_number: 'DAL-2026-010312', subtotal: 32000.00, commission_rate: 10, commission_amount: 3200.00, net_amount: 28800.00, delivered_at: '2026-02-05T10:45:00Z' },
    { id: 'si-003', settlement_id: 'settle-001', order_id: 'ord-s1-03', order_number: 'DAL-2026-010445', subtotal: 56500.00, commission_rate: 10, commission_amount: 5650.00, net_amount: 50850.00, delivered_at: '2026-02-07T16:30:00Z' },
    { id: 'si-004', settlement_id: 'settle-001', order_id: 'ord-s1-04', order_number: 'DAL-2026-010598', subtotal: 41000.00, commission_rate: 10, commission_amount: 4100.00, net_amount: 36900.00, delivered_at: '2026-02-10T09:15:00Z' },
    { id: 'si-005', settlement_id: 'settle-001', order_id: 'ord-s1-05', order_number: 'DAL-2026-010721', subtotal: 67000.00, commission_rate: 10, commission_amount: 6700.00, net_amount: 60300.00, delivered_at: '2026-02-14T11:50:00Z' },
  ],
  'settle-002': [
    { id: 'si-006', settlement_id: 'settle-002', order_id: 'ord-s2-01', order_number: 'DAL-2026-020101', subtotal: 38000.00, commission_rate: 10, commission_amount: 3800.00, net_amount: 34200.00, delivered_at: '2026-02-02T12:00:00Z' },
    { id: 'si-007', settlement_id: 'settle-002', order_id: 'ord-s2-02', order_number: 'DAL-2026-020256', subtotal: 52000.00, commission_rate: 10, commission_amount: 5200.00, net_amount: 46800.00, delivered_at: '2026-02-06T15:30:00Z' },
    { id: 'si-008', settlement_id: 'settle-002', order_id: 'ord-s2-03', order_number: 'DAL-2026-020389', subtotal: 44000.00, commission_rate: 10, commission_amount: 4400.00, net_amount: 39600.00, delivered_at: '2026-02-09T13:20:00Z' },
    { id: 'si-009', settlement_id: 'settle-002', order_id: 'ord-s2-04', order_number: 'DAL-2026-020534', subtotal: 48000.00, commission_rate: 10, commission_amount: 4800.00, net_amount: 43200.00, delivered_at: '2026-02-13T10:10:00Z' },
  ],
  'settle-003': [
    { id: 'si-010', settlement_id: 'settle-003', order_id: 'ord-s3-01', order_number: 'DAL-2026-030101', subtotal: 45000.00, commission_rate: 10, commission_amount: 4500.00, net_amount: 40500.00, delivered_at: '2026-02-18T11:00:00Z' },
    { id: 'si-011', settlement_id: 'settle-003', order_id: 'ord-s3-02', order_number: 'DAL-2026-030267', subtotal: 62500.00, commission_rate: 10, commission_amount: 6250.00, net_amount: 56250.00, delivered_at: '2026-02-21T14:30:00Z' },
    { id: 'si-012', settlement_id: 'settle-003', order_id: 'ord-s3-03', order_number: 'DAL-2026-030398', subtotal: 51000.00, commission_rate: 10, commission_amount: 5100.00, net_amount: 45900.00, delivered_at: '2026-02-24T09:45:00Z' },
    { id: 'si-013', settlement_id: 'settle-003', order_id: 'ord-s3-04', order_number: 'DAL-2026-030512', subtotal: 40000.00, commission_rate: 10, commission_amount: 4000.00, net_amount: 36000.00, delivered_at: '2026-02-27T16:15:00Z' },
  ],
  'settle-004': [
    { id: 'si-014', settlement_id: 'settle-004', order_id: 'ord-s4-01', order_number: 'DAL-2026-040101', subtotal: 55000.00, commission_rate: 10, commission_amount: 5500.00, net_amount: 49500.00, delivered_at: '2026-02-17T10:00:00Z' },
    { id: 'si-015', settlement_id: 'settle-004', order_id: 'ord-s4-02', order_number: 'DAL-2026-040234', subtotal: 72000.00, commission_rate: 10, commission_amount: 7200.00, net_amount: 64800.00, delivered_at: '2026-02-20T13:20:00Z' },
    { id: 'si-016', settlement_id: 'settle-004', order_id: 'ord-s4-03', order_number: 'DAL-2026-040378', subtotal: 48000.00, commission_rate: 10, commission_amount: 4800.00, net_amount: 43200.00, delivered_at: '2026-02-23T15:40:00Z' },
    { id: 'si-017', settlement_id: 'settle-004', order_id: 'ord-s4-04', order_number: 'DAL-2026-040456', subtotal: 38000.00, commission_rate: 10, commission_amount: 3800.00, net_amount: 34200.00, delivered_at: '2026-02-25T11:30:00Z' },
    { id: 'si-018', settlement_id: 'settle-004', order_id: 'ord-s4-05', order_number: 'DAL-2026-040589', subtotal: 55000.00, commission_rate: 10, commission_amount: 5500.00, net_amount: 49500.00, delivered_at: '2026-02-28T09:00:00Z' },
  ],
};

export const accountingMockData = {
  transactions: [
    { id: 'txn-001', order_id: 'ord-001', user_id: 'user-001', type: 'charge', method: 'gcash', status: 'completed', amount: 1250.00, currency: 'PHP', gateway_transaction_id: 'gc-abc123', idempotency_key: 'idem-001', metadata: null, created_at: '2026-02-28T10:30:00Z', completed_at: '2026-02-28T10:31:00Z' },
    { id: 'txn-002', order_id: 'ord-002', user_id: 'user-002', type: 'charge', method: 'maya', status: 'completed', amount: 3450.50, currency: 'PHP', gateway_transaction_id: 'my-def456', idempotency_key: 'idem-002', metadata: null, created_at: '2026-02-28T09:15:00Z', completed_at: '2026-02-28T09:16:00Z' },
    { id: 'txn-003', order_id: 'ord-003', user_id: 'user-003', type: 'charge', method: 'cod', status: 'pending', amount: 890.00, currency: 'PHP', gateway_transaction_id: null, idempotency_key: 'idem-003', metadata: null, created_at: '2026-02-28T08:00:00Z', completed_at: null },
    { id: 'txn-004', order_id: 'ord-004', user_id: 'user-001', type: 'refund', method: 'gcash', status: 'completed', amount: 500.00, currency: 'PHP', gateway_transaction_id: 'gc-ref789', idempotency_key: 'idem-004', metadata: null, created_at: '2026-02-27T14:00:00Z', completed_at: '2026-02-27T14:05:00Z' },
    { id: 'txn-005', order_id: 'ord-005', user_id: 'user-004', type: 'charge', method: 'card', status: 'failed', amount: 2100.00, currency: 'PHP', gateway_transaction_id: null, idempotency_key: 'idem-005', metadata: null, created_at: '2026-02-27T11:30:00Z', completed_at: null },
    { id: 'txn-006', order_id: 'ord-006', user_id: 'user-002', type: 'charge', method: 'wallet', status: 'completed', amount: 680.00, currency: 'PHP', gateway_transaction_id: null, idempotency_key: 'idem-006', metadata: null, created_at: '2026-02-27T10:00:00Z', completed_at: '2026-02-27T10:00:30Z' },
    { id: 'txn-007', order_id: 'ord-007', user_id: 'user-003', type: 'charge', method: 'grabpay', status: 'processing', amount: 1560.00, currency: 'PHP', gateway_transaction_id: 'gp-xyz', idempotency_key: 'idem-007', metadata: null, created_at: '2026-02-26T16:45:00Z', completed_at: null },
    { id: 'txn-008', order_id: 'ord-008', user_id: 'user-005', type: 'charge', method: 'bank_transfer', status: 'completed', amount: 4200.00, currency: 'PHP', gateway_transaction_id: 'bt-001', idempotency_key: 'idem-008', metadata: null, created_at: '2026-02-26T09:00:00Z', completed_at: '2026-02-26T09:30:00Z' },
  ],
  transactionStats: {
    total_transactions: 1284,
    total_revenue: 1845600.50,
    total_refunds: 42300.00,
    pending_amount: 128450.00,
    completed_count: 1105,
    failed_count: 38,
    refund_count: 56,
  },
  settlements: [
    { id: 'settle-001', vendor_id: 'vendor-001', vendor_name: 'Metro Mart Makati', period_start: '2026-02-01T00:00:00Z', period_end: '2026-02-15T23:59:59Z', gross_amount: 245000.00, commission_amount: 24500.00, net_amount: 220500.00, withholding_tax: 4410.00, adjustment_amount: 0, final_amount: 216090.00, order_count: 5, status: 'completed', notes: 'Processed on schedule', approved_by: 'admin-001', payment_reference: 'REF-20260216-001', settlement_date: '2026-02-16T10:00:00Z', created_at: '2026-02-16T08:00:00Z' },
    { id: 'settle-002', vendor_id: 'vendor-002', vendor_name: "Lola's Sari-Sari Store", period_start: '2026-02-01T00:00:00Z', period_end: '2026-02-15T23:59:59Z', gross_amount: 182000.00, commission_amount: 18200.00, net_amount: 163800.00, withholding_tax: 3276.00, adjustment_amount: -1500.00, final_amount: 159024.00, order_count: 4, status: 'completed', notes: 'Adjustment: -P1500 for damaged items return', approved_by: 'admin-001', payment_reference: 'REF-20260216-002', settlement_date: '2026-02-16T10:00:00Z', created_at: '2026-02-16T08:00:00Z' },
    { id: 'settle-003', vendor_id: 'vendor-003', vendor_name: 'Kusina ni Nena', period_start: '2026-02-16T00:00:00Z', period_end: '2026-02-28T23:59:59Z', gross_amount: 198500.00, commission_amount: 19850.00, net_amount: 178650.00, withholding_tax: 3573.00, adjustment_amount: 0, final_amount: 175077.00, order_count: 4, status: 'pending', notes: null, approved_by: null, payment_reference: null, settlement_date: null, created_at: '2026-03-01T08:00:00Z' },
    { id: 'settle-004', vendor_id: 'vendor-001', vendor_name: 'Metro Mart Makati', period_start: '2026-02-16T00:00:00Z', period_end: '2026-02-28T23:59:59Z', gross_amount: 268000.00, commission_amount: 26800.00, net_amount: 241200.00, withholding_tax: 4824.00, adjustment_amount: 0, final_amount: 236376.00, order_count: 5, status: 'processing', notes: 'Approved for processing', approved_by: 'admin-001', payment_reference: null, settlement_date: null, created_at: '2026-03-01T08:00:00Z' },
  ] as MockSettlement[],
  settlementStats: {
    total_settlements: 86,
    total_gross: 4250000.00,
    total_commission: 425000.00,
    total_net: 3825000.00,
    pending_count: 12,
    completed_count: 68,
  },
  wallets: [
    { id: 'wallet-001', user_id: 'user-001', balance: 2450.50, currency: 'PHP', is_active: true, daily_limit: 10000, monthly_limit: 50000, created_at: '2026-01-15T08:00:00Z', updated_at: '2026-02-28T10:00:00Z' },
    { id: 'wallet-002', user_id: 'user-002', balance: 850.00, currency: 'PHP', is_active: true, daily_limit: 10000, monthly_limit: 50000, created_at: '2026-01-20T08:00:00Z', updated_at: '2026-02-27T14:00:00Z' },
    { id: 'wallet-003', user_id: 'user-003', balance: 0.00, currency: 'PHP', is_active: false, daily_limit: 10000, monthly_limit: 50000, created_at: '2026-02-01T08:00:00Z', updated_at: '2026-02-15T08:00:00Z' },
    { id: 'wallet-004', user_id: 'user-004', balance: 5200.00, currency: 'PHP', is_active: true, daily_limit: 20000, monthly_limit: 100000, created_at: '2025-12-10T08:00:00Z', updated_at: '2026-02-28T09:00:00Z' },
    { id: 'wallet-005', user_id: 'user-005', balance: 1100.75, currency: 'PHP', is_active: true, daily_limit: 10000, monthly_limit: 50000, created_at: '2026-02-05T08:00:00Z', updated_at: '2026-02-26T16:00:00Z' },
  ],
  walletStats: {
    total_wallets: 3842,
    active_wallets: 3156,
    total_balance: 1245800.50,
    average_balance: 324.25,
  },
};

export const vendorStatsMock = {
  totalStores: 86,
  activeStores: 62,
  pendingStores: 8,
  suspendedStores: 4,
  storesByCategory: [
    { category: 'grocery', count: 28 },
    { category: 'restaurant', count: 22 },
    { category: 'pharmacy', count: 12 },
    { category: 'electronics', count: 8 },
    { category: 'bakery', count: 6 },
    { category: 'convenience_store', count: 5 },
    { category: 'hardware', count: 3 },
    { category: 'pet_supplies', count: 2 },
  ],
  storesByTier: [
    { tier: 'basic', count: 45 },
    { tier: 'premium', count: 28 },
    { tier: 'enterprise', count: 13 },
  ],
  averageRating: 4.3,
  totalOrders: 48230,
};

export const vendorFinancials = {
  summary: {
    total_earned: 1845600.50,
    total_paid_out: 1420300.00,
    total_pending: 425300.50,
    total_commission: 184560.05,
    settlement_count: 12,
  },
  settlements: [
    { id: 'vs-001', vendor_id: 'vendor-001', period_start: '2026-02-16T00:00:00Z', period_end: '2026-02-28T23:59:59Z', gross_amount: 268000.00, commission_amount: 26800.00, net_amount: 241200.00, withholding_tax: 4824.00, adjustment_amount: 0, final_amount: 236376.00, status: 'processing', payment_reference: null, settlement_date: null, created_at: '2026-03-01T08:00:00Z' },
    { id: 'vs-002', vendor_id: 'vendor-001', period_start: '2026-02-01T00:00:00Z', period_end: '2026-02-15T23:59:59Z', gross_amount: 245000.00, commission_amount: 24500.00, net_amount: 220500.00, withholding_tax: 4410.00, adjustment_amount: 0, final_amount: 216090.00, status: 'completed', payment_reference: 'REF-20260216-001', settlement_date: '2026-02-16T10:00:00Z', created_at: '2026-02-16T08:00:00Z' },
    { id: 'vs-003', vendor_id: 'vendor-001', period_start: '2026-01-16T00:00:00Z', period_end: '2026-01-31T23:59:59Z', gross_amount: 198500.00, commission_amount: 19850.00, net_amount: 178650.00, withholding_tax: 3573.00, adjustment_amount: 0, final_amount: 175077.00, status: 'completed', payment_reference: 'REF-20260201-003', settlement_date: '2026-02-01T10:00:00Z', created_at: '2026-02-01T08:00:00Z' },
    { id: 'vs-004', vendor_id: 'vendor-001', period_start: '2026-01-01T00:00:00Z', period_end: '2026-01-15T23:59:59Z', gross_amount: 182000.00, commission_amount: 18200.00, net_amount: 163800.00, withholding_tax: 3276.00, adjustment_amount: -1500.00, final_amount: 159024.00, status: 'completed', payment_reference: 'REF-20260116-002', settlement_date: '2026-01-16T10:00:00Z', created_at: '2026-01-16T08:00:00Z' },
    { id: 'vs-005', vendor_id: 'vendor-001', period_start: '2025-12-16T00:00:00Z', period_end: '2025-12-31T23:59:59Z', gross_amount: 312000.00, commission_amount: 31200.00, net_amount: 280800.00, withholding_tax: 5616.00, adjustment_amount: 0, final_amount: 275184.00, status: 'completed', payment_reference: 'REF-20260101-001', settlement_date: '2026-01-01T10:00:00Z', created_at: '2026-01-01T08:00:00Z' },
    { id: 'vs-006', vendor_id: 'vendor-001', period_start: '2025-12-01T00:00:00Z', period_end: '2025-12-15T23:59:59Z', gross_amount: 225000.00, commission_amount: 22500.00, net_amount: 202500.00, withholding_tax: 4050.00, adjustment_amount: 0, final_amount: 198450.00, status: 'completed', payment_reference: 'REF-20251216-004', settlement_date: '2025-12-16T10:00:00Z', created_at: '2025-12-16T08:00:00Z' },
  ],
  vendorCoupons: [
    { id: 'vc-001', code: 'STORE10', name: 'Store 10% Off', description: '10% off all items in our store', discount_type: 'percentage', discount_value: 10, minimum_order_value: 200, maximum_discount: 200, applicable_categories: null, applicable_stores: ['vendor-001'], usage_limit: 500, usage_count: 145, per_user_limit: 2, is_first_order_only: false, valid_from: '2026-02-01T00:00:00Z', valid_until: '2026-06-30T23:59:59Z', is_active: true, created_by: 'vendor-user-001', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-28T10:00:00Z' },
    { id: 'vc-002', code: 'FREEDEL50', name: 'Free Delivery Over P500', description: 'Free delivery for orders over P500', discount_type: 'free_delivery', discount_value: 0, minimum_order_value: 500, maximum_discount: null, applicable_categories: null, applicable_stores: ['vendor-001'], usage_limit: null, usage_count: 312, per_user_limit: 5, is_first_order_only: false, valid_from: '2026-01-15T00:00:00Z', valid_until: '2026-12-31T23:59:59Z', is_active: true, created_by: 'vendor-user-001', created_at: '2026-01-15T00:00:00Z', updated_at: '2026-02-20T14:30:00Z' },
    { id: 'vc-003', code: 'NEWCUST25', name: 'New Customer 25% Off', description: '25% off your first order at our store', discount_type: 'percentage', discount_value: 25, minimum_order_value: 300, maximum_discount: 300, applicable_categories: null, applicable_stores: ['vendor-001'], usage_limit: 200, usage_count: 78, per_user_limit: 1, is_first_order_only: true, valid_from: '2026-02-15T00:00:00Z', valid_until: '2026-05-31T23:59:59Z', is_active: true, created_by: 'vendor-user-001', created_at: '2026-02-15T00:00:00Z', updated_at: '2026-02-15T00:00:00Z' },
    { id: 'vc-004', code: 'SAVE50PHP', name: 'Save P50', description: 'P50 off on any order', discount_type: 'fixed_amount', discount_value: 50, minimum_order_value: 250, maximum_discount: null, applicable_categories: null, applicable_stores: ['vendor-001'], usage_limit: 1000, usage_count: 567, per_user_limit: 3, is_first_order_only: false, valid_from: '2026-01-01T00:00:00Z', valid_until: '2026-03-31T23:59:59Z', is_active: true, created_by: 'vendor-user-001', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-02-28T09:15:00Z' },
    { id: 'vc-005', code: 'XMAS20', name: 'Christmas 20% Off', description: 'Holiday season special discount', discount_type: 'percentage', discount_value: 20, minimum_order_value: 0, maximum_discount: 150, applicable_categories: null, applicable_stores: ['vendor-001'], usage_limit: 300, usage_count: 298, per_user_limit: 1, is_first_order_only: false, valid_from: '2025-12-01T00:00:00Z', valid_until: '2025-12-31T23:59:59Z', is_active: false, created_by: 'vendor-user-001', created_at: '2025-12-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
  ],
};

// Generate 30-day data arrays for analytics
function generateLast30Days() {
  const days: { date: string; revenue: number; count: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      revenue: Math.floor(15000 + Math.random() * 25000),
      count: Math.floor(10 + Math.random() * 30),
    });
  }
  return days;
}

const last30Days = generateLast30Days();

export const vendorAnalyticsMock = {
  revenue: {
    today: 34500,
    week: 228000,
    month: 918000,
    all_time: 12450000,
  },
  orders: {
    today: 28,
    week: 186,
    month: 745,
    all_time: 8540,
  },
  average_order_value: 1232,
  orders_by_status: [
    { status: 'pending', count: 5 },
    { status: 'confirmed', count: 8 },
    { status: 'preparing', count: 3 },
    { status: 'ready', count: 2 },
    { status: 'in_transit', count: 6 },
    { status: 'delivered', count: 165 },
    { status: 'cancelled', count: 7 },
  ],
  revenue_by_day: last30Days.map(({ date, revenue }) => ({ date, revenue })),
  orders_by_day: last30Days.map(({ date, count }) => ({ date, count })),
  top_products: [
    { product_id: 'prod-018', product_name: 'Jasmine Rice 5kg', quantity: 120, revenue: 42000 },
    { product_id: 'prod-014', product_name: 'Tocino (Sweet Cured Pork)', quantity: 95, revenue: 17575 },
    { product_id: 'prod-022', product_name: 'San Miguel Pale Pilsen (6-pack)', quantity: 88, revenue: 29040 },
    { product_id: 'prod-032', product_name: 'Argentina Corned Beef 260g', quantity: 76, revenue: 5700 },
    { product_id: 'prod-031', product_name: 'Century Tuna Flakes in Oil 180g', quantity: 72, revenue: 3024 },
    { product_id: 'prod-015', product_name: 'Longganisa (Filipino Sausage)', quantity: 68, revenue: 10880 },
    { product_id: 'prod-019', product_name: 'Coconut Vinegar 750ml', quantity: 55, revenue: 4125 },
    { product_id: 'prod-023', product_name: 'Calamansi Juice 1L', quantity: 50, revenue: 3750 },
    { product_id: 'prod-033', product_name: 'Ligo Sardines in Tomato Sauce', quantity: 48, revenue: 1920 },
    { product_id: 'prod-020', product_name: 'Patis (Fish Sauce) 350ml', quantity: 42, revenue: 2310 },
  ],
  fulfillment_rate: 94.2,
  avg_preparation_time_minutes: 18.3,
  peak_hours: [
    { hour: 6, count: 5 },
    { hour: 7, count: 12 },
    { hour: 8, count: 18 },
    { hour: 9, count: 22 },
    { hour: 10, count: 28 },
    { hour: 11, count: 45 },
    { hour: 12, count: 62 },
    { hour: 13, count: 48 },
    { hour: 14, count: 32 },
    { hour: 15, count: 25 },
    { hour: 16, count: 30 },
    { hour: 17, count: 52 },
    { hour: 18, count: 68 },
    { hour: 19, count: 55 },
    { hour: 20, count: 38 },
    { hour: 21, count: 22 },
    { hour: 22, count: 10 },
    { hour: 23, count: 4 },
  ],
};

export const vendorDashboard = {
  todayOrders: 28,
  todayRevenue: 34500,
  pendingOrders: 5,
  preparingOrders: 3,
  weeklyOrders: 186,
  weeklyRevenue: 228000,
  monthlyOrders: 745,
  monthlyRevenue: 918000,
  averageOrderValue: 1232,
  averagePreparationTime: 18,
  rating: 4.6,
  totalReviews: 1243,
  lowStockItems: 4,
  lowStockItemsTrend: 2,
  outOfStockItems: 1,
  todayOrdersTrend: 8.5,
  todayRevenueTrend: 12.3,
  pendingOrdersTrend: -3,
  serviceTypeBreakdown: {
    grocery: 18,
    food: 6,
    pharmacy: 2,
    parcel: 2,
  },
  ordersByDay: [
    { day: 'Mon', orders: 32 },
    { day: 'Tue', orders: 28 },
    { day: 'Wed', orders: 35 },
    { day: 'Thu', orders: 24 },
    { day: 'Fri', orders: 42 },
    { day: 'Sat', orders: 38 },
    { day: 'Sun', orders: 22 },
  ],
  revenueByDay: [
    { day: 'Mon', revenue: 38400 },
    { day: 'Tue', revenue: 32200 },
    { day: 'Wed', revenue: 41500 },
    { day: 'Thu', revenue: 28800 },
    { day: 'Fri', revenue: 52300 },
    { day: 'Sat', revenue: 45600 },
    { day: 'Sun', revenue: 26200 },
  ],
  revenueChart: [
    { date: '2026-02-26', revenue: 32200 },
    { date: '2026-02-27', revenue: 41500 },
    { date: '2026-02-28', revenue: 28800 },
    { date: '2026-03-01', revenue: 52300 },
    { date: '2026-03-02', revenue: 45600 },
    { date: '2026-03-03', revenue: 26200 },
    { date: '2026-03-04', revenue: 34500 },
  ],
  recentOrders: [
    { id: 'ord-v-001', orderNumber: 'DAL-2026-030401', customerName: 'Maria Santos', total: 1250.00, status: 'preparing', createdAt: '2026-03-04T09:15:00Z' },
    { id: 'ord-v-002', orderNumber: 'DAL-2026-030402', customerName: 'Juan Dela Cruz', total: 890.50, status: 'confirmed', createdAt: '2026-03-04T09:00:00Z' },
    { id: 'ord-v-003', orderNumber: 'DAL-2026-030403', customerName: 'Ana Reyes', total: 2100.00, status: 'in_transit', createdAt: '2026-03-04T08:30:00Z' },
    { id: 'ord-v-004', orderNumber: 'DAL-2026-030404', customerName: 'Pedro Garcia', total: 650.00, status: 'delivered', createdAt: '2026-03-04T07:45:00Z' },
    { id: 'ord-v-005', orderNumber: 'DAL-2026-030405', customerName: 'Rosa Mendoza', total: 1580.00, status: 'pending', createdAt: '2026-03-04T07:20:00Z' },
  ],
  topProducts: [
    { product_id: 'prod-018', name: 'Jasmine Rice 5kg', sold: 120, revenue: 42000 },
    { product_id: 'prod-014', name: 'Tocino (Sweet Cured Pork)', sold: 95, revenue: 17575 },
    { product_id: 'prod-022', name: 'San Miguel Pale Pilsen (6-pack)', sold: 88, revenue: 29040 },
    { product_id: 'prod-032', name: 'Argentina Corned Beef 260g', sold: 76, revenue: 5700 },
    { product_id: 'prod-031', name: 'Century Tuna Flakes in Oil 180g', sold: 72, revenue: 3024 },
  ],
};
