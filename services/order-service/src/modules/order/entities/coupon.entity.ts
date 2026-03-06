import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'coupons', schema: 'promotions' })
@Index('idx_coupons_active_dates', ['is_active', 'valid_from', 'valid_until'])
export class CouponEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20 })
  discount_type: 'percentage' | 'fixed_amount' | 'free_delivery';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimum_order_value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maximum_discount: number | null;

  @Column({ type: 'uuid', array: true, nullable: true })
  applicable_categories: string[] | null;

  @Column({ type: 'uuid', array: true, nullable: true })
  applicable_stores: string[] | null;

  @Column({ type: 'int', nullable: true })
  usage_limit: number | null;

  @Column({ type: 'int', default: 0 })
  usage_count: number;

  @Column({ type: 'int', default: 1 })
  per_user_limit: number;

  @Column({ type: 'boolean', default: false })
  is_first_order_only: boolean;

  @Column({ type: 'timestamptz' })
  valid_from: Date;

  @Column({ type: 'timestamptz' })
  valid_until: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
