import { IsOptional, IsUUID, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class OrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by customer UUID' })
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Filter by store UUID' })
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiPropertyOptional({
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
    description: 'Filter by order status',
  })
  @IsOptional()
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
  status?: string;

  @ApiPropertyOptional({ enum: ['delivery', 'pickup'], description: 'Filter by order type' })
  @IsOptional()
  @IsEnum(['delivery', 'pickup'])
  order_type?: string;

  @ApiPropertyOptional({ description: 'Filter orders from this date (ISO 8601)' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter orders until this date (ISO 8601)' })
  @IsOptional()
  @IsString()
  date_to?: string;
}
