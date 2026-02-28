import { IsUUID, IsEnum, IsOptional, IsString, IsNumber, IsArray, ValidateNested, Min, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  product_id: string;

  @ApiPropertyOptional({ description: 'Variant UUID if applicable' })
  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @ApiProperty({ description: 'Quantity to order', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Special instructions for this item' })
  @IsOptional()
  @IsString()
  special_instructions?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Store UUID' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ description: 'Store location UUID' })
  @IsUUID()
  store_location_id: string;

  @ApiProperty({ enum: ['delivery', 'pickup'], description: 'Order type' })
  @IsEnum(['delivery', 'pickup'])
  order_type: string;

  @ApiProperty({ enum: ['grocery', 'food', 'pharmacy', 'parcel'], description: 'Service type' })
  @IsEnum(['grocery', 'food', 'pharmacy', 'parcel'])
  service_type: string;

  @ApiProperty({ enum: ['standard', 'express', 'scheduled', 'instant'], description: 'Delivery type' })
  @IsEnum(['standard', 'express', 'scheduled', 'instant'])
  delivery_type: string;

  @ApiPropertyOptional({ description: 'Scheduled delivery time (ISO 8601)' })
  @IsOptional()
  @IsString()
  scheduled_at?: string;

  @ApiProperty({ enum: ['card', 'gcash', 'maya', 'grabpay', 'cod', 'wallet', 'bank_transfer'], description: 'Payment method' })
  @IsEnum(['card', 'gcash', 'maya', 'grabpay', 'cod', 'wallet', 'bank_transfer'])
  payment_method: string;

  @ApiProperty({ description: 'Delivery address object with street, city, province, zip, lat, lng' })
  @IsObject()
  delivery_address: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Special delivery instructions' })
  @IsOptional()
  @IsString()
  delivery_instructions?: string;

  @ApiPropertyOptional({ enum: ['accept_similar', 'specific_only', 'refund_only'], description: 'Substitution policy for unavailable items' })
  @IsOptional()
  @IsEnum(['accept_similar', 'specific_only', 'refund_only'])
  substitution_policy?: string;

  @ApiPropertyOptional({ description: 'Coupon code to apply' })
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ApiPropertyOptional({ description: 'Customer notes for the order' })
  @IsOptional()
  @IsString()
  customer_notes?: string;

  @ApiPropertyOptional({ description: 'Tip amount for delivery', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tip_amount?: number;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'Order items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
