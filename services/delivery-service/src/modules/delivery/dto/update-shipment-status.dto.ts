import { IsString, IsOptional, IsObject, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SHIPMENT_STATUSES = [
  'pending', 'booked', 'label_generated', 'picked_up',
  'in_transit', 'out_for_delivery', 'delivered',
  'failed', 'returned_to_sender', 'cancelled',
] as const;

export class UpdateShipmentStatusDto {
  @ApiProperty({
    description: 'New shipment status',
    enum: SHIPMENT_STATUSES,
  })
  @IsIn(SHIPMENT_STATUSES)
  status: string;

  @ApiPropertyOptional({ description: 'Carrier tracking number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tracking_number?: string;

  @ApiPropertyOptional({ description: 'Carrier reference ID' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  carrier_reference?: string;

  @ApiPropertyOptional({ description: 'Raw carrier status string' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrier_status?: string;

  @ApiPropertyOptional({ description: 'Carrier API response payload' })
  @IsOptional()
  @IsObject()
  carrier_response?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Label download URL' })
  @IsOptional()
  @IsString()
  label_url?: string;

  @ApiPropertyOptional({ description: 'Label format', enum: ['pdf', 'png', 'zpl'] })
  @IsOptional()
  @IsIn(['pdf', 'png', 'zpl'])
  label_format?: string;

  @ApiPropertyOptional({ description: 'Notes or failure reason' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
