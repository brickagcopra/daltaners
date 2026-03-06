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
import { DisputeMessageEntity } from './dispute-message.entity';
import { OrderEntity } from './order.entity';
import { ReturnRequestEntity } from './return-request.entity';

@Entity({ name: 'disputes', schema: 'orders' })
@Index('idx_disputes_order_id', ['order_id'])
@Index('idx_disputes_return_request_id', ['return_request_id'])
@Index('idx_disputes_customer_id', ['customer_id'])
@Index('idx_disputes_store_id', ['store_id'])
@Index('idx_disputes_status', ['status'])
@Index('idx_disputes_priority', ['priority'])
@Index('idx_disputes_dispute_number', ['dispute_number'], { unique: true })
@Index('idx_disputes_created_at', ['created_at'])
export class DisputeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  dispute_number: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid', nullable: true })
  return_request_id: string | null;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: string;

  @Column({ type: 'varchar', length: 10, default: 'medium' })
  priority: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  evidence_urls: string[];

  @Column({ type: 'varchar', length: 20, default: 'refund' })
  requested_resolution: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  resolution_type: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  resolution_amount: number;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  resolved_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  escalated_at: Date | null;

  @Column({ type: 'text', nullable: true })
  escalation_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  vendor_response_deadline: Date | null;

  @Column({ type: 'uuid', nullable: true })
  admin_assigned_to: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => DisputeMessageEntity, (msg) => msg.dispute, { cascade: true })
  messages: DisputeMessageEntity[];

  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;

  @ManyToOne(() => ReturnRequestEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'return_request_id' })
  return_request: ReturnRequestEntity;
}
