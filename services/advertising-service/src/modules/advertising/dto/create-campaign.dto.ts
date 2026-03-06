import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  IsUUID,
  IsUrl,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignType, BudgetType, BidType, Placement } from '../entities';

class TargetingDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  zones?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customer_segments?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class CreateCampaignDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CampaignType })
  @IsEnum(CampaignType)
  campaign_type: CampaignType;

  @ApiProperty({ enum: BudgetType, default: BudgetType.TOTAL })
  @IsOptional()
  @IsEnum(BudgetType)
  budget_type?: BudgetType;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  budget_amount: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  daily_budget?: number;

  @ApiProperty({ enum: BidType, default: BidType.CPC })
  @IsOptional()
  @IsEnum(BidType)
  bid_type?: BidType;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  bid_amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetingDto)
  targeting?: TargetingDto;

  @ApiProperty({ enum: Placement, default: Placement.SEARCH_RESULTS })
  @IsOptional()
  @IsEnum(Placement)
  placement?: Placement;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  banner_image_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  banner_link_url?: string;

  @ApiProperty()
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Product IDs to include in the campaign' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  product_ids?: string[];
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget_amount?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  daily_budget?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bid_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetingDto)
  targeting?: TargetingDto;

  @ApiPropertyOptional({ enum: Placement })
  @IsOptional()
  @IsEnum(Placement)
  placement?: Placement;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  banner_image_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  banner_link_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;
}
