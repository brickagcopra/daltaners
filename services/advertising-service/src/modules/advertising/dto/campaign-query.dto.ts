import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignType, CampaignStatus, Placement } from '../entities';

export class CampaignQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ enum: CampaignType })
  @IsOptional()
  @IsEnum(CampaignType)
  campaign_type?: CampaignType;

  @ApiPropertyOptional({ enum: Placement })
  @IsOptional()
  @IsEnum(Placement)
  placement?: Placement;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AdminCampaignQueryDto extends CampaignQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiPropertyOptional({ enum: ['created_at', 'budget_amount', 'spent_amount', 'total_impressions', 'total_clicks'] })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC';
}

export class RecordImpressionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaign_product_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  device_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ip_address?: string;
}

export class RecordClickDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  impression_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaign_product_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  user_id?: string;
}

export class RecordConversionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  click_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaign_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  order_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  order_amount?: number;
}

export class AdminCampaignActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddCampaignProductDto {
  @ApiPropertyOptional()
  @IsUUID()
  product_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  bid_amount?: number;
}
