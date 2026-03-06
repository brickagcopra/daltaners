import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsObject,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty({ description: 'Order ID', format: 'uuid' })
  @IsUUID()
  order_id: string;

  @ApiProperty({ description: 'Carrier ID', format: 'uuid' })
  @IsUUID()
  carrier_id: string;

  @ApiPropertyOptional({ description: 'Carrier service ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  carrier_service_id?: string;

  @ApiProperty({ description: 'Store ID', format: 'uuid' })
  @IsUUID()
  store_id: string;

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

  @ApiPropertyOptional({ description: 'Number of packages', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  package_count?: number;

  @ApiProperty({
    description: 'Pickup address (store)',
    example: { address_line1: '123 Rizal St', city: 'Manila', province: 'Metro Manila', latitude: 14.5995, longitude: 120.9842 },
  })
  @IsObject()
  pickup_address: Record<string, unknown>;

  @ApiProperty({
    description: 'Delivery address (customer)',
    example: { address_line1: '456 Mabini St', city: 'Quezon City', province: 'Metro Manila', latitude: 14.6510, longitude: 121.0496 },
  })
  @IsObject()
  delivery_address: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Shipping fee in PHP', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shipping_fee?: number;

  @ApiPropertyOptional({ description: 'Insurance amount in PHP', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insurance_amount?: number;

  @ApiPropertyOptional({ description: 'COD amount in PHP', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cod_amount?: number;

  @ApiPropertyOptional({ description: 'Notes for the shipment' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', default: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
