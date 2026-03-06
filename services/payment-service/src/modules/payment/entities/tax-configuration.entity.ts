import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TaxType {
  VAT = 'vat',
  EWT = 'ewt',
  PERCENTAGE_TAX = 'percentage_tax',
  EXCISE = 'excise',
  CUSTOM = 'custom',
}

export enum TaxAppliesTo {
  ALL = 'all',
  CATEGORY = 'category',
  ZONE = 'zone',
  VENDOR_TIER = 'vendor_tier',
}

@Entity({ schema: 'payments', name: 'tax_configurations' })
export class TaxConfigurationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('idx_tax_config_type')
  @Column({ type: 'varchar', length: 30 })
  tax_type: string;

  @Column({ type: 'decimal', precision: 6, scale: 4 })
  rate: number;

  @Index('idx_tax_config_applies')
  @Column({ type: 'varchar', length: 30 })
  applies_to: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  applies_to_value: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_inclusive: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  effective_from: Date;

  @Column({ type: 'timestamptz', nullable: true })
  effective_until: Date | null;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
