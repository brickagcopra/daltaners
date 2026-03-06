import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PricingRuleType {
  TIME_BASED = 'time_based',
  HAPPY_HOUR = 'happy_hour',
  FLASH_SALE = 'flash_sale',
  BULK_DISCOUNT = 'bulk_discount',
  SCHEDULED_PRICE = 'scheduled_price',
}

export enum PricingDiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  PRICE_OVERRIDE = 'price_override',
}

export enum PricingAppliesTo {
  ALL_PRODUCTS = 'all_products',
  SPECIFIC_PRODUCTS = 'specific_products',
  CATEGORY = 'category',
  BRAND = 'brand',
}

export enum PricingRuleStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface PricingSchedule {
  days_of_week?: number[]; // 0=Sun, 6=Sat
  start_time?: string; // "HH:mm"
  end_time?: string; // "HH:mm"
}

export interface PricingConditions {
  min_quantity?: number;
  max_quantity?: number;
  min_order_value?: number;
}

@Entity({ name: 'pricing_rules', schema: 'catalog' })
export class PricingRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('idx_pricing_rules_store')
  store_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 30 })
  @Index('idx_pricing_rules_type')
  rule_type: PricingRuleType;

  @Column({ type: 'varchar', length: 20 })
  discount_type: PricingDiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ type: 'varchar', length: 20 })
  applies_to: PricingAppliesTo;

  @Column({ type: 'uuid', array: true, nullable: true })
  applies_to_ids: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  schedule: PricingSchedule | null;

  @Column({ type: 'jsonb', default: {} })
  conditions: PricingConditions;

  @Column({ type: 'timestamptz' })
  start_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end_date: Date | null;

  @Column({ type: 'integer', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'integer', nullable: true })
  max_uses: number | null;

  @Column({ type: 'integer', default: 0 })
  current_uses: number;

  @Column({ type: 'varchar', length: 20, default: PricingRuleStatus.DRAFT })
  @Index('idx_pricing_rules_status')
  status: PricingRuleStatus;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
