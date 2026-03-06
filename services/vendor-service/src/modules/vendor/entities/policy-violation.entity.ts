import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Store } from './store.entity';
import { PolicyRule, PolicyCategory, PolicySeverity, PenaltyType } from './policy-rule.entity';
import { Appeal } from './appeal.entity';

export enum ViolationStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  UNDER_REVIEW = 'under_review',
  APPEALED = 'appealed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  PENALTY_APPLIED = 'penalty_applied',
}

export enum DetectedBy {
  SYSTEM = 'system',
  ADMIN = 'admin',
  CUSTOMER_REPORT = 'customer_report',
}

@Entity({ schema: 'vendors', name: 'policy_violations' })
export class PolicyViolation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true, name: 'violation_number' })
  violation_number: string;

  @Column({ type: 'uuid', name: 'store_id' })
  store_id: string;

  @Column({ type: 'uuid', nullable: true, name: 'rule_id' })
  rule_id: string | null;

  @Column({ type: 'varchar', length: 30 })
  category: PolicyCategory;

  @Column({ type: 'varchar', length: 20 })
  severity: PolicySeverity;

  @Column({ type: 'varchar', length: 20, default: ViolationStatus.PENDING })
  status: ViolationStatus;

  @Column({ type: 'varchar', length: 500 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', array: true, default: '{}', name: 'evidence_urls' })
  evidence_urls: string[];

  @Column({ type: 'varchar', length: 20, default: DetectedBy.ADMIN, name: 'detected_by' })
  detected_by: DetectedBy;

  @Column({ type: 'uuid', nullable: true, name: 'detected_by_user_id' })
  detected_by_user_id: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'penalty_type' })
  penalty_type: PenaltyType | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'penalty_value' })
  penalty_value: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'penalty_applied_at' })
  penalty_applied_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'penalty_expires_at' })
  penalty_expires_at: Date | null;

  @Column({ type: 'text', nullable: true, name: 'resolution_notes' })
  resolution_notes: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'resolved_by' })
  resolved_by: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolved_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => PolicyRule)
  @JoinColumn({ name: 'rule_id' })
  rule: PolicyRule;

  @OneToMany(() => Appeal, (appeal) => appeal.violation)
  appeals: Appeal[];
}
