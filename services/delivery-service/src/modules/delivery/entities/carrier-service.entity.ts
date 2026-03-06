import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ShippingCarrierEntity } from './shipping-carrier.entity';

@Entity({ name: 'carrier_services', schema: 'delivery' })
@Unique(['carrier_id', 'code'])
@Index('idx_carrier_services_carrier', ['carrier_id'])
@Index('idx_carrier_services_active', ['is_active'])
export class CarrierServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  carrier_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 1 })
  estimated_days_min: number;

  @Column({ type: 'int', default: 3 })
  estimated_days_max: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  base_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  per_kg_price: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 50 })
  max_weight_kg: number;

  @Column({ type: 'jsonb', nullable: true })
  max_dimensions: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  is_cod_supported: boolean;

  @Column({ type: 'boolean', default: false })
  is_insurance_available: boolean;

  @Column({ type: 'text', array: true, nullable: true })
  coverage_areas: string[] | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => ShippingCarrierEntity, (c) => c.services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrier_id' })
  carrier: ShippingCarrierEntity;
}
