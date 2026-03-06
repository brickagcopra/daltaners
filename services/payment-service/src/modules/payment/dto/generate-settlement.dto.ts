import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSettlementDto {
  @ApiProperty({ description: 'Period start (ISO 8601)', example: '2026-02-24T00:00:00+08:00' })
  @IsDateString()
  period_start: string;

  @ApiProperty({ description: 'Period end (ISO 8601)', example: '2026-03-02T23:59:59+08:00' })
  @IsDateString()
  period_end: string;

  @ApiPropertyOptional({ description: 'Generate for a specific vendor only' })
  @IsOptional()
  @IsUUID()
  vendor_id?: string;
}
