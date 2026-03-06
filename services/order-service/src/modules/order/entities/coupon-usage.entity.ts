import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CouponEntity } from './coupon.entity';

@Entity({ name: 'coupon_usages', schema: 'promotions' })
@Index('idx_coupon_usages_coupon_id', ['coupon_id'])
@Index('idx_coupon_usages_user_id', ['user_id'])
@Index('idx_coupon_usages_order_id', ['order_id'])
export class CouponUsageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  coupon_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount_amount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  redeemed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  released_at: Date | null;

  @ManyToOne(() => CouponEntity)
  @JoinColumn({ name: 'coupon_id' })
  coupon: CouponEntity;
}
