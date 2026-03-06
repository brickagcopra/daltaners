import { IsOptional, IsInt, Min, Max, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PopularProductsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by zone ID' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'zone_id must be a valid UUID' })
  zone_id?: string;

  @ApiPropertyOptional({ description: 'Filter by store ID' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'store_id must be a valid UUID' })
  store_id?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'category_id must be a valid UUID' })
  category_id?: string;

  @ApiPropertyOptional({ description: 'Number of products to return', default: 8, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}

export class SimilarProductsQueryDto {
  @ApiPropertyOptional({ description: 'Number of products to return', default: 8, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}

export class FrequentlyBoughtTogetherQueryDto {
  @ApiPropertyOptional({ description: 'Number of products to return', default: 8, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}

export class PersonalizedQueryDto {
  @ApiPropertyOptional({ description: 'Number of products to return', default: 8, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}
