import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrderItemEntity } from './order-item.entity';

@Entity({ name: 'orders', schema: 'orders' })
@Index('idx_orders_customer_id', ['customer_id'])
@Index('idx_orders_store_id', ['store_id'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_order_number', ['order_number'], { unique: true })
@Index('idx_orders_created_at', ['created_at'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  order_number: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'uuid' })
  store_location_id: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: string;

  @Column({ type: 'varchar', length: 20 })
  order_type: string;

  @Column({ type: 'varchar', length: 20 })
  service_type: string;

  @Column({ type: 'varchar', length: 20 })
  delivery_type: string;

  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  delivery_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  service_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tip_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_amount: number;

  @Column({ type: 'varchar', length: 20 })
  payment_method: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  payment_status: string;

  @Column({ type: 'jsonb', nullable: true })
  delivery_address: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  delivery_instructions: string | null;

  @Column({ type: 'varchar', length: 20, default: 'refund_only' })
  substitution_policy: string;

  @Column({ type: 'uuid', nullable: true })
  coupon_id: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  coupon_code: string | null;

  @Column({ type: 'text', nullable: true })
  customer_notes: string | null;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  estimated_delivery_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  actual_delivery_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  prepared_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  picked_up_at: Date | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
  items: OrderItemEntity[];
}
