import { IsNumber, IsOptional, IsObject, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShippingRateRequestDto {
  @ApiProperty({ description: 'Store ID', format: 'uuid' })
  @IsUUID()
  store_id: string;

  @ApiProperty({
    description: 'Pickup address',
    example: { city: 'Manila', province: 'Metro Manila', latitude: 14.5995, longitude: 120.9842 },
  })
  @IsObject()
  pickup_address: Record<string, unknown>;

  @ApiProperty({
    description: 'Delivery address',
    example: { city: 'Quezon City', province: 'Metro Manila', latitude: 14.6510, longitude: 121.0496 },
  })
  @IsObject()
  delivery_address: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Package weight in kg', example: 2.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight_kg?: number;

  @ApiPropertyOptional({
    description: 'Package dimensions',
    example: { length_cm: 30, width_cm: 20, height_cm: 15 },
  })
  @IsOptional()
  @IsObject()
  dimensions?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Whether COD is needed' })
  @IsOptional()
  cod_required?: boolean;
}
