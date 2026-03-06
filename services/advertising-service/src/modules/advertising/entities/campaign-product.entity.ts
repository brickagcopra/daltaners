import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { CampaignEntity } from './campaign.entity';

@Entity({ name: 'ad_campaign_products', schema: 'advertising' })
@Unique(['campaign_id', 'product_id'])
@Index('idx_campaign_products_campaign', ['campaign_id'])
@Index('idx_campaign_products_product', ['product_id'])
export class CampaignProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  campaign_id: string;

  @Column('uuid')
  product_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  bid_amount: number | null;

  @Column({ type: 'bigint', default: 0 })
  impressions: number;

  @Column({ type: 'bigint', default: 0 })
  clicks: number;

  @Column({ type: 'int', default: 0 })
  conversions: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  spent: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => CampaignEntity, (c) => c.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: CampaignEntity;
}
