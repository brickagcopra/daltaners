import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum PriceChangeType {
  MANUAL = 'manual',
  RULE_APPLIED = 'rule_applied',
  RULE_EXPIRED = 'rule_expired',
  BULK_UPDATE = 'bulk_update',
  CSV_IMPORT = 'csv_import',
  SCHEDULED = 'scheduled',
}

@Entity({ name: 'price_history', schema: 'catalog' })
export class PriceHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('idx_price_history_product')
  product_id: string;

  @Column({ type: 'uuid' })
  @Index('idx_price_history_store')
  store_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  old_base_price: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  new_base_price: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  old_sale_price: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  new_sale_price: number | null;

  @Column({ type: 'varchar', length: 30 })
  @Index('idx_price_history_type')
  change_type: PriceChangeType;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_price_history_rule')
  rule_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  changed_by: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
