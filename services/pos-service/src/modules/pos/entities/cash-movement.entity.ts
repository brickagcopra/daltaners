import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ShiftEntity } from './shift.entity';

@Entity({ name: 'cash_movements', schema: 'pos' })
@Index('idx_cash_movements_shift_id', ['shift_id'])
@Index('idx_cash_movements_type', ['type'])
export class CashMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  shift_id: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  type: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'uuid' })
  performed_by: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  performed_by_name: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => ShiftEntity, (shift) => shift.cash_movements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift: ShiftEntity;
}
