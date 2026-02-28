import {
  IsEnum,
  IsOptional,
  IsString,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DeliveryStatus {
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  AT_STORE = 'at_store',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  ARRIVED = 'arrived',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({ enum: DeliveryStatus, description: 'New delivery status' })
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;

  @ApiPropertyOptional({ description: 'Reason for failure (required when status is failed)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  failure_reason?: string;

  @ApiPropertyOptional({
    description: 'Proof of delivery (photo URL, signature, etc.)',
    example: { photo_url: 'https://cdn.daltaners.com/pod/abc.jpg', recipient_name: 'Juan' },
  })
  @IsOptional()
  @IsObject()
  proof_of_delivery?: Record<string, unknown>;
}
