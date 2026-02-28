import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DeliveryPersonnelEntity } from './delivery-personnel.entity';

@Entity({ name: 'deliveries', schema: 'delivery' })
@Index('idx_deliveries_order_id', ['order_id'], { unique: true })
@Index('idx_deliveries_personnel_id', ['personnel_id'])
@Index('idx_deliveries_status', ['status'])
@Index('idx_deliveries_created_at', ['created_at'])
@Index('idx_deliveries_personnel_status', ['personnel_id', 'status'])
export class DeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid', nullable: true })
  personnel_id: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'assigned',
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  pickup_location: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  dropoff_location: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  estimated_pickup_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  actual_pickup_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  estimated_delivery_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  actual_delivery_at: Date | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  distance_km: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  delivery_fee: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tip_amount: number | null;

  @Column({ type: 'jsonb', nullable: true })
  proof_of_delivery: Record<string, unknown> | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cod_amount: number;

  @Column({ type: 'boolean', default: false })
  cod_collected: boolean;

  @Column({ type: 'text', nullable: true })
  failure_reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => DeliveryPersonnelEntity, { nullable: true })
  @JoinColumn({ name: 'personnel_id' })
  personnel: DeliveryPersonnelEntity;
}
