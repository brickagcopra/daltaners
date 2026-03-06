import { IsDateString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportQueryDto {
  @ApiProperty({ description: 'Report period start date (ISO 8601)' })
  @IsDateString()
  date_from: string;

  @ApiProperty({ description: 'Report period end date (ISO 8601)' })
  @IsDateString()
  date_to: string;

  @ApiPropertyOptional({ description: 'Limit for top-N queries (e.g. top products)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  top_limit?: number;
}
