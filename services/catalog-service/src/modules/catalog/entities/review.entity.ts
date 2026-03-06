import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'reviews', schema: 'reviews' })
@Index('idx_reviews_reviewable', ['reviewable_type', 'reviewable_id'])
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('idx_reviews_user_id')
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_reviews_order_id')
  order_id: string | null;

  @Column({ type: 'varchar', length: 30 })
  reviewable_type: 'store' | 'product' | 'delivery_personnel';

  @Column({ type: 'uuid' })
  reviewable_id: string;

  @Column({ type: 'smallint' })
  @Index('idx_reviews_rating')
  rating: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  images: string[];

  @Column({ type: 'boolean', default: false })
  is_verified_purchase: boolean;

  @Column({ type: 'boolean', default: true })
  @Index('idx_reviews_is_approved')
  is_approved: boolean;

  @Column({ type: 'text', nullable: true })
  vendor_response: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  vendor_response_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  helpful_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
