import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VendorSettlementEntity } from './vendor-settlement.entity';

export enum InvoiceType {
  OFFICIAL_RECEIPT = 'official_receipt',
  SALES_INVOICE = 'sales_invoice',
  EWT_CERTIFICATE = 'ewt_certificate',
  CREDIT_NOTE = 'credit_note',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  CANCELLED = 'cancelled',
  VOIDED = 'voided',
}

@Entity({ schema: 'payments', name: 'tax_invoices' })
export class TaxInvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_tax_invoices_number', { unique: true })
  @Column({ type: 'varchar', length: 30, unique: true })
  invoice_number: string;

  @Index('idx_tax_invoices_type')
  @Column({ type: 'varchar', length: 30 })
  invoice_type: string;

  @Index('idx_tax_invoices_vendor')
  @Column({ type: 'uuid' })
  vendor_id: string;

  @Column({ type: 'varchar', length: 255 })
  vendor_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vendor_tin: string | null;

  @Column({ type: 'text', nullable: true })
  vendor_address: string | null;

  @Index('idx_tax_invoices_settlement')
  @Column({ type: 'uuid', nullable: true })
  settlement_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  period_start: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  period_end: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  gross_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  vat_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  ewt_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  net_amount: number;

  @Column({ type: 'decimal', precision: 6, scale: 4, default: 0.12 })
  vat_rate: number;

  @Column({ type: 'decimal', precision: 6, scale: 4, default: 0.02 })
  ewt_rate: number;

  @Index('idx_tax_invoices_status')
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  issued_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date | null;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => VendorSettlementEntity, { nullable: true })
  @JoinColumn({ name: 'settlement_id' })
  settlement: VendorSettlementEntity;
}
