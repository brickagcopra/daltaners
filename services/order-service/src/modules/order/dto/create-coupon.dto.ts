import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsDateString,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({ description: 'Unique coupon code (uppercase alphanumeric)', example: 'SAVE100' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, { message: 'Code must be uppercase alphanumeric with optional underscores' })
  code: string;

  @ApiProperty({ description: 'Display name', example: 'Save PHP 100' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Coupon description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['percentage', 'fixed_amount', 'free_delivery'], description: 'Type of discount' })
  @IsEnum(['percentage', 'fixed_amount', 'free_delivery'])
  discount_type: 'percentage' | 'fixed_amount' | 'free_delivery';

  @ApiProperty({ description: 'Discount value (percentage or fixed amount)', example: 50 })
  @IsNumber()
  @Min(0)
  discount_value: number;

  @ApiPropertyOptional({ description: 'Minimum order value to use this coupon', example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_order_value?: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount (for percentage type)', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximum_discount?: number;

  @ApiPropertyOptional({ description: 'Restrict to these category UUIDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applicable_categories?: string[];

  @ApiPropertyOptional({ description: 'Restrict to these store UUIDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applicable_stores?: string[];

  @ApiPropertyOptional({ description: 'Total usage limit across all users' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usage_limit?: number;

  @ApiPropertyOptional({ description: 'Per-user usage limit', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  per_user_limit?: number;

  @ApiPropertyOptional({ description: 'Only valid for users with zero previous orders', default: false })
  @IsOptional()
  @IsBoolean()
  is_first_order_only?: boolean;

  @ApiProperty({ description: 'Coupon validity start date (ISO 8601)' })
  @IsDateString()
  valid_from: string;

  @ApiProperty({ description: 'Coupon validity end date (ISO 8601)' })
  @IsDateString()
  valid_until: string;
}
