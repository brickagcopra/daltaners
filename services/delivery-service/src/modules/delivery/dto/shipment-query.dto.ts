import { IsOptional, IsString, IsUUID, IsIn, IsInt, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const SHIPMENT_STATUSES = [
  'pending', 'booked', 'label_generated', 'picked_up',
  'in_transit', 'out_for_delivery', 'delivered',
  'failed', 'returned_to_sender', 'cancelled',
] as const;

export class ShipmentQueryDto {
  @ApiPropertyOptional({ description: 'Filter by store ID' })
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: SHIPMENT_STATUSES })
  @IsOptional()
  @IsIn(SHIPMENT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by carrier ID' })
  @IsOptional()
  @IsUUID()
  carrier_id?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AdminShipmentQueryDto extends ShipmentQueryDto {
  @ApiPropertyOptional({ description: 'Search by shipment number or tracking number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by order ID' })
  @IsOptional()
  @IsUUID()
  order_id?: string;

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['created_at', 'updated_at', 'shipping_fee', 'status'],
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(['created_at', 'updated_at', 'shipping_fee', 'status'])
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}
