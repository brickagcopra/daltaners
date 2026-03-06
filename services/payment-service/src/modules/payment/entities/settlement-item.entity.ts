import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VendorSettlementEntity } from './vendor-settlement.entity';

@Entity({ schema: 'payments', name: 'settlement_items' })
export class SettlementItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_settlement_items_settlement_id')
  @Column({ type: 'uuid' })
  settlement_id: string;

  @Index('idx_settlement_items_order_id', { unique: true })
  @Column({ type: 'uuid', unique: true })
  order_id: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  order_number: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  gross_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  commission_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  net_amount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => VendorSettlementEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'settlement_id' })
  settlement: VendorSettlementEntity;
}
