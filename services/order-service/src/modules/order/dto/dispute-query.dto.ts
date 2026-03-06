import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DisputeQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: ['open', 'vendor_response', 'customer_reply', 'under_review', 'escalated', 'resolved', 'closed'],
  })
  @IsOptional()
  @IsEnum(['open', 'vendor_response', 'customer_reply', 'under_review', 'escalated', 'resolved', 'closed'])
  status?: string;

  @ApiPropertyOptional({
    enum: [
      'order_not_received', 'item_missing', 'wrong_item', 'damaged_item',
      'quality_issue', 'overcharged', 'late_delivery', 'vendor_behavior',
      'delivery_behavior', 'unauthorized_charge', 'other',
    ],
  })
  @IsOptional()
  @IsEnum([
    'order_not_received', 'item_missing', 'wrong_item', 'damaged_item',
    'quality_issue', 'overcharged', 'late_delivery', 'vendor_behavior',
    'delivery_behavior', 'unauthorized_charge', 'other',
  ])
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by priority', enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date string' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date string' })
  @IsOptional()
  @IsString()
  date_to?: string;
}

export class AdminDisputeQueryDto extends DisputeQueryDto {
  @ApiPropertyOptional({ description: 'Search by dispute_number or order_number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by store ID' })
  @IsOptional()
  @IsString()
  store_id?: string;

  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsOptional()
  @IsString()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned admin ID' })
  @IsOptional()
  @IsString()
  assigned_to?: string;
}
