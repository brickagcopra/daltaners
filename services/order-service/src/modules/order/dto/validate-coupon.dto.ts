import { IsString, IsNumber, IsOptional, IsArray, IsUUID, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon code to validate', example: 'SAVE100' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Cart subtotal before discount', example: 750 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ description: 'Store UUID for store-restricted coupons' })
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiPropertyOptional({ description: 'Category UUIDs of items in cart', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  category_ids?: string[];
}
