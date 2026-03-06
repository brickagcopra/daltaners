import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, Matches, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Permissive UUID regex — accepts any 8-4-4-4-12 hex string.
// validator.js v13+ @IsUUID() rejects synthetic UUIDs without proper version/variant bits.
// PostgreSQL's uuid column type enforces format at the DB level anyway.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export enum ProductSortBy {
  CREATED_AT = 'created_at',
  BASE_PRICE = 'base_price',
  NAME = 'name',
  RATING_AVERAGE = 'rating_average',
  TOTAL_SOLD = 'total_sold',
  SORT_ORDER = 'sort_order',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by store ID' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'store_id must be a valid UUID' })
  store_id?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'category_id must be a valid UUID' })
  category_id?: string;

  @ApiPropertyOptional({ description: 'Filter by brand name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @ApiPropertyOptional({ description: 'Filter by brand ID from brand registry' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'brand_id must be a valid UUID' })
  brand_id?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_price?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_price?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Text search on product name and description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Sort field', enum: ProductSortBy, default: ProductSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sort_by?: ProductSortBy = ProductSortBy.CREATED_AT;

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.DESC;
}
