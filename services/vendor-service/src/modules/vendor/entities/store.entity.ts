import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { StoreLocation } from './store-location.entity';
import { StoreStaff } from './store-staff.entity';

export enum StoreCategory {
  GROCERY = 'grocery',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
  ELECTRONICS = 'electronics',
  FASHION = 'fashion',
  GENERAL = 'general',
  SPECIALTY = 'specialty',
}

export enum StoreStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export enum SubscriptionTier {
  FREE = 'free',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

@Entity({ schema: 'vendors', name: 'stores' })
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  owner_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'logo_url' })
  logo_url: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'banner_url' })
  banner_url: string | null;

  @Column({ type: 'varchar', length: 20 })
  category: StoreCategory;

  @Column({ type: 'varchar', length: 20, default: StoreStatus.PENDING })
  status: StoreStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'commission_rate' })
  commission_rate: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'subscription_tier' })
  subscription_tier: SubscriptionTier | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'contact_phone' })
  contact_phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'contact_email' })
  contact_email: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'business_permit_url' })
  business_permit_url: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'dti_registration' })
  dti_registration: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bir_tin' })
  bir_tin: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'fda_license_number' })
  fda_license_number: string | null;

  @Column({ type: 'date', nullable: true, name: 'fda_license_expiry' })
  fda_license_expiry: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'pharmacy_license_url' })
  pharmacy_license_url: string | null;

  @Column({ type: 'integer', default: 30, name: 'preparation_time_minutes' })
  preparation_time_minutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'minimum_order_value' })
  minimum_order_value: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'rating_average' })
  rating_average: number;

  @Column({ type: 'integer', default: 0, name: 'rating_count' })
  rating_count: number;

  @Column({ type: 'integer', default: 0, name: 'total_orders' })
  total_orders: number;

  @Column({ type: 'boolean', default: false, name: 'is_featured' })
  is_featured: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => StoreLocation, (location) => location.store)
  locations: StoreLocation[];

  @OneToMany(() => StoreStaff, (staff) => staff.store)
  staff: StoreStaff[];
}
