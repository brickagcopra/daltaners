import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'delivery_personnel', schema: 'delivery' })
@Index('idx_delivery_personnel_user_id', ['user_id'], { unique: true })
@Index('idx_delivery_personnel_status', ['status'])
@Index('idx_delivery_personnel_is_online', ['is_online'])
@Index('idx_delivery_personnel_current_zone_id', ['current_zone_id'])
@Index('idx_delivery_personnel_status_online', ['status', 'is_online'])
export class DeliveryPersonnelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  vehicle_type: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  vehicle_plate: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  license_number: string | null;

  @Column({ type: 'date', nullable: true })
  license_expiry: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: string;

  @Column({ type: 'boolean', default: false })
  is_online: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  current_latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  current_longitude: number | null;

  @Column({ type: 'uuid', nullable: true })
  current_zone_id: string | null;

  @Column({ type: 'smallint', default: 2 })
  max_concurrent_orders: number;

  @Column({ type: 'smallint', default: 0 })
  current_order_count: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating_average: number;

  @Column({ type: 'integer', default: 0 })
  total_deliveries: number;

  @Column({ type: 'jsonb', nullable: true })
  bank_account_info: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  insurance_info: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
