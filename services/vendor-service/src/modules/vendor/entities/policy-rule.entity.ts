import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PolicyCategory {
  QUALITY = 'quality',
  DELIVERY = 'delivery',
  PRICING = 'pricing',
  LISTING = 'listing',
  COMMUNICATION = 'communication',
  FRAUD = 'fraud',
  COMPLIANCE = 'compliance',
  SAFETY = 'safety',
  CONTENT = 'content',
  OTHER = 'other',
}

export enum PolicySeverity {
  WARNING = 'warning',
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical',
}

export enum PenaltyType {
  WARNING = 'warning',
  SUSPENSION = 'suspension',
  FINE = 'fine',
  TERMINATION = 'termination',
}

@Entity({ schema: 'vendors', name: 'policy_rules' })
export class PolicyRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 30 })
  category: PolicyCategory;

  @Column({ type: 'varchar', length: 20, default: PolicySeverity.WARNING })
  severity: PolicySeverity;

  @Column({ type: 'varchar', length: 20, default: PenaltyType.WARNING, name: 'penalty_type' })
  penalty_type: PenaltyType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'penalty_value' })
  penalty_value: number;

  @Column({ type: 'integer', default: 0, name: 'suspension_days' })
  suspension_days: number;

  @Column({ type: 'boolean', default: false, name: 'auto_detect' })
  auto_detect: boolean;

  @Column({ type: 'integer', default: 3, name: 'max_violations' })
  max_violations: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
