import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'picked_up',
      'in_transit',
      'delivered',
      'cancelled',
      'returned',
      'refunded',
    ],
    description: 'New order status',
  })
  @IsEnum([
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'picked_up',
    'in_transit',
    'delivered',
    'cancelled',
    'returned',
    'refunded',
  ])
  status: string;

  @ApiPropertyOptional({ description: 'Reason for cancellation (required when status is cancelled)' })
  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}
