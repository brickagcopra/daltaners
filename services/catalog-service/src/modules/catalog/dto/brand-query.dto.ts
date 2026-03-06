import { IsOptional, IsString, IsEnum, IsInt, IsBoolean, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BrandStatus } from '../entities/brand.entity';

export enum BrandSortBy {
  CREATED_AT = 'created_at',
  NAME = 'name',
  PRODUCT_COUNT = 'product_count',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class BrandQueryDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: BrandStatus })
  @IsOptional()
  @IsEnum(BrandStatus)
  status?: BrandStatus;

  @ApiPropertyOptional({ description: 'Filter by featured' })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @ApiPropertyOptional({ description: 'Filter by country of origin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country_of_origin?: string;

  @ApiPropertyOptional({ description: 'Sort field', enum: BrandSortBy, default: BrandSortBy.NAME })
  @IsOptional()
  @IsEnum(BrandSortBy)
  sort_by?: BrandSortBy = BrandSortBy.NAME;

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
