import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ schema: 'payments', name: 'wallets' })
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_wallets_user_id', { unique: true })
  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 3, default: 'PHP' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 50000 })
  daily_limit: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 500000 })
  monthly_limit: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
