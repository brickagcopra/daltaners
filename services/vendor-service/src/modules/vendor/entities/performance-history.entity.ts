import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Store } from './store.entity';
import { PerformanceTier } from './performance-metrics.entity';

@Entity({ schema: 'vendors', name: 'performance_history' })
@Unique(['store_id', 'snapshot_date'])
export class PerformanceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'store_id' })
  store_id: string;

  @Column({ type: 'date' })
  snapshot_date: string;

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

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  performance_score: number;

  @Column({ type: 'varchar', length: 20, default: PerformanceTier.UNRATED })
  performance_tier: PerformanceTier;

  @Column({ type: 'jsonb', default: '{}' })
  metrics_snapshot: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;
}
