import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { PolicyViolation } from './policy-violation.entity';

export enum AppealStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DENIED = 'denied',
  ESCALATED = 'escalated',
}

@Entity({ schema: 'vendors', name: 'appeals' })
export class Appeal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true, name: 'appeal_number' })
  appeal_number: string;

  @Column({ type: 'uuid', name: 'violation_id' })
  violation_id: string;

  @Column({ type: 'uuid', name: 'store_id' })
  store_id: string;

  @Column({ type: 'varchar', length: 20, default: AppealStatus.PENDING })
  status: AppealStatus;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'text', array: true, default: '{}', name: 'evidence_urls' })
  evidence_urls: string[];

  @Column({ type: 'text', nullable: true, name: 'admin_notes' })
  admin_notes: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewed_by: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  reviewed_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => PolicyViolation, (violation) => violation.appeals)
  @JoinColumn({ name: 'violation_id' })
  violation: PolicyViolation;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;
}
