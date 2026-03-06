import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsInt,
  IsArray,
  IsEnum,
  IsObject,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UnitType {
  PIECE = 'piece',
  KG = 'kg',
  G = 'g',
  L = 'L',
  ML = 'mL',
  PACK = 'pack',
  BOX = 'box',
  BOTTLE = 'bottle',
  CAN = 'can',
  BAG = 'bag',
  BUNDLE = 'bundle',
  DOZEN = 'dozen',
}

export class CreateProductDto {
  @ApiProperty({ description: 'Store ID that owns this product' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ description: 'Category ID for the product' })
  @IsUUID()
  category_id: string;

  @ApiProperty({ description: 'Product name', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  name: string;

  @ApiPropertyOptional({ description: 'Full product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Short description for listings', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  short_description?: string;

  @ApiPropertyOptional({ description: 'Stock Keeping Unit code', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode (UPC/EAN)', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional({ description: 'Brand name (legacy text field)', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @ApiPropertyOptional({ description: 'Brand ID from brand registry' })
  @IsOptional()
  @IsUUID()
  brand_id?: string;

  @ApiPropertyOptional({ description: 'Unit type', enum: UnitType })
  @IsOptional()
  @IsEnum(UnitType)
  unit_type?: UnitType;

  @ApiPropertyOptional({ description: 'Unit value (e.g., 500 for 500g)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  unit_value?: number;

  @ApiProperty({ description: 'Base price in PHP' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  base_price: number;

  @ApiPropertyOptional({ description: 'Sale price in PHP' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  sale_price?: number;

  @ApiPropertyOptional({ description: 'Cost price in PHP (not shown to customers)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost_price?: number;

  @ApiPropertyOptional({ description: 'Tax rate percentage', default: 12.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  tax_rate?: number;

  @ApiPropertyOptional({ description: 'Whether product is taxable', default: true })
  @IsOptional()
  @IsBoolean()
  is_taxable?: boolean;

  @ApiPropertyOptional({ description: 'Weight in grams' })
  @IsOptional()
  @IsInt()
  @Min(0)
  weight_grams?: number;

  @ApiPropertyOptional({ description: 'Dimensions (length, width, height in cm)' })
  @IsOptional()
  @IsObject()
  dimensions?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Whether product is perishable', default: false })
  @IsOptional()
  @IsBoolean()
  is_perishable?: boolean;

  @ApiPropertyOptional({ description: 'Shelf life in days for perishable items' })
  @IsOptional()
  @IsInt()
  @Min(0)
  shelf_life_days?: number;

  @ApiPropertyOptional({ description: 'Whether product requires prescription', default: false })
  @IsOptional()
  @IsBoolean()
  requires_prescription?: boolean;

  @ApiPropertyOptional({ description: 'Nutritional information JSON' })
  @IsOptional()
  @IsObject()
  nutritional_info?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'List of allergens', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Dietary tags (e.g., vegan, halal)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietary_tags?: string[];
}
