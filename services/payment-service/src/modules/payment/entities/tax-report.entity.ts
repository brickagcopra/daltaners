import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TaxReportType {
  MONTHLY_VAT = 'monthly_vat',
  QUARTERLY_VAT = 'quarterly_vat',
  ANNUAL_INCOME = 'annual_income',
  EWT_SUMMARY = 'ewt_summary',
}

export enum TaxPeriodType {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

export enum TaxReportStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
  FILED = 'filed',
  AMENDED = 'amended',
}

@Entity({ schema: 'payments', name: 'tax_reports' })
export class TaxReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_tax_reports_number', { unique: true })
  @Column({ type: 'varchar', length: 30, unique: true })
  report_number: string;

  @Index('idx_tax_reports_type')
  @Column({ type: 'varchar', length: 20 })
  report_type: string;

  @Column({ type: 'varchar', length: 20 })
  period_type: string;

  @Column({ type: 'int' })
  period_year: number;

  @Column({ type: 'int', nullable: true })
  period_month: number | null;

  @Column({ type: 'int', nullable: true })
  period_quarter: number | null;

  @Column({ type: 'timestamptz' })
  period_start: Date;

  @Column({ type: 'timestamptz' })
  period_end: Date;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_gross_sales: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_vat_collected: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_ewt_withheld: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_commissions: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_refunds: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_net_revenue: number;

  @Column({ type: 'int', default: 0 })
  total_orders: number;

  @Column({ type: 'int', default: 0 })
  total_vendors: number;

  @Column({ type: 'int', default: 0 })
  total_settlements: number;

  @Column({ type: 'jsonb', default: '{}' })
  breakdown_by_category: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  breakdown_by_zone: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  breakdown_by_method: Record<string, unknown>;

  @Index('idx_tax_reports_status')
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  generated_by: string | null;

  @Column({ type: 'uuid', nullable: true })
  finalized_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  finalized_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  filed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
