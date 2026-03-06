// POS domain types

export interface Terminal {
  id: string;
  store_id: string;
  name: string;
  terminal_code: string;
  status: 'active' | 'inactive' | 'maintenance';
  hardware_config: Record<string, unknown> | null;
  last_heartbeat_at: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  terminal_id: string;
  cashier_id: string;
  cashier_name: string | null;
  status: 'open' | 'closed' | 'suspended';
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_difference: number | null;
  total_transactions: number;
  total_sales: number;
  total_refunds: number;
  total_voids: number;
  payment_totals: Record<string, number>;
  opened_at: string;
  closed_at: string | null;
  close_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  barcode: string | null;
  sku: string | null;
  unit_price: number;
  quantity: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
}

export interface Transaction {
  id: string;
  transaction_number: string;
  shift_id: string;
  store_id: string;
  terminal_id: string;
  cashier_id: string;
  customer_id: string | null;
  type: 'sale' | 'refund' | 'exchange';
  status: 'completed' | 'voided' | 'pending';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'gcash' | 'maya' | 'wallet';
  payment_details: Record<string, unknown> | null;
  amount_tendered: number;
  change_amount: number;
  original_transaction_id: string | null;
  void_reason: string | null;
  refund_reason: string | null;
  idempotency_key: string | null;
  loyalty_points_earned: number | null;
  loyalty_points_redeemed: number | null;
  metadata: Record<string, unknown>;
  items: TransactionItem[];
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  shift_id: string;
  type: 'cash_in' | 'cash_out' | 'float' | 'pickup';
  amount: number;
  reason: string | null;
  performed_by: string;
  performed_by_name: string | null;
  created_at: string;
}

export interface Receipt {
  id: string;
  transaction_id: string;
  receipt_data: Record<string, unknown>;
  receipt_text: string;
  created_at: string;
}

// POS product (simplified from catalog for POS grid display)
export interface POSProduct {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  sku: string;
  barcode: string | null;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  images: Array<{ url: string; thumbnail_url: string }>;
  unit_type: string;
}

// Cart types
export interface CartItem {
  product_id: string;
  product_name: string;
  sku: string;
  barcode: string | null;
  unit_price: number;
  quantity: number;
  discount_amount: number;
  image_url: string | null;
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
}

// Report types
export interface SalesSummary {
  total_sales: number;
  total_refunds: number;
  total_voids: number;
  net_sales: number;
  total_transactions: number;
  average_transaction: number;
  total_items_sold: number;
  total_tax: number;
  total_discount: number;
}

export interface ProductSale {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  total_sales: number;
}

export interface PaymentBreakdown {
  method: string;
  count: number;
  total: number;
  percentage: number;
}

export interface HourlySale {
  hour: number;
  transactions: number;
  sales: number;
}

export interface CashierPerformance {
  cashier_id: string;
  cashier_name: string;
  transactions: number;
  total_sales: number;
  avg_transaction: number;
}

export interface ShiftSummary extends Shift {
  transactions_count: number;
  total_sales_amount: number;
  total_refunds_amount: number;
  total_voided_amount: number;
}
