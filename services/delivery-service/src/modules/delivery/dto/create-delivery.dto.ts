import {
  IsUUID,
  IsObject,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryDto {
  @ApiProperty({ description: 'Order ID to create delivery for', format: 'uuid' })
  @IsUUID()
  order_id: string;

  @ApiProperty({
    description: 'Pickup location (store)',
    example: { lat: 14.5995, lng: 120.9842, address: '123 Rizal St, Manila' },
  })
  @IsObject()
  pickup_location: Record<string, unknown>;

  @ApiProperty({
    description: 'Dropoff location (customer)',
    example: { lat: 14.6042, lng: 120.9822, address: '456 Mabini St, Manila' },
  })
  @IsObject()
  dropoff_location: Record<string, unknown>;

  @ApiProperty({ description: 'Delivery fee amount', example: 49.00 })
  @IsNumber()
  @Min(0)
  delivery_fee: number;

  @ApiPropertyOptional({ description: 'Cash on delivery amount', example: 500.00, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cod_amount?: number;

  @ApiPropertyOptional({ description: 'Tip amount for the rider', example: 20.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tip_amount?: number;
}
