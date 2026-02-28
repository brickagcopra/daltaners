import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { OperatingHours } from './operating-hours.entity';

@Entity({ schema: 'vendors', name: 'store_locations' })
export class StoreLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'store_id' })
  store_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'branch_name' })
  branch_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'address_line1' })
  address_line1: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'address_line2' })
  address_line2: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0, name: 'delivery_radius_km' })
  delivery_radius_km: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  geofence: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  is_primary: boolean;

  @ManyToOne(() => Store, (store) => store.locations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @OneToMany(() => OperatingHours, (hours) => hours.store_location)
  operating_hours: OperatingHours[];
}
