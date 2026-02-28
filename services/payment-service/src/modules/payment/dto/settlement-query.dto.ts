import { IsOptional, IsUUID, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class SettlementQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by vendor ID' })
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by settlement status',
    enum: SettlementStatus,
  })
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;

  @ApiPropertyOptional({ description: 'Filter by period start (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  period_start?: string;

  @ApiPropertyOptional({ description: 'Filter by period end (ISO 8601)', example: '2026-01-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  period_end?: string;
}
