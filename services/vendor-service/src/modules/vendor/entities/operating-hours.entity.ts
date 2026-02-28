import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StoreLocation } from './store-location.entity';

@Entity({ schema: 'vendors', name: 'operating_hours' })
export class OperatingHours {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'store_location_id' })
  store_location_id: string;

  @Column({ type: 'smallint', name: 'day_of_week' })
  day_of_week: number;

  @Column({ type: 'time', nullable: true, name: 'open_time' })
  open_time: string | null;

  @Column({ type: 'time', nullable: true, name: 'close_time' })
  close_time: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_closed' })
  is_closed: boolean;

  @ManyToOne(() => StoreLocation, (location) => location.operating_hours, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_location_id' })
  store_location: StoreLocation;
}
