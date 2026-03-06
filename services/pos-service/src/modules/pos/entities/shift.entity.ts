import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { TerminalEntity } from './terminal.entity';
import { TransactionEntity } from './transaction.entity';
import { CashMovementEntity } from './cash-movement.entity';

@Entity({ name: 'shifts', schema: 'pos' })
@Index('idx_shifts_terminal_id', ['terminal_id'])
@Index('idx_shifts_cashier_id', ['cashier_id'])
@Index('idx_shifts_status', ['status'])
@Index('idx_shifts_opened_at', ['opened_at'])
export class ShiftEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  terminal_id: string;

  @Column({ type: 'uuid' })
  cashier_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cashier_name: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'open',
  })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  opening_cash: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  closing_cash: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  expected_cash: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cash_difference: number | null;

  @Column({ type: 'integer', default: 0 })
  total_transactions: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_sales: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_refunds: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_voids: number;

  @Column({ type: 'jsonb', default: '{}' })
  payment_totals: Record<string, number>;

  @Column({ type: 'timestamptz' })
  opened_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  close_notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => TerminalEntity, (terminal) => terminal.shifts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'terminal_id' })
  terminal: TerminalEntity;

  @OneToMany(() => TransactionEntity, (tx) => tx.shift)
  transactions: TransactionEntity[];

  @OneToMany(() => CashMovementEntity, (cm) => cm.shift)
  cash_movements: CashMovementEntity[];
}
