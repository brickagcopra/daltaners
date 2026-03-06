import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ShiftEntity } from './shift.entity';

@Entity({ name: 'terminals', schema: 'pos' })
@Index('idx_terminals_store_id', ['store_id'])
@Index('idx_terminals_terminal_code', ['terminal_code'], { unique: true })
@Index('idx_terminals_status', ['status'])
export class TerminalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  terminal_code: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  hardware_config: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_heartbeat_at: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ip_address: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => ShiftEntity, (shift) => shift.terminal)
  shifts: ShiftEntity[];
}
