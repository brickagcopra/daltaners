export interface MockCoupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount' | 'free_delivery';
  discount_value: number;
  minimum_order_value: number;
  maximum_discount: number | null;
  applicable_categories: string[] | null;
  applicable_stores: string[] | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  is_first_order_only: boolean;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const coupons: MockCoupon[] = [
  {
    id: 'c0000001-0000-0000-0000-000000000001',
    code: 'WELCOME50',
    name: 'Welcome 50% Off',
    description: '50% off your first order, up to P500 discount',
    discount_type: 'percentage',
    discount_value: 50,
    minimum_order_value: 200,
    maximum_discount: 500,
    applicable_categories: null,
    applicable_stores: null,
    usage_limit: 1000,
    usage_count: 347,
    per_user_limit: 1,
    is_first_order_only: true,
    valid_from: '2026-01-01T00:00:00.000Z',
    valid_until: '2026-12-31T23:59:59.000Z',
    is_active: true,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-02-15T10:00:00.000Z',
  },
  {
    id: 'c0000001-0000-0000-0000-000000000002',
    code: 'SAVE100',
    name: 'Save P100',
    description: 'P100 off on orders P500 and above',
    discount_type: 'fixed_amount',
    discount_value: 100,
    minimum_order_value: 500,
    maximum_discount: null,
    applicable_categories: null,
    applicable_stores: null,
    usage_limit: 5000,
    usage_count: 1203,
    per_user_limit: 3,
    is_first_order_only: false,
    valid_from: '2026-01-15T00:00:00.000Z',
    valid_until: '2026-06-30T23:59:59.000Z',
    is_active: true,
    created_by: null,
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-02-20T14:30:00.000Z',
  },
  {
    id: 'c0000001-0000-0000-0000-000000000003',
    code: 'FREEDEL',
    name: 'Free Delivery',
    description: 'Free delivery on orders P300 and above',
    discount_type: 'free_delivery',
    discount_value: 0,
    minimum_order_value: 300,
    maximum_discount: null,
    applicable_categories: null,
    applicable_stores: null,
    usage_limit: null,
    usage_count: 2891,
    per_user_limit: 5,
    is_first_order_only: false,
    valid_from: '2026-02-01T00:00:00.000Z',
    valid_until: '2026-12-31T23:59:59.000Z',
    is_active: true,
    created_by: null,
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-28T09:15:00.000Z',
  },
  {
    id: 'c0000001-0000-0000-0000-000000000004',
    code: 'SUMMER25',
    name: 'Summer Sale 25%',
    description: '25% off during summer months',
    discount_type: 'percentage',
    discount_value: 25,
    minimum_order_value: 300,
    maximum_discount: 250,
    applicable_categories: null,
    applicable_stores: null,
    usage_limit: 2000,
    usage_count: 0,
    per_user_limit: 2,
    is_first_order_only: false,
    valid_from: '2026-04-01T00:00:00.000Z',
    valid_until: '2026-05-31T23:59:59.000Z',
    is_active: true,
    created_by: null,
    created_at: '2026-02-25T00:00:00.000Z',
    updated_at: '2026-02-25T00:00:00.000Z',
  },
  {
    id: 'c0000001-0000-0000-0000-000000000005',
    code: 'EXPIRED10',
    name: 'Old 10% Discount',
    description: 'Expired promotional coupon',
    discount_type: 'percentage',
    discount_value: 10,
    minimum_order_value: 0,
    maximum_discount: 100,
    applicable_categories: null,
    applicable_stores: null,
    usage_limit: 500,
    usage_count: 489,
    per_user_limit: 1,
    is_first_order_only: false,
    valid_from: '2025-11-01T00:00:00.000Z',
    valid_until: '2025-12-31T23:59:59.000Z',
    is_active: false,
    created_by: null,
    created_at: '2025-11-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
  },
];
