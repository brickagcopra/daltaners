import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BrandStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

@Entity({ name: 'brands', schema: 'catalog' })
export class BrandEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index('idx_brands_name')
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_brands_slug')
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  banner_url: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website_url: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country_of_origin: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: BrandStatus.PENDING,
  })
  @Index('idx_brands_status')
  status: BrandStatus;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  verified_by: string | null;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ type: 'integer', default: 0 })
  product_count: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
