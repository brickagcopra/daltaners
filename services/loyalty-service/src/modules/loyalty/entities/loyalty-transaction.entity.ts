import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LoyaltyAccountEntity } from './loyalty-account.entity';

@Entity({ schema: 'loyalty', name: 'transactions' })
export class LoyaltyTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  account_id: string;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'int' })
  points: number;

  @Column({ type: 'int' })
  balance_after: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string | null;

  @Column({ type: 'uuid', nullable: true })
  reference_id: string | null;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => LoyaltyAccountEntity, (account) => account.transactions)
  @JoinColumn({ name: 'account_id' })
  account: LoyaltyAccountEntity;
}
