import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity({ schema: 'zones', name: 'delivery_zones' })
export class DeliveryZoneEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('idx_delivery_zones_city')
  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Index('idx_delivery_zones_province')
  @Column({ type: 'varchar', length: 100 })
  province: string;

  @Index('idx_delivery_zones_region')
  @Column({ type: 'varchar', length: 100 })
  region: string;

  @Index('idx_delivery_zones_boundary', { spatial: true })
  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  boundary: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_delivery_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  per_km_fee: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.00 })
  surge_multiplier: number;

  @Index('idx_delivery_zones_is_active')
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0 })
  max_delivery_radius_km: number;

  @Column({ type: 'integer', nullable: true })
  capacity_limit: number;

  @Column({ type: 'integer', default: 0 })
  current_capacity: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
