import { IsOptional, IsString, IsIn, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class AdminTransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by order ID or user ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction status',
    enum: ['all', 'pending', 'processing', 'completed', 'failed', 'reversed'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'pending', 'processing', 'completed', 'failed', 'reversed'])
  status?: string = 'all';

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: ['all', 'card', 'gcash', 'maya', 'grabpay', 'cod', 'wallet', 'bank_transfer'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'card', 'gcash', 'maya', 'grabpay', 'cod', 'wallet', 'bank_transfer'])
  method?: string = 'all';

  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: ['all', 'charge', 'refund'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'charge', 'refund'])
  type?: string = 'all';

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)', example: '2026-01-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}

export class AdminSettlementQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by vendor ID' })
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by settlement status',
    enum: ['all', 'pending', 'processing', 'completed', 'failed'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'pending', 'processing', 'completed', 'failed'])
  status?: string = 'all';

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}

export class AdminWalletQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by user ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by wallet status',
    enum: ['all', 'active', 'inactive'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  status?: string = 'all';
}
