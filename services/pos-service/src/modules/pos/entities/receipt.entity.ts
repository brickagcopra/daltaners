import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TransactionEntity } from './transaction.entity';

@Entity({ name: 'receipts', schema: 'pos' })
@Index('idx_receipts_transaction_id', ['transaction_id'], { unique: true })
export class ReceiptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  transaction_id: string;

  @Column({ type: 'jsonb' })
  receipt_data: Record<string, unknown>;

  @Column({ type: 'text' })
  receipt_text: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToOne(() => TransactionEntity, (tx) => tx.receipt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: TransactionEntity;
}
