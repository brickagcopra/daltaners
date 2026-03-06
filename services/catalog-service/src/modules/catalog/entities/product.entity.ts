import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BrandEntity } from './brand.entity';
import { CategoryEntity } from './category.entity';
import { ProductImageEntity } from './product-image.entity';
import { ProductVariantEntity } from './product-variant.entity';

@Entity({ name: 'products', schema: 'catalog' })
@Index('idx_products_store_category', ['store_id', 'category_id'])
@Index('idx_products_created_at', ['created_at'])
@Index('idx_products_base_price', ['base_price'])
@Index('idx_products_is_active_is_featured', ['is_active', 'is_featured'])
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('idx_products_store_id')
  store_id: string;

  @Column({ type: 'uuid' })
  @Index('idx_products_category_id')
  category_id: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  @Index('idx_products_slug')
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  short_description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index('idx_products_sku')
  sku: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index('idx_products_barcode')
  barcode: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index('idx_products_brand')
  brand: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_products_brand_id')
  brand_id: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit_type: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  unit_value: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sale_price: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost_price: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 12.0 })
  tax_rate: number;

  @Column({ type: 'boolean', default: true })
  is_taxable: boolean;

  @Column({ type: 'integer', nullable: true })
  weight_grams: number | null;

  @Column({ type: 'jsonb', nullable: true })
  dimensions: Record<string, number> | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ type: 'boolean', default: false })
  requires_prescription: boolean;

  @Column({ type: 'boolean', default: false })
  is_perishable: boolean;

  @Column({ type: 'integer', nullable: true })
  shelf_life_days: number | null;

  @Column({ type: 'jsonb', nullable: true })
  nutritional_info: Record<string, unknown> | null;

  @Column({ type: 'text', array: true, nullable: true })
  allergens: string[] | null;

  @Column({ type: 'text', array: true, nullable: true })
  dietary_tags: string[] | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating_average: number;

  @Column({ type: 'integer', default: 0 })
  rating_count: number;

  @Column({ type: 'integer', default: 0 })
  total_sold: number;

  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => CategoryEntity, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @ManyToOne(() => BrandEntity, { nullable: true })
  @JoinColumn({ name: 'brand_id' })
  brand_entity: BrandEntity | null;

  @OneToMany(() => ProductImageEntity, (image) => image.product, { cascade: true })
  images: ProductImageEntity[];

  @OneToMany(() => ProductVariantEntity, (variant) => variant.product, { cascade: true })
  variants: ProductVariantEntity[];
}
