import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class AdminOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by order number, customer email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: [
      'pending', 'confirmed', 'preparing', 'ready',
      'picked_up', 'in_transit', 'delivered', 'cancelled',
      'returned', 'refunded',
    ],
    description: 'Filter by order status',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: ['card', 'gcash', 'maya', 'grabpay', 'cod', 'wallet', 'bank_transfer'],
    description: 'Filter by payment method',
  })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
    description: 'Filter by payment status',
  })
  @IsOptional()
  @IsString()
  payment_status?: string;

  @ApiPropertyOptional({ enum: ['delivery', 'pickup'], description: 'Filter by order type' })
  @IsOptional()
  @IsString()
  order_type?: string;

  @ApiPropertyOptional({ description: 'Filter by store UUID' })
  @IsOptional()
  @IsString()
  store_id?: string;

  @ApiPropertyOptional({ description: 'Filter orders from this date (ISO 8601)' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter orders until this date (ISO 8601)' })
  @IsOptional()
  @IsString()
  date_to?: string;
}

export class AdminOrderStatsQueryDto {
  @ApiPropertyOptional({ description: 'Stats from this date (ISO 8601)' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Stats until this date (ISO 8601)' })
  @IsOptional()
  @IsString()
  date_to?: string;
}
