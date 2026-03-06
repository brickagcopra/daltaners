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
import { ShippingCarrierEntity } from './shipping-carrier.entity';
import { CarrierServiceEntity } from './carrier-service.entity';

@Entity({ name: 'shipments', schema: 'delivery' })
@Index('idx_shipments_order', ['order_id'])
@Index('idx_shipments_carrier', ['carrier_id'])
@Index('idx_shipments_store', ['store_id'])
@Index('idx_shipments_status', ['status'])
@Index('idx_shipments_tracking', ['tracking_number'])
@Index('idx_shipments_number', ['shipment_number'], { unique: true })
@Index('idx_shipments_created', ['created_at'])
export class ShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  shipment_number: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  carrier_id: string;

  @Column({ type: 'uuid', nullable: true })
  carrier_service_id: string | null;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'varchar', length: 30 })
  status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tracking_number: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  carrier_reference: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight_kg: number | null;

  @Column({ type: 'jsonb', nullable: true })
  dimensions: Record<string, unknown> | null;

  @Column({ type: 'int', default: 1 })
  package_count: number;

  @Column({ type: 'jsonb' })
  pickup_address: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  delivery_address: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  estimated_pickup_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  actual_pickup_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  estimated_delivery_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  actual_delivery_at: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shipping_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  insurance_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cod_amount: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  carrier_status: string | null;

  @Column({ type: 'jsonb', nullable: true })
  carrier_response: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  label_url: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  label_format: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => ShippingCarrierEntity)
  @JoinColumn({ name: 'carrier_id' })
  carrier: ShippingCarrierEntity;

  @ManyToOne(() => CarrierServiceEntity, { nullable: true })
  @JoinColumn({ name: 'carrier_service_id' })
  carrier_service: CarrierServiceEntity | null;
}
