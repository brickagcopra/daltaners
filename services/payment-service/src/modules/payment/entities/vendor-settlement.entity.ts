import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ schema: 'payments', name: 'vendor_settlements' })
export class VendorSettlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_vendor_settlements_vendor_id')
  @Column({ type: 'uuid' })
  vendor_id: string;

  @Column({ type: 'timestamptz' })
  period_start: Date;

  @Column({ type: 'timestamptz' })
  period_end: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  gross_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  commission_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  net_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  withholding_tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  adjustment_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  final_amount: number;

  @Index('idx_vendor_settlements_status')
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_reference: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  settlement_date: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
