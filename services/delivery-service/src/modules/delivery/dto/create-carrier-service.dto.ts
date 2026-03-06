import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  IsUUID,
  IsObject,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCarrierServiceDto {
  @ApiProperty({ description: 'Carrier ID', format: 'uuid' })
  @IsUUID()
  carrier_id: string;

  @ApiProperty({ description: 'Service name', example: 'Express Delivery' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Service code (unique per carrier)', example: 'express' })
  @IsString()
  @MaxLength(100)
  code: string;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Minimum estimated delivery days', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimated_days_min?: number;

  @ApiPropertyOptional({ description: 'Maximum estimated delivery days', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimated_days_max?: number;

  @ApiProperty({ description: 'Base shipping price in PHP', example: 85.00 })
  @IsNumber()
  @Min(0)
  base_price: number;

  @ApiPropertyOptional({ description: 'Additional price per kilogram', example: 15.00, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  per_kg_price?: number;

  @ApiPropertyOptional({ description: 'Maximum package weight in kg', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_weight_kg?: number;

  @ApiPropertyOptional({
    description: 'Maximum package dimensions',
    example: { length_cm: 100, width_cm: 80, height_cm: 60 },
  })
  @IsOptional()
  @IsObject()
  max_dimensions?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Whether COD is supported', default: false })
  @IsOptional()
  @IsBoolean()
  is_cod_supported?: boolean;

  @ApiPropertyOptional({ description: 'Whether insurance is available', default: false })
  @IsOptional()
  @IsBoolean()
  is_insurance_available?: boolean;

  @ApiPropertyOptional({ description: 'Areas covered by this service', example: ['Metro Manila', 'Cebu'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverage_areas?: string[];

  @ApiPropertyOptional({ description: 'Whether the service is active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateCarrierServiceDto {
  @ApiPropertyOptional({ description: 'Service name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  estimated_days_min?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  estimated_days_max?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  base_price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  per_kg_price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_weight_kg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  max_dimensions?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_cod_supported?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_insurance_available?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverage_areas?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
