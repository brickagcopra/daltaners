// Dynamic Pricing mock data

export type PricingRuleType = 'time_based' | 'happy_hour' | 'flash_sale' | 'bulk_discount' | 'scheduled_price';
export type PricingDiscountType = 'percentage' | 'fixed_amount' | 'price_override';
export type PricingAppliesTo = 'all_products' | 'specific_products' | 'category' | 'brand';
export type PricingRuleStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'cancelled';
export type PriceChangeType = 'manual' | 'rule_applied' | 'rule_expired' | 'bulk_update' | 'csv_import' | 'scheduled';

export interface PricingSchedule {
  days_of_week?: number[];
  start_time?: string;
  end_time?: string;
}

export interface PricingConditions {
  min_quantity?: number;
  max_quantity?: number;
  min_order_value?: number;
}

export interface MockPricingRule {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  rule_type: PricingRuleType;
  discount_type: PricingDiscountType;
  discount_value: number;
  applies_to: PricingAppliesTo;
  applies_to_ids: string[] | null;
  schedule: PricingSchedule | null;
  conditions: PricingConditions;
  start_date: string;
  end_date: string | null;
  priority: number;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  status: PricingRuleStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MockPriceHistory {
  id: string;
  product_id: string;
  store_id: string;
  old_base_price: number | null;
  new_base_price: number | null;
  old_sale_price: number | null;
  new_sale_price: number | null;
  change_type: PriceChangeType;
  rule_id: string | null;
  changed_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined display fields
  product_name?: string;
  rule_name?: string | null;
}

export interface MockPricingStats {
  total: number;
  draft: number;
  scheduled: number;
  active: number;
  paused: number;
  expired: number;
  cancelled: number;
}

// ── Constants ────────────────────────────────────────────
const STORE_IDS = ['store-001-uuid', 'store-002-uuid', 'store-003-uuid'];
const USER_IDS = ['user-vendor-001', 'user-vendor-002', 'user-vendor-003'];
const PRODUCT_IDS = [
  'prod-001-uuid', 'prod-002-uuid', 'prod-003-uuid',
  'prod-004-uuid', 'prod-005-uuid', 'prod-006-uuid',
];
const CATEGORY_IDS = ['cat-grocery-001', 'cat-snacks-002', 'cat-beverage-003'];
const BRAND_IDS = ['brand-lucky-me', 'brand-nestle', 'brand-san-miguel'];

// ── Pricing Rules ────────────────────────────────────────

export const pricingRules: MockPricingRule[] = [
  {
    id: 'rule-001',
    store_id: STORE_IDS[0],
    name: 'Happy Hour — Snacks 20% Off',
    description: 'Weekday happy hour discount on all snack items from 2PM to 5PM',
    rule_type: 'happy_hour',
    discount_type: 'percentage',
    discount_value: 20,
    applies_to: 'category',
    applies_to_ids: [CATEGORY_IDS[1]],
    schedule: { days_of_week: [1, 2, 3, 4, 5], start_time: '14:00', end_time: '17:00' },
    conditions: {},
    start_date: '2026-02-01T00:00:00.000Z',
    end_date: '2026-06-30T23:59:59.000Z',
    priority: 10,
    is_active: true,
    max_uses: null,
    current_uses: 145,
    status: 'active',
    created_by: USER_IDS[0],
    created_at: '2026-01-28T10:00:00.000Z',
    updated_at: '2026-03-01T14:30:00.000Z',
  },
  {
    id: 'rule-002',
    store_id: STORE_IDS[0],
    name: 'Flash Sale — Lucky Me! Bundle',
    description: 'Flash sale on Lucky Me! brand products — ₱15 off each',
    rule_type: 'flash_sale',
    discount_type: 'fixed_amount',
    discount_value: 15,
    applies_to: 'brand',
    applies_to_ids: [BRAND_IDS[0]],
    schedule: null,
    conditions: { min_quantity: 3 },
    start_date: '2026-03-01T08:00:00.000Z',
    end_date: '2026-03-03T23:59:59.000Z',
    priority: 20,
    is_active: true,
    max_uses: 500,
    current_uses: 287,
    status: 'active',
    created_by: USER_IDS[0],
    created_at: '2026-02-28T15:00:00.000Z',
    updated_at: '2026-03-02T20:00:00.000Z',
  },
  {
    id: 'rule-003',
    store_id: STORE_IDS[0],
    name: 'Weekend Beverage Special',
    description: 'Weekend-only 10% off on all beverages',
    rule_type: 'time_based',
    discount_type: 'percentage',
    discount_value: 10,
    applies_to: 'category',
    applies_to_ids: [CATEGORY_IDS[2]],
    schedule: { days_of_week: [0, 6], start_time: '00:00', end_time: '23:59' },
    conditions: {},
    start_date: '2026-02-15T00:00:00.000Z',
    end_date: null,
    priority: 5,
    is_active: true,
    max_uses: null,
    current_uses: 89,
    status: 'active',
    created_by: USER_IDS[0],
    created_at: '2026-02-14T12:00:00.000Z',
    updated_at: '2026-03-02T16:00:00.000Z',
  },
  {
    id: 'rule-004',
    store_id: STORE_IDS[0],
    name: 'Summer Sale — Store-wide 5%',
    description: 'Scheduled summer sale, 5% off all products',
    rule_type: 'scheduled_price',
    discount_type: 'percentage',
    discount_value: 5,
    applies_to: 'all_products',
    applies_to_ids: null,
    schedule: null,
    conditions: {},
    start_date: '2026-04-01T00:00:00.000Z',
    end_date: '2026-04-30T23:59:59.000Z',
    priority: 1,
    is_active: true,
    max_uses: null,
    current_uses: 0,
    status: 'scheduled',
    created_by: USER_IDS[0],
    created_at: '2026-03-01T09:00:00.000Z',
    updated_at: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'rule-005',
    store_id: STORE_IDS[0],
    name: 'Bulk Buy — Grocery Staples',
    description: 'Buy 5+ grocery items, get ₱25 off each',
    rule_type: 'bulk_discount',
    discount_type: 'fixed_amount',
    discount_value: 25,
    applies_to: 'category',
    applies_to_ids: [CATEGORY_IDS[0]],
    schedule: null,
    conditions: { min_quantity: 5 },
    start_date: '2026-02-20T00:00:00.000Z',
    end_date: null,
    priority: 3,
    is_active: false,
    max_uses: null,
    current_uses: 42,
    status: 'paused',
    created_by: USER_IDS[0],
    created_at: '2026-02-19T14:00:00.000Z',
    updated_at: '2026-02-28T08:00:00.000Z',
  },
  {
    id: 'rule-006',
    store_id: STORE_IDS[1],
    name: 'Lunch Hour Deals',
    description: 'Lunch time 15% off on selected products',
    rule_type: 'happy_hour',
    discount_type: 'percentage',
    discount_value: 15,
    applies_to: 'specific_products',
    applies_to_ids: [PRODUCT_IDS[0], PRODUCT_IDS[1], PRODUCT_IDS[2]],
    schedule: { days_of_week: [1, 2, 3, 4, 5], start_time: '11:00', end_time: '13:00' },
    conditions: {},
    start_date: '2026-02-01T00:00:00.000Z',
    end_date: '2026-05-31T23:59:59.000Z',
    priority: 8,
    is_active: true,
    max_uses: null,
    current_uses: 210,
    status: 'active',
    created_by: USER_IDS[1],
    created_at: '2026-01-30T10:00:00.000Z',
    updated_at: '2026-03-02T12:30:00.000Z',
  },
  {
    id: 'rule-007',
    store_id: STORE_IDS[1],
    name: 'New Year Promo (Expired)',
    description: 'New Year sale — 30% off store-wide',
    rule_type: 'flash_sale',
    discount_type: 'percentage',
    discount_value: 30,
    applies_to: 'all_products',
    applies_to_ids: null,
    schedule: null,
    conditions: {},
    start_date: '2026-01-01T00:00:00.000Z',
    end_date: '2026-01-07T23:59:59.000Z',
    priority: 25,
    is_active: false,
    max_uses: 1000,
    current_uses: 783,
    status: 'expired',
    created_by: USER_IDS[1],
    created_at: '2025-12-28T09:00:00.000Z',
    updated_at: '2026-01-08T00:00:00.000Z',
  },
  {
    id: 'rule-008',
    store_id: STORE_IDS[2],
    name: 'Price Override — Premium Coffee',
    description: 'Set special price of ₱199 for premium coffee during promotion',
    rule_type: 'scheduled_price',
    discount_type: 'price_override',
    discount_value: 199,
    applies_to: 'specific_products',
    applies_to_ids: [PRODUCT_IDS[3]],
    schedule: null,
    conditions: {},
    start_date: '2026-03-01T00:00:00.000Z',
    end_date: '2026-03-15T23:59:59.000Z',
    priority: 15,
    is_active: true,
    max_uses: 100,
    current_uses: 34,
    status: 'active',
    created_by: USER_IDS[2],
    created_at: '2026-02-27T11:00:00.000Z',
    updated_at: '2026-03-02T18:00:00.000Z',
  },
  {
    id: 'rule-009',
    store_id: STORE_IDS[0],
    name: 'Cancelled Test Rule',
    description: 'This rule was cancelled before activation',
    rule_type: 'time_based',
    discount_type: 'percentage',
    discount_value: 8,
    applies_to: 'all_products',
    applies_to_ids: null,
    schedule: null,
    conditions: {},
    start_date: '2026-03-10T00:00:00.000Z',
    end_date: '2026-03-20T23:59:59.000Z',
    priority: 2,
    is_active: false,
    max_uses: null,
    current_uses: 0,
    status: 'cancelled',
    created_by: USER_IDS[0],
    created_at: '2026-03-01T16:00:00.000Z',
    updated_at: '2026-03-02T09:00:00.000Z',
  },
  {
    id: 'rule-010',
    store_id: STORE_IDS[0],
    name: 'Draft — Rainy Season Bundle',
    description: 'Upcoming rainy season promotion — still drafting',
    rule_type: 'bulk_discount',
    discount_type: 'percentage',
    discount_value: 12,
    applies_to: 'category',
    applies_to_ids: [CATEGORY_IDS[0], CATEGORY_IDS[2]],
    schedule: null,
    conditions: { min_quantity: 3, min_order_value: 500 },
    start_date: '2026-06-01T00:00:00.000Z',
    end_date: '2026-08-31T23:59:59.000Z',
    priority: 4,
    is_active: false,
    max_uses: null,
    current_uses: 0,
    status: 'draft',
    created_by: USER_IDS[0],
    created_at: '2026-03-02T14:00:00.000Z',
    updated_at: '2026-03-02T14:00:00.000Z',
  },
];

// ── Price History ────────────────────────────────────────

export const priceHistory: MockPriceHistory[] = [
  {
    id: 'ph-001',
    product_id: PRODUCT_IDS[0],
    store_id: STORE_IDS[0],
    old_base_price: 150,
    new_base_price: 150,
    old_sale_price: null,
    new_sale_price: 120,
    change_type: 'rule_applied',
    rule_id: 'rule-001',
    changed_by: USER_IDS[0],
    metadata: { rule_name: 'Happy Hour — Snacks 20% Off' },
    created_at: '2026-03-01T14:00:00.000Z',
    product_name: 'Piattos Cheese Party Size',
    rule_name: 'Happy Hour — Snacks 20% Off',
  },
  {
    id: 'ph-002',
    product_id: PRODUCT_IDS[0],
    store_id: STORE_IDS[0],
    old_base_price: 150,
    new_base_price: 150,
    old_sale_price: 120,
    new_sale_price: null,
    change_type: 'rule_expired',
    rule_id: 'rule-001',
    changed_by: USER_IDS[0],
    metadata: { rule_name: 'Happy Hour — Snacks 20% Off' },
    created_at: '2026-03-01T17:00:00.000Z',
    product_name: 'Piattos Cheese Party Size',
    rule_name: 'Happy Hour — Snacks 20% Off',
  },
  {
    id: 'ph-003',
    product_id: PRODUCT_IDS[1],
    store_id: STORE_IDS[0],
    old_base_price: 12,
    new_base_price: 14,
    old_sale_price: null,
    new_sale_price: null,
    change_type: 'manual',
    rule_id: null,
    changed_by: USER_IDS[0],
    metadata: { reason: 'Supplier price increase' },
    created_at: '2026-02-28T10:00:00.000Z',
    product_name: 'Lucky Me! Pancit Canton Original',
    rule_name: null,
  },
  {
    id: 'ph-004',
    product_id: PRODUCT_IDS[2],
    store_id: STORE_IDS[0],
    old_base_price: 85,
    new_base_price: 85,
    old_sale_price: null,
    new_sale_price: 60,
    change_type: 'rule_applied',
    rule_id: 'rule-002',
    changed_by: USER_IDS[0],
    metadata: { rule_name: 'Flash Sale — Lucky Me! Bundle' },
    created_at: '2026-03-01T08:00:00.000Z',
    product_name: 'Nestle Bear Brand Fortified Milk 1kg',
    rule_name: 'Flash Sale — Lucky Me! Bundle',
  },
  {
    id: 'ph-005',
    product_id: PRODUCT_IDS[3],
    store_id: STORE_IDS[2],
    old_base_price: 289,
    new_base_price: 289,
    old_sale_price: null,
    new_sale_price: 199,
    change_type: 'rule_applied',
    rule_id: 'rule-008',
    changed_by: USER_IDS[2],
    metadata: { rule_name: 'Price Override — Premium Coffee' },
    created_at: '2026-03-01T00:05:00.000Z',
    product_name: 'Kopiko Brown Coffee 3-in-1 Jumbo Pack',
    rule_name: 'Price Override — Premium Coffee',
  },
  {
    id: 'ph-006',
    product_id: PRODUCT_IDS[4],
    store_id: STORE_IDS[0],
    old_base_price: 45,
    new_base_price: 45,
    old_sale_price: null,
    new_sale_price: 40.5,
    change_type: 'rule_applied',
    rule_id: 'rule-003',
    changed_by: USER_IDS[0],
    metadata: { rule_name: 'Weekend Beverage Special' },
    created_at: '2026-03-02T00:00:00.000Z',
    product_name: 'C2 Green Tea Apple 500ml',
    rule_name: 'Weekend Beverage Special',
  },
  {
    id: 'ph-007',
    product_id: PRODUCT_IDS[4],
    store_id: STORE_IDS[0],
    old_base_price: 45,
    new_base_price: 45,
    old_sale_price: 40.5,
    new_sale_price: null,
    change_type: 'rule_expired',
    rule_id: 'rule-003',
    changed_by: USER_IDS[0],
    metadata: { rule_name: 'Weekend Beverage Special' },
    created_at: '2026-03-02T23:59:00.000Z',
    product_name: 'C2 Green Tea Apple 500ml',
    rule_name: 'Weekend Beverage Special',
  },
  {
    id: 'ph-008',
    product_id: PRODUCT_IDS[5],
    store_id: STORE_IDS[1],
    old_base_price: 250,
    new_base_price: 250,
    old_sale_price: null,
    new_sale_price: 212.5,
    change_type: 'rule_applied',
    rule_id: 'rule-006',
    changed_by: USER_IDS[1],
    metadata: { rule_name: 'Lunch Hour Deals' },
    created_at: '2026-03-02T11:00:00.000Z',
    product_name: 'San Miguel Pale Pilsen 6-Pack',
    rule_name: 'Lunch Hour Deals',
  },
  {
    id: 'ph-009',
    product_id: PRODUCT_IDS[1],
    store_id: STORE_IDS[0],
    old_base_price: 14,
    new_base_price: 14,
    old_sale_price: null,
    new_sale_price: 11.2,
    change_type: 'bulk_update',
    rule_id: null,
    changed_by: USER_IDS[0],
    metadata: { source: 'CSV import', batch_id: 'batch-20260302' },
    created_at: '2026-03-02T09:00:00.000Z',
    product_name: 'Lucky Me! Pancit Canton Original',
    rule_name: null,
  },
  {
    id: 'ph-010',
    product_id: PRODUCT_IDS[0],
    store_id: STORE_IDS[0],
    old_base_price: 150,
    new_base_price: 150,
    old_sale_price: null,
    new_sale_price: 120,
    change_type: 'rule_applied',
    rule_id: 'rule-001',
    changed_by: USER_IDS[0],
    metadata: { rule_name: 'Happy Hour — Snacks 20% Off' },
    created_at: '2026-03-02T14:00:00.000Z',
    product_name: 'Piattos Cheese Party Size',
    rule_name: 'Happy Hour — Snacks 20% Off',
  },
];

// ── Stats Helper ─────────────────────────────────────────

export function computePricingStats(rules: MockPricingRule[]): MockPricingStats {
  return {
    total: rules.length,
    draft: rules.filter((r) => r.status === 'draft').length,
    scheduled: rules.filter((r) => r.status === 'scheduled').length,
    active: rules.filter((r) => r.status === 'active').length,
    paused: rules.filter((r) => r.status === 'paused').length,
    expired: rules.filter((r) => r.status === 'expired').length,
    cancelled: rules.filter((r) => r.status === 'cancelled').length,
  };
}
