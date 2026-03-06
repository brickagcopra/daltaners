// ── Auth Types ──
export interface User {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  vendor_id?: string;
}

export type UserRole = 'customer' | 'vendor_owner' | 'vendor_staff' | 'delivery' | 'admin';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

// ── Store Types ──
export interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  category: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  rating_average: number;
  rating_count: number;
  minimum_order_value: number;
  preparation_time_minutes: number;
  is_featured: boolean;
  locations: StoreLocation[];
}

export interface StoreLocation {
  id: string;
  address: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  delivery_radius_km: number;
  base_delivery_fee: number;
}

export interface NearbyStore {
  store: Store;
  distance_meters: number;
}

// ── Product Types ──
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  base_price: number;
  sale_price?: number;
  category_id: string;
  category?: Category;
  store_id: string;
  store?: Pick<Store, 'id' | 'name' | 'slug'>;
  images: ProductImage[];
  variants: ProductVariant[];
  rating_average: number;
  rating_count: number;
  total_sold: number;
  status: 'active' | 'inactive' | 'draft';
  dietary_tags?: string[];
  brand?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price_adjustment: number;
  stock_quantity: number;
  attributes?: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  image_url?: string;
  children?: Category[];
}

// ── Cart Types ──
export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  special_instructions?: string;
  substitution_preference?: 'accept_similar' | 'specific' | 'refund';
}

// ── Order Types ──
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  store_id: string;
  store_name?: string;
  status: OrderStatus;
  order_type: 'delivery' | 'pickup';
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  delivery_address?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  store_lat?: number;
  store_lng?: number;
  delivery_person?: {
    id: string;
    name: string;
    phone: string;
    vehicle_type: string;
  };
  coupon_code?: string;
  notes?: string;
  created_at: string;
  confirmed_at?: string;
  prepared_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// ── Address Types ──
export interface Address {
  id: string;
  label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
}

// ── Wallet & Loyalty Types ──
export interface Wallet {
  id: string;
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type: 'topup' | 'payment' | 'refund';
  amount: number;
  balance_after: number;
  description?: string;
  created_at: string;
}

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface LoyaltyAccount {
  id: string;
  points_balance: number;
  lifetime_points: number;
  tier: LoyaltyTier;
  tier_expires_at?: string;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'adjustment';
  points: number;
  balance_after: number;
  description?: string;
  created_at: string;
}

// ── Review Types ──
export interface Review {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  reviewable_type: 'store' | 'product' | 'delivery_personnel';
  reviewable_id: string;
  rating: number;
  title?: string;
  body?: string;
  images?: string[];
  is_verified_purchase: boolean;
  vendor_response?: string;
  helpful_count: number;
  created_at: string;
}

// ── Delivery Types ──
export interface DeliveryInfo {
  id: string;
  order_id: string;
  rider_id: string;
  rider_name: string;
  rider_phone: string;
  vehicle_type: 'motorcycle' | 'bicycle' | 'car';
  status: string;
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  picked_up_at?: string;
  delivered_at?: string;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

// ── API Types ──
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
    statusCode: number;
  };
  timestamp: string;
}

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  next_cursor?: string;
  has_more?: boolean;
}

// ── Vendor Types ──
export interface VendorOrder extends Order {
  customer_name?: string;
  customer_phone?: string;
}

export interface VendorAnalytics {
  revenue: { today: number; week: number; month: number; all_time: number };
  orders: { today: number; week: number; month: number; all_time: number };
  average_order_value: number;
  fulfillment_rate: number;
  avg_preparation_time_minutes: number;
  orders_by_status: Array<{ status: string; count: number }>;
  revenue_by_day: Array<{ date: string; revenue: number }>;
  orders_by_day: Array<{ date: string; count: number }>;
  top_products: Array<{ product_id: string; product_name: string; quantity: number; revenue: number }>;
  peak_hours: Array<{ hour: number; count: number }>;
}

export interface VendorReview {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  order_id?: string;
  reviewable_type: 'store' | 'product' | 'delivery_personnel';
  reviewable_id: string;
  reviewable_name?: string;
  rating: number;
  title?: string;
  body?: string;
  images?: string[];
  is_verified_purchase: boolean;
  vendor_response?: string;
  vendor_response_at?: string;
  helpful_count: number;
  created_at: string;
}

export type VendorDisputeStatus = 'open' | 'vendor_response' | 'customer_reply' | 'under_review' | 'escalated' | 'resolved' | 'closed';
export type VendorDisputePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface VendorDispute {
  id: string;
  dispute_number: string;
  order_id: string;
  customer_id: string;
  store_id: string;
  category: string;
  status: VendorDisputeStatus;
  priority: VendorDisputePriority;
  subject: string;
  description: string;
  evidence_urls?: string[];
  requested_resolution?: string;
  resolution_type?: string;
  resolution_amount?: number;
  vendor_response_deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  store_location_id: string;
  quantity: number;
  reserved_quantity: number;
  reorder_point: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

// ── Delivery Personnel Types ──
export interface DeliveryEarnings {
  today: number;
  this_week: number;
  this_month: number;
  total_deliveries: number;
  average_rating: number;
  acceptance_rate: number;
  completion_rate: number;
}

export interface DeliveryAssignment {
  id: string;
  order_id: string;
  order_number: string;
  store_name: string;
  store_address: string;
  store_lat: number;
  store_lng: number;
  customer_address: string;
  customer_lat: number;
  customer_lng: number;
  customer_phone?: string;
  delivery_fee: number;
  tip_amount: number;
  status: string;
  items_count: number;
  distance_km: number;
  created_at: string;
}

// ── Coupon Types ──
export interface CouponValidationResult {
  valid: boolean;
  coupon_code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  minimum_order_value?: number;
  message?: string;
}

// ── Dispute Types ──
export type DisputeCategory =
  | 'order_not_received'
  | 'item_missing'
  | 'wrong_item'
  | 'damaged_item'
  | 'quality_issue'
  | 'overcharged'
  | 'late_delivery'
  | 'vendor_behavior'
  | 'delivery_behavior'
  | 'unauthorized_charge'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'in_progress'
  | 'pending_vendor'
  | 'pending_customer'
  | 'escalated'
  | 'resolved';

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';

export type DisputeResolution =
  | 'refund'
  | 'partial_refund'
  | 'replacement'
  | 'store_credit'
  | 'apology'
  | 'other';

export interface Dispute {
  id: string;
  dispute_number: string;
  order_id: string;
  order_number?: string;
  customer_id: string;
  store_id: string;
  store_name?: string;
  category: DisputeCategory;
  status: DisputeStatus;
  priority: DisputePriority;
  subject: string;
  description: string;
  evidence_urls?: string[];
  requested_resolution?: DisputeResolution;
  resolution_type?: DisputeResolution;
  resolution_amount?: number;
  resolved_at?: string;
  escalated_at?: string;
  vendor_response_deadline?: string;
  messages?: DisputeMessage[];
  created_at: string;
  updated_at: string;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_type: 'customer' | 'vendor' | 'admin' | 'system';
  sender_name?: string;
  message: string;
  attachments?: string[];
  created_at: string;
}

export interface CreateDisputePayload {
  order_id: string;
  category: DisputeCategory;
  subject: string;
  description: string;
  evidence_urls?: string[];
  requested_resolution?: DisputeResolution;
}

// ── Return Types ──
export type ReturnStatus = 'pending' | 'approved' | 'denied' | 'cancelled' | 'received' | 'refunded' | 'escalated';
export type ReturnReasonCategory = 'defective' | 'wrong_item' | 'damaged' | 'not_as_described' | 'missing_item' | 'expired' | 'change_of_mind' | 'other';
export type ReturnResolution = 'refund' | 'replacement' | 'store_credit';
export type ReturnItemCondition = 'unopened' | 'opened' | 'damaged' | 'defective' | 'unknown';

export interface ReturnItem {
  id: string;
  return_request_id: string;
  order_item_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  condition: ReturnItemCondition;
  restockable: boolean;
  inventory_adjusted: boolean;
}

export interface ReturnRequest {
  id: string;
  order_id: string;
  customer_id: string;
  store_id: string;
  request_number: string;
  status: ReturnStatus;
  reason_category: ReturnReasonCategory;
  reason_details: string | null;
  evidence_urls: string[];
  requested_resolution: ReturnResolution;
  refund_amount: number;
  vendor_response: string | null;
  vendor_responded_at: string | null;
  admin_notes: string | null;
  items: ReturnItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateReturnPayload {
  order_id: string;
  reason_category: ReturnReasonCategory;
  reason_details?: string;
  evidence_urls?: string[];
  requested_resolution?: ReturnResolution;
  items: {
    order_item_id: string;
    quantity: number;
    condition?: ReturnItemCondition;
  }[];
}

// ── Review Payload Types ──
export interface CreateReviewPayload {
  reviewable_type: 'store' | 'product' | 'delivery_personnel';
  reviewable_id: string;
  rating: number;
  title?: string;
  body?: string;
  order_id?: string;
}

// ── Prescription Types ──
export type PrescriptionStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface Prescription {
  id: string;
  customer_id: string;
  image_url: string;
  image_hash: string;
  status: PrescriptionStatus;
  verified_by: string | null;
  verification_notes: string | null;
  doctor_name: string | null;
  doctor_license: string | null;
  prescription_date: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadPrescriptionPayload {
  image_url: string;
  image_hash: string;
  doctor_name?: string;
  doctor_license?: string;
  prescription_date?: string;
}

// ── Vendor Settlement/Financial Types ──
export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VendorSettlement {
  id: string;
  vendor_id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  withholding_tax: number;
  adjustment_amount: number;
  final_amount: number;
  status: SettlementStatus;
  payment_reference: string | null;
  settlement_date: string | null;
  notes: string | null;
  order_count: number;
  created_at: string;
}

export interface VendorSettlementSummary {
  total_earned: number;
  total_paid: number;
  total_pending: number;
  commission_rate: number;
  current_balance: number;
}

export interface VendorTaxSummary {
  total_gross: number;
  total_vat: number;
  total_ewt: number;
  total_commissions: number;
  period_start: string;
  period_end: string;
}

// ── Vendor Performance Types ──
export type PerformanceTier = 'excellent' | 'good' | 'average' | 'poor' | 'critical' | 'unrated';

export interface VendorPerformanceMetrics {
  store_id: string;
  total_orders: number;
  total_revenue: number;
  fulfilled_orders: number;
  cancelled_orders: number;
  fulfillment_rate: number;
  cancellation_rate: number;
  avg_preparation_time_min: number;
  on_time_delivery_rate: number;
  total_returns: number;
  return_rate: number;
  total_disputes: number;
  dispute_rate: number;
  escalation_rate: number;
  avg_rating: number;
  review_count: number;
  review_response_rate: number;
  avg_dispute_response_hours: number;
  performance_score: number;
  performance_tier: PerformanceTier;
  period_days: number;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface VendorPerformanceHistory {
  id: string;
  store_id: string;
  snapshot_date: string;
  performance_score: number;
  performance_tier: PerformanceTier;
  fulfillment_rate: number;
  avg_rating: number;
  total_orders: number;
  total_revenue: number;
}

// ── Vendor Staff Types ──
export type StaffRole = 'manager' | 'staff' | 'cashier';

export interface StoreStaff {
  id: string;
  store_id: string;
  user_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: StaffRole;
  permissions: string[];
  is_active: boolean;
  created_at: string;
}

// ── Vendor Coupon Types ──
export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_delivery';
export type CouponStatus = 'active' | 'inactive' | 'expired';

export interface VendorCoupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  minimum_order_value: number;
  maximum_discount?: number;
  usage_limit?: number;
  usage_count: number;
  per_user_limit: number;
  is_first_order_only: boolean;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

// ── Vendor Campaign/Advertising Types ──
export type CampaignStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'completed' | 'rejected' | 'cancelled' | 'suspended';
export type CampaignType = 'sponsored_product' | 'banner' | 'featured_store';

export interface VendorCampaign {
  id: string;
  store_id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  budget: number;
  daily_budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  valid_from: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
}

export interface VendorCampaignStats {
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  total_conversions: number;
  active_campaigns: number;
  avg_ctr: number;
  avg_roi: number;
}

// ── Vendor Policy Violation Types ──
export type ViolationSeverity = 'warning' | 'minor' | 'major' | 'critical';
export type ViolationStatus = 'pending' | 'acknowledged' | 'appealed' | 'resolved' | 'expired';
export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'denied';

export interface PolicyViolation {
  id: string;
  store_id: string;
  rule_id: string;
  rule_name: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  description: string;
  evidence_urls?: string[];
  penalty_description?: string;
  acknowledged_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyAppeal {
  id: string;
  violation_id: string;
  store_id: string;
  reason: string;
  evidence_urls?: string[];
  status: AppealStatus;
  admin_response?: string;
  created_at: string;
  updated_at: string;
}

export interface ViolationSummary {
  total: number;
  pending: number;
  acknowledged: number;
  appealed: number;
}
