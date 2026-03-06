import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ReturnRequestEntity } from './return-request.entity';

@Entity({ name: 'return_items', schema: 'orders' })
@Index('idx_return_items_return_request_id', ['return_request_id'])
@Index('idx_return_items_order_item_id', ['order_item_id'])
export class ReturnItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  return_request_id: string;

  @Column({ type: 'uuid' })
  order_item_id: string;

  @Column({ type: 'uuid', nullable: true })
  product_id: string | null;

  @Column({ type: 'varchar', length: 500 })
  product_name: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refund_amount: number;

  @Column({ type: 'varchar', length: 20, default: 'unknown' })
  condition: string;

  @Column({ type: 'boolean', default: false })
  restockable: boolean;

  @Column({ type: 'boolean', default: false })
  inventory_adjusted: boolean;

  @ManyToOne(() => ReturnRequestEntity, (request) => request.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'return_request_id' })
  return_request: ReturnRequestEntity;
}
