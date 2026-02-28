import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WalletEntity } from './wallet.entity';

@Entity({ schema: 'payments', name: 'wallet_transactions' })
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_wallet_txn_wallet_id')
  @Column({ type: 'uuid' })
  wallet_id: string;

  @ManyToOne(() => WalletEntity)
  @JoinColumn({ name: 'wallet_id' })
  wallet: WalletEntity;

  @Column({ type: 'varchar', length: 20 })
  type: string; // top_up, payment, refund, transfer_in, transfer_out, withdrawal

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balance_after: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string | null; // order, topup, transfer

  @Column({ type: 'uuid', nullable: true })
  reference_id: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Index('idx_wallet_txn_status')
  @Column({ type: 'varchar', length: 20, default: 'completed' })
  status: string; // pending, completed, failed

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
