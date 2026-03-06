import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CampaignEntity } from './campaign.entity';
import { AdImpressionEntity } from './ad-impression.entity';

@Entity({ name: 'ad_clicks', schema: 'advertising' })
@Index('idx_clicks_campaign', ['campaign_id'])
@Index('idx_clicks_product', ['product_id'])
export class AdClickEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  impression_id: string | null;

  @Column('uuid')
  campaign_id: string;

  @Column({ type: 'uuid', nullable: true })
  campaign_product_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  product_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  cost: number;

  @Column({ type: 'boolean', default: false })
  resulted_in_order: boolean;

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  order_amount: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => CampaignEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: CampaignEntity;

  @ManyToOne(() => AdImpressionEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'impression_id' })
  impression: AdImpressionEntity;
}
