import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsInt,
  MaxLength,
  Min,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeoJsonPolygonDto {
  @ApiProperty({ example: 'Polygon' })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Array of coordinate rings. Each ring is an array of [longitude, latitude] pairs.',
    example: [[[121.0, 14.5], [121.1, 14.5], [121.1, 14.6], [121.0, 14.6], [121.0, 14.5]]],
  })
  @IsArray()
  @ArrayMinSize(1)
  coordinates: number[][][];
}

export class CreateZoneDto {
  @ApiProperty({ example: 'Makati', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Makati City', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Metro Manila', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  province: string;

  @ApiProperty({ example: 'NCR', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  region: string;

  @ApiPropertyOptional({
    description: 'GeoJSON Polygon for the zone boundary',
    type: GeoJsonPolygonDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJsonPolygonDto)
  boundary?: GeoJsonPolygonDto;

  @ApiProperty({ example: 49.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  base_delivery_fee: number;

  @ApiProperty({ example: 10.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  per_km_fee: number;

  @ApiPropertyOptional({ example: 1.00, default: 1.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  surge_multiplier?: number;

  @ApiPropertyOptional({ example: 10.00, default: 10.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  max_delivery_radius_km?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity_limit?: number;

  @ApiPropertyOptional({ default: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
