import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { StockMovementEntity } from './stock-movement.entity';

@Entity({ name: 'stock', schema: 'inventory' })
@Index('idx_stock_product_location', ['productId', 'storeLocationId'], { unique: true })
@Index('idx_stock_product_variant_location', ['productId', 'variantId', 'storeLocationId'])
@Index('idx_stock_store_location', ['storeLocationId'])
export class StockEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId: string | null;

  @Column({ name: 'store_location_id', type: 'uuid' })
  storeLocationId: string;

  @Column({ type: 'integer', default: 0 })
  quantity: number;

  @Column({ name: 'reserved_quantity', type: 'integer', default: 0 })
  reservedQuantity: number;

  @Column({ name: 'reorder_point', type: 'integer', default: 10 })
  reorderPoint: number;

  @Column({ name: 'reorder_quantity', type: 'integer', default: 50 })
  reorderQuantity: number;

  @Column({ name: 'batch_number', type: 'varchar', length: 100, nullable: true })
  batchNumber: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'last_restocked_at', type: 'timestamptz', nullable: true })
  lastRestockedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => StockMovementEntity, (movement) => movement.stock)
  movements: StockMovementEntity[];

  get availableQuantity(): number {
    return this.quantity - this.reservedQuantity;
  }
}
