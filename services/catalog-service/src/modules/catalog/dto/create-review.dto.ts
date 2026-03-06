import {
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  MaxLength,
  Min,
  Max,
  ArrayMaxSize,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewableType {
  STORE = 'store',
  PRODUCT = 'product',
  DELIVERY_PERSONNEL = 'delivery_personnel',
}

export class CreateReviewDto {
  @ApiProperty({ description: 'Type of entity being reviewed', enum: ReviewableType })
  @IsEnum(ReviewableType)
  reviewable_type: ReviewableType;

  @ApiProperty({ description: 'ID of the entity being reviewed' })
  @IsUUID()
  reviewable_id: string;

  @ApiPropertyOptional({ description: 'Order ID (for verified purchase)' })
  @IsOptional()
  @IsUUID()
  order_id?: string;

  @ApiProperty({ description: 'Rating 1-5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Review title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Review body text' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;

  @ApiPropertyOptional({ description: 'Review image URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  images?: string[];
}
