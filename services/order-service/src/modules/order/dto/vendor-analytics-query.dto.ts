import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class VendorAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2026-02-28' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}
