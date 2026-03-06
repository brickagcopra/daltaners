// Platform Settings Mock Data

export type SettingCategory = 'general' | 'commerce' | 'payments' | 'security' | 'notifications' | 'feature_flags';

export interface PlatformSettings {
  general: GeneralSettings;
  commerce: CommerceSettings;
  payments: PaymentSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
  feature_flags: FeatureFlag[];
}

export interface GeneralSettings {
  platform_name: string;
  platform_description: string;
  support_email: string;
  support_phone: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  default_locale: string;
  supported_locales: string[];
  timezone: string;
  currency: string;
  currency_symbol: string;
  maintenance_mode: boolean;
  maintenance_message: string;
}

export interface CommerceSettings {
  default_commission_rate: number;
  grocery_commission_rate: number;
  food_commission_rate: number;
  pharmacy_commission_rate: number;
  electronics_commission_rate: number;
  grocery_min_order: number;
  food_min_order: number;
  pharmacy_min_order: number;
  parcel_min_order: number;
  free_delivery_threshold: number;
  standard_delivery_fee: number;
  express_delivery_fee: number;
  scheduled_delivery_fee: number;
  max_concurrent_orders_per_rider: number;
  order_modification_window_minutes: number;
  max_scheduled_days_ahead: number;
  auto_cancel_unpaid_minutes: number;
  vendor_settlement_cycle: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  vendor_settlement_day: number;
}

export interface PaymentSettings {
  enabled_methods: string[];
  stripe_enabled: boolean;
  gcash_enabled: boolean;
  maya_enabled: boolean;
  grabpay_enabled: boolean;
  cod_enabled: boolean;
  wallet_enabled: boolean;
  bank_transfer_enabled: boolean;
  cod_max_amount: number;
  wallet_daily_limit: number;
  wallet_monthly_limit: number;
  refund_auto_approve_max: number;
  refund_approval_required_above: number;
}

export interface SecuritySettings {
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_number: boolean;
  password_require_special: boolean;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  session_timeout_minutes: number;
  mfa_required_for_admin: boolean;
  mfa_required_for_vendor: boolean;
  rate_limit_customer: number;
  rate_limit_vendor: number;
  rate_limit_admin: number;
  rate_limit_public_api: number;
  jwt_access_ttl_minutes: number;
  jwt_refresh_ttl_days: number;
  ip_whitelist_enabled: boolean;
  ip_whitelist: string[];
}

export interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  email_provider: string;
  sms_provider: string;
  push_provider: string;
  order_confirmation_email: boolean;
  order_confirmation_sms: boolean;
  order_confirmation_push: boolean;
  delivery_update_push: boolean;
  promotional_email: boolean;
  promotional_push: boolean;
  vendor_new_order_push: boolean;
  vendor_new_order_sms: boolean;
  low_stock_alert_email: boolean;
  daily_summary_email: boolean;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  updated_at: string;
  updated_by: string;
}

export const featureFlags: FeatureFlag[] = [
  {
    id: 'ff-001',
    key: 'food_delivery',
    name: 'Food Delivery',
    description: 'Enable food delivery service vertical',
    enabled: true,
    category: 'services',
    updated_at: '2026-02-20T10:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-002',
    key: 'pharmacy_delivery',
    name: 'Pharmacy Delivery',
    description: 'Enable pharmacy delivery service vertical with prescription workflow',
    enabled: true,
    category: 'services',
    updated_at: '2026-02-20T10:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-003',
    key: 'car_rental',
    name: 'Car Rental Module',
    description: 'Enable car rental service (Phase 3 feature)',
    enabled: false,
    category: 'services',
    updated_at: '2026-02-15T08:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-004',
    key: 'whatsapp_ordering',
    name: 'WhatsApp Ordering',
    description: 'Enable ordering via WhatsApp Business API',
    enabled: false,
    category: 'channels',
    updated_at: '2026-02-10T14:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-005',
    key: 'ai_recommendations',
    name: 'AI Recommendations',
    description: 'Enable AI-powered product recommendations on customer app',
    enabled: true,
    category: 'ai',
    updated_at: '2026-02-25T09:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-006',
    key: 'dynamic_pricing',
    name: 'Dynamic Pricing',
    description: 'Allow vendors to create time-based and volume-based pricing rules',
    enabled: true,
    category: 'commerce',
    updated_at: '2026-02-22T11:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-007',
    key: 'loyalty_program',
    name: 'Loyalty Program',
    description: 'Enable customer loyalty points and tier system',
    enabled: true,
    category: 'marketing',
    updated_at: '2026-02-18T10:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-008',
    key: 'dark_mode',
    name: 'Dark Mode',
    description: 'Enable dark mode on customer web and mobile apps',
    enabled: false,
    category: 'ui',
    updated_at: '2026-01-30T16:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-009',
    key: 'voice_search',
    name: 'Voice Search',
    description: 'Enable voice search capability in customer app',
    enabled: false,
    category: 'ai',
    updated_at: '2026-01-15T12:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-010',
    key: 'social_commerce',
    name: 'Social Commerce',
    description: 'Enable social sharing and group buying features',
    enabled: false,
    category: 'marketing',
    updated_at: '2026-02-01T09:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-011',
    key: 'b2b_ordering',
    name: 'B2B/Wholesale Ordering',
    description: 'Enable bulk ordering and wholesale pricing for businesses',
    enabled: false,
    category: 'commerce',
    updated_at: '2026-01-20T14:00:00Z',
    updated_by: 'Admin User',
  },
  {
    id: 'ff-012',
    key: 'multi_city',
    name: 'Multi-City Expansion',
    description: 'Enable operations in Cebu and Davao (beyond Metro Manila)',
    enabled: true,
    category: 'operations',
    updated_at: '2026-02-28T08:00:00Z',
    updated_by: 'Admin User',
  },
];

export const platformSettings: PlatformSettings = {
  general: {
    platform_name: 'Daltaners',
    platform_description: 'Filipino O2O E-Commerce & Groceries Platform',
    support_email: 'support@daltaners.ph',
    support_phone: '+63-2-8123-4567',
    logo_url: '/images/logo.png',
    favicon_url: '/images/favicon.ico',
    primary_color: '#FF6B35',
    secondary_color: '#004E89',
    default_locale: 'en',
    supported_locales: ['en', 'fil', 'ceb'],
    timezone: 'Asia/Manila',
    currency: 'PHP',
    currency_symbol: '₱',
    maintenance_mode: false,
    maintenance_message: 'We are currently performing maintenance. Please check back soon.',
  },
  commerce: {
    default_commission_rate: 15,
    grocery_commission_rate: 12,
    food_commission_rate: 22,
    pharmacy_commission_rate: 10,
    electronics_commission_rate: 8,
    grocery_min_order: 200,
    food_min_order: 150,
    pharmacy_min_order: 0,
    parcel_min_order: 100,
    free_delivery_threshold: 500,
    standard_delivery_fee: 49,
    express_delivery_fee: 99,
    scheduled_delivery_fee: 39,
    max_concurrent_orders_per_rider: 3,
    order_modification_window_minutes: 5,
    max_scheduled_days_ahead: 7,
    auto_cancel_unpaid_minutes: 30,
    vendor_settlement_cycle: 'weekly',
    vendor_settlement_day: 1,
  },
  payments: {
    enabled_methods: ['card', 'gcash', 'maya', 'grabpay', 'cod', 'wallet', 'bank_transfer'],
    stripe_enabled: true,
    gcash_enabled: true,
    maya_enabled: true,
    grabpay_enabled: true,
    cod_enabled: true,
    wallet_enabled: true,
    bank_transfer_enabled: true,
    cod_max_amount: 5000,
    wallet_daily_limit: 50000,
    wallet_monthly_limit: 500000,
    refund_auto_approve_max: 500,
    refund_approval_required_above: 2000,
  },
  security: {
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_number: true,
    password_require_special: true,
    max_login_attempts: 5,
    lockout_duration_minutes: 15,
    session_timeout_minutes: 60,
    mfa_required_for_admin: true,
    mfa_required_for_vendor: false,
    rate_limit_customer: 100,
    rate_limit_vendor: 200,
    rate_limit_admin: 300,
    rate_limit_public_api: 60,
    jwt_access_ttl_minutes: 15,
    jwt_refresh_ttl_days: 30,
    ip_whitelist_enabled: false,
    ip_whitelist: [],
  },
  notifications: {
    email_enabled: true,
    sms_enabled: true,
    push_enabled: true,
    whatsapp_enabled: false,
    email_provider: 'sendgrid',
    sms_provider: 'twilio',
    push_provider: 'firebase',
    order_confirmation_email: true,
    order_confirmation_sms: true,
    order_confirmation_push: true,
    delivery_update_push: true,
    promotional_email: true,
    promotional_push: true,
    vendor_new_order_push: true,
    vendor_new_order_sms: true,
    low_stock_alert_email: true,
    daily_summary_email: true,
  },
  feature_flags: featureFlags,
};
