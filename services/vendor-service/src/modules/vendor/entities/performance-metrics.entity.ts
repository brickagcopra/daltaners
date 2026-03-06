import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { Store } from './store.entity';

export enum PerformanceTier {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  AVERAGE = 'average',
  POOR = 'poor',
  CRITICAL = 'critical',
  UNRATED = 'unrated',
}

@Entity({ schema: 'vendors', name: 'performance_metrics' })
export class PerformanceMetrics {
  @PrimaryColumn({ type: 'uuid', name: 'store_id' })
  store_id: string;

  @Column({ type: 'integer', default: 0 })
  total_orders: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_revenue: number;

  @Column({ type: 'integer', default: 0 })
  fulfilled_orders: number;

  @Column({ type: 'integer', default: 0 })
  cancelled_orders: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  fulfillment_rate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  cancellation_rate: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'avg_preparation_time_min' })
  avg_preparation_time_min: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  on_time_delivery_rate: number;

  @Column({ type: 'integer', default: 0 })
  total_returns: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  return_rate: number;

  @Column({ type: 'integer', default: 0 })
  total_disputes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  dispute_rate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  escalation_rate: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  avg_rating: number;

  @Column({ type: 'integer', default: 0 })
  review_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  review_response_rate: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  avg_dispute_response_hours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  performance_score: number;

  @Column({ type: 'varchar', length: 20, default: PerformanceTier.UNRATED })
  performance_tier: PerformanceTier;

  @Column({ type: 'integer', default: 30 })
  period_days: number;

  @Column({ type: 'timestamptz' })
  calculated_at: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  @OneToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;
}
