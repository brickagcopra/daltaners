import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ReturnItemEntity } from './return-item.entity';
import { OrderEntity } from './order.entity';

@Entity({ name: 'return_requests', schema: 'orders' })
@Index('idx_return_requests_order_id', ['order_id'])
@Index('idx_return_requests_customer_id', ['customer_id'])
@Index('idx_return_requests_store_id', ['store_id'])
@Index('idx_return_requests_status', ['status'])
@Index('idx_return_requests_request_number', ['request_number'], { unique: true })
@Index('idx_return_requests_created_at', ['created_at'])
export class ReturnRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  request_number: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: string;

  @Column({ type: 'varchar', length: 50 })
  reason_category: string;

  @Column({ type: 'text', nullable: true })
  reason_details: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  evidence_urls: string[];

  @Column({ type: 'varchar', length: 20, default: 'refund' })
  requested_resolution: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  refund_amount: number;

  @Column({ type: 'text', nullable: true })
  vendor_response: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  vendor_responded_at: Date | null;

  @Column({ type: 'text', nullable: true })
  admin_notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => ReturnItemEntity, (item) => item.return_request, { cascade: true })
  items: ReturnItemEntity[];

  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;
}
