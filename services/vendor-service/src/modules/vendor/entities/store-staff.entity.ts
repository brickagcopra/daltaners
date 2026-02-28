import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';

export enum StaffRole {
  MANAGER = 'manager',
  STAFF = 'staff',
  CASHIER = 'cashier',
}

@Entity({ schema: 'vendors', name: 'store_staff' })
export class StoreStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'store_id' })
  store_id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  role: StaffRole;

  @Column({ type: 'jsonb', nullable: true })
  permissions: string[] | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active: boolean;

  @ManyToOne(() => Store, (store) => store.staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;
}
