import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Search query text' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'category_id must be a valid UUID' })
  category_id?: string;

  @ApiPropertyOptional({ description: 'Filter by store ID' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'store_id must be a valid UUID' })
  store_id?: string;

  @ApiPropertyOptional({ description: 'Filter by brand name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  min_price?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  max_price?: number;

  @ApiPropertyOptional({ description: 'Filter by dietary tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  dietary_tags?: string[];

  @ApiPropertyOptional({
    description: 'Sort field: _score, base_price, rating_average, total_sold, created_at',
    default: '_score',
  })
  @IsOptional()
  @IsString()
  sort_by?: string = '_score';

  @ApiPropertyOptional({ description: 'Sort direction: asc or desc', default: 'desc' })
  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Page number (0-indexed)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value !== undefined ? Number(value) : 0))
  page?: number = 0;

  @ApiPropertyOptional({ description: 'Results per page', default: 20, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value !== undefined ? Number(value) : 20))
  size?: number = 20;
}

export class SuggestQueryDto {
  @ApiPropertyOptional({ description: 'Autocomplete query text' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Maximum suggestions to return', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Transform(({ value }) => (value !== undefined ? Number(value) : 10))
  size?: number = 10;
}
