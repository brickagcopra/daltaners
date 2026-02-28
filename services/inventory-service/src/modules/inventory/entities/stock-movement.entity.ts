import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StockEntity } from './stock.entity';

export enum MovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
  RESERVATION = 'reservation',
  RELEASE = 'release',
  RETURN = 'return',
}

@Entity({ name: 'stock_movements', schema: 'inventory' })
@Index('idx_stock_movements_stock_id', ['stockId'])
@Index('idx_stock_movements_created_at', ['createdAt'])
export class StockMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stock_id', type: 'uuid' })
  stockId: string;

  @Column({
    name: 'movement_type',
    type: 'varchar',
    length: 20,
  })
  movementType: MovementType;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => StockEntity, (stock) => stock.movements)
  @JoinColumn({ name: 'stock_id' })
  stock: StockEntity;
}
