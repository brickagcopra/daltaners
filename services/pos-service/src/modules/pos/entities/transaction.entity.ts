import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ShiftEntity } from './shift.entity';
import { TransactionItemEntity } from './transaction-item.entity';
import { ReceiptEntity } from './receipt.entity';

@Entity({ name: 'transactions', schema: 'pos' })
@Index('idx_transactions_shift_id', ['shift_id'])
@Index('idx_transactions_transaction_number', ['transaction_number'], { unique: true })
@Index('idx_transactions_type', ['type'])
@Index('idx_transactions_status', ['status'])
@Index('idx_transactions_store_id', ['store_id'])
@Index('idx_transactions_created_at', ['created_at'])
@Index('idx_transactions_idempotency_key', ['idempotency_key'], { unique: true, where: 'idempotency_key IS NOT NULL' })
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  transaction_number: string;

  @Column({ type: 'uuid' })
  shift_id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'uuid' })
  terminal_id: string;

  @Column({ type: 'uuid' })
  cashier_id: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'sale',
  })
  type: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'completed',
  })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'varchar', length: 20 })
  payment_method: string;

  @Column({ type: 'jsonb', nullable: true })
  payment_details: Record<string, unknown> | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount_tendered: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  change_amount: number;

  @Column({ type: 'uuid', nullable: true })
  original_transaction_id: string | null;

  @Column({ type: 'text', nullable: true })
  void_reason: string | null;

  @Column({ type: 'text', nullable: true })
  refund_reason: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'integer', nullable: true })
  loyalty_points_earned: number | null;

  @Column({ type: 'integer', nullable: true })
  loyalty_points_redeemed: number | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => ShiftEntity, (shift) => shift.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift: ShiftEntity;

  @OneToMany(() => TransactionItemEntity, (item) => item.transaction, { cascade: true })
  items: TransactionItemEntity[];

  @OneToOne(() => ReceiptEntity, (receipt) => receipt.transaction)
  receipt: ReceiptEntity;
}
