import {
  OrderStatus, OrderType, ServiceType, DeliveryType,
  PaymentMethod, PaymentStatus, SubstitutionPolicy, OrderItemStatus,
} from './enums';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  store_id: string;
  store_location_id: string;
  status: OrderStatus;
  order_type: OrderType;
  service_type: ServiceType;
  delivery_type: DeliveryType;
  scheduled_at: string | null;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  delivery_address: Record<string, unknown>;
  delivery_instructions: string | null;
  substitution_policy: SubstitutionPolicy;
  coupon_id: string | null;
  coupon_code: string | null;
  customer_notes: string | null;
  cancellation_reason: string | null;
  estimated_delivery_at: string | null;
  actual_delivery_at: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  product_image_url: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  discount_amount: number;
  special_instructions: string | null;
  substitution_product_id: string | null;
  status: OrderItemStatus;
}

export interface CreateOrderRequest {
  store_id: string;
  store_location_id: string;
  order_type: OrderType;
  service_type: ServiceType;
  delivery_type: DeliveryType;
  scheduled_at?: string;
  payment_method: PaymentMethod;
  delivery_address: Record<string, unknown>;
  delivery_instructions?: string;
  substitution_policy?: SubstitutionPolicy;
  coupon_code?: string;
  customer_notes?: string;
  tip_amount?: number;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  product_id: string;
  variant_id?: string;
  quantity: number;
  special_instructions?: string;
}
