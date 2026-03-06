import { IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class PerformanceHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;
}

export class AdminPerformanceQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by store name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['excellent', 'good', 'average', 'poor', 'critical', 'unrated'],
    description: 'Filter by performance tier',
  })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiPropertyOptional({
    enum: ['grocery', 'restaurant', 'pharmacy', 'electronics', 'fashion', 'general', 'specialty'],
    description: 'Filter by store category',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: ['performance_score', 'fulfillment_rate', 'avg_rating', 'total_orders', 'total_revenue', 'return_rate', 'dispute_rate'],
    description: 'Sort by field',
    default: 'performance_score',
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'performance_score';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: 'Minimum performance score' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  min_score?: number;

  @ApiPropertyOptional({ description: 'Maximum performance score' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  max_score?: number;
}
