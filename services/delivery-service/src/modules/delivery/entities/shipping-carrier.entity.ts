import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CarrierServiceEntity } from './carrier-service.entity';

@Entity({ name: 'shipping_carriers', schema: 'delivery' })
@Index('idx_shipping_carriers_code', ['code'], { unique: true })
@Index('idx_shipping_carriers_active', ['is_active'])
@Index('idx_shipping_carriers_type', ['type'])
export class ShippingCarrierEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  api_base_url: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  api_credentials: Record<string, unknown>;

  @Column({ type: 'text', array: true, default: () => "ARRAY['grocery', 'food', 'pharmacy', 'parcel']::TEXT[]" })
  supported_service_types: string[];

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contact_phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_email: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  webhook_secret: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  tracking_url_template: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => CarrierServiceEntity, (cs) => cs.carrier)
  services: CarrierServiceEntity[];
}
