import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LoyaltyTransactionEntity } from './loyalty-transaction.entity';

@Entity({ schema: 'loyalty', name: 'accounts' })
export class LoyaltyAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @Column({ type: 'varchar', length: 20, default: 'standard' })
  account_type: string;

  @Column({ type: 'int', default: 0 })
  points_balance: number;

  @Column({ type: 'int', default: 0 })
  lifetime_points: number;

  @Column({ type: 'varchar', length: 20, default: 'bronze' })
  tier: string;

  @Column({ type: 'timestamptz', nullable: true })
  tier_expires_at: Date | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => LoyaltyTransactionEntity, (txn) => txn.account)
  transactions: LoyaltyTransactionEntity[];
}
