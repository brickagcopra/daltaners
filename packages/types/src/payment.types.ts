import { TransactionType, TransactionStatus, PaymentMethod, SettlementStatus } from './enums';

export interface Transaction {
  id: string;
  order_id: string;
  user_id: string;
  type: TransactionType;
  method: PaymentMethod;
  status: TransactionStatus;
  amount: number;
  currency: string;
  gateway_transaction_id: string | null;
  idempotency_key: string;
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

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
  created_at: string;
}

export interface CreatePaymentIntent {
  order_id: string;
  amount: number;
  method: PaymentMethod;
  idempotency_key: string;
}
