import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ description: 'Product name for receipt/history', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  product_name: string;

  @ApiPropertyOptional({ description: 'Product barcode', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiPropertyOptional({ description: 'Product SKU', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiProperty({ description: 'Unit price', minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_price: number;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Tax amount for this item', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax_amount?: number;

  @ApiPropertyOptional({ description: 'Discount amount for this item', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount_amount?: number;
}
