import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ReviewableType } from './create-review.dto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export enum ReviewSortBy {
  CREATED_AT = 'created_at',
  RATING = 'rating',
  HELPFUL_COUNT = 'helpful_count',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ReviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by reviewable type', enum: ReviewableType })
  @IsOptional()
  @IsEnum(ReviewableType)
  reviewable_type?: ReviewableType;

  @ApiPropertyOptional({ description: 'Filter by reviewable entity ID' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'reviewable_id must be a valid UUID' })
  reviewable_id?: string;

  @ApiPropertyOptional({ description: 'Filter by rating', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Sort field', enum: ReviewSortBy, default: ReviewSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(ReviewSortBy)
  sort_by?: ReviewSortBy = ReviewSortBy.CREATED_AT;

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.DESC;
}

export class AdminReviewQueryDto {
  @ApiPropertyOptional({ description: 'Search reviews by title or body' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by reviewable type', enum: ReviewableType })
  @IsOptional()
  @IsEnum(ReviewableType)
  reviewable_type?: ReviewableType;

  @ApiPropertyOptional({ description: 'Filter by approval status' })
  @IsOptional()
  @IsBoolean()
  is_approved?: boolean;

  @ApiPropertyOptional({ description: 'Filter by rating', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
