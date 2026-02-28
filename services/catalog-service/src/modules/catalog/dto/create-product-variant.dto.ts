import { IsString, IsOptional, IsNumber, IsObject, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductVariantDto {
  @ApiProperty({ description: 'Variant name (e.g., "Large", "Red")', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Variant SKU', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ description: 'Price adjustment from base price', default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  price_adjustment?: number;

  @ApiPropertyOptional({ description: 'Variant attributes (color, size, etc.)' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
