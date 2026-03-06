import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnRequestQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['pending', 'approved', 'denied', 'cancelled', 'received', 'refunded', 'escalated'],
  })
  @IsOptional()
  @IsEnum(['pending', 'approved', 'denied', 'cancelled', 'received', 'refunded', 'escalated'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by reason category' })
  @IsOptional()
  @IsEnum(['defective', 'wrong_item', 'damaged', 'not_as_described', 'missing_item', 'expired', 'change_of_mind', 'other'])
  reason_category?: string;

  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601)' })
  @IsOptional()
  @IsString()
  date_to?: string;
}

export class AdminReturnQueryDto extends ReturnRequestQueryDto {
  @ApiPropertyOptional({ description: 'Search by request number or order number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by store UUID' })
  @IsOptional()
  @IsString()
  store_id?: string;

  @ApiPropertyOptional({ description: 'Filter by customer UUID' })
  @IsOptional()
  @IsString()
  customer_id?: string;
}
