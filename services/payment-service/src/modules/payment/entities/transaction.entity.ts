import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ schema: 'payments', name: 'transactions' })
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_transactions_order_id')
  @Column({ type: 'uuid' })
  order_id: string;

  @Index('idx_transactions_user_id')
  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  type: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  method: string;

  @Index('idx_transactions_status')
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'PHP' })
  currency: string;

  @Index('idx_transactions_gateway_txn_id')
  @Column({ type: 'varchar', length: 255, nullable: true })
  gateway_transaction_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  gateway_response: Record<string, unknown> | null;

  @Index('idx_transactions_idempotency_key', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  idempotency_key: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;
}
