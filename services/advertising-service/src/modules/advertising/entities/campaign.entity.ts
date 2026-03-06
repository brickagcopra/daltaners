import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CampaignProductEntity } from './campaign-product.entity';

export enum CampaignType {
  SPONSORED_LISTING = 'sponsored_listing',
  BANNER_AD = 'banner_ad',
  FEATURED_STORE = 'featured_store',
  PRODUCT_PROMOTION = 'product_promotion',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

export enum BudgetType {
  DAILY = 'daily',
  TOTAL = 'total',
}

export enum BidType {
  CPC = 'cpc',
  CPM = 'cpm',
  FLAT = 'flat',
}

export enum Placement {
  SEARCH_RESULTS = 'search_results',
  HOME_PAGE = 'home_page',
  CATEGORY_PAGE = 'category_page',
  STORE_PAGE = 'store_page',
  PRODUCT_PAGE = 'product_page',
}

export interface CampaignTargeting {
  categories?: string[];
  zones?: string[];
  customer_segments?: string[];
  keywords?: string[];
}

@Entity({ name: 'ad_campaigns', schema: 'advertising' })
@Index('idx_campaigns_store_id', ['store_id'])
@Index('idx_campaigns_status', ['status'])
@Index('idx_campaigns_type', ['campaign_type'])
export class CampaignEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  store_id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 30 })
  campaign_type: CampaignType;

  @Column({ type: 'varchar', length: 20, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ type: 'varchar', length: 10, default: BudgetType.TOTAL })
  budget_type: BudgetType;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  budget_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  spent_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  daily_budget: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  daily_spent: number;

  @Column({ type: 'date', nullable: true })
  daily_spent_date: string | null;

  @Column({ type: 'varchar', length: 10, default: BidType.CPC })
  bid_type: BidType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  bid_amount: number;

  @Column({ type: 'jsonb', default: '{}' })
  targeting: CampaignTargeting;

  @Column({ type: 'varchar', length: 30, default: Placement.SEARCH_RESULTS })
  placement: Placement;

  @Column({ type: 'varchar', length: 500, nullable: true })
  banner_image_url: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  banner_link_url: string | null;

  @Column({ type: 'timestamptz' })
  start_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end_date: Date | null;

  @Column({ type: 'bigint', default: 0 })
  total_impressions: number;

  @Column({ type: 'bigint', default: 0 })
  total_clicks: number;

  @Column({ type: 'int', default: 0 })
  total_conversions: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  conversion_revenue: number;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'text', nullable: true })
  suspension_reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  @Column('uuid')
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => CampaignProductEntity, (cp) => cp.campaign)
  products: CampaignProductEntity[];
}
