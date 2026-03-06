import { IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class TransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by type', enum: ['sale', 'refund', 'exchange'] })
  @IsOptional()
  @IsIn(['sale', 'refund', 'exchange'])
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ['completed', 'voided', 'pending'] })
  @IsOptional()
  @IsIn(['completed', 'voided', 'pending'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by payment method', enum: ['cash', 'card', 'gcash', 'maya', 'wallet'] })
  @IsOptional()
  @IsIn(['cash', 'card', 'gcash', 'maya', 'wallet'])
  payment_method?: string;

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter until date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}
