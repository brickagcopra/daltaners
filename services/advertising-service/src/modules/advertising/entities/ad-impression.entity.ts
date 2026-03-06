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

@Entity({ name: 'ad_impressions', schema: 'advertising' })
@Index('idx_impressions_campaign', ['campaign_id'])
@Index('idx_impressions_product', ['product_id'])
export class AdImpressionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  campaign_id: string;

  @Column({ type: 'uuid', nullable: true })
  campaign_product_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  product_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', length: 30 })
  placement: string;

  @Column({ type: 'varchar', length: 10, default: 'web' })
  device_type: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  cost: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => CampaignEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: CampaignEntity;
}
