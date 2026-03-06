import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class GenerateTaxReportDto {
  @ApiProperty({
    description: 'Report type',
    enum: ['monthly_vat', 'quarterly_vat', 'annual_income', 'ewt_summary'],
    example: 'monthly_vat',
  })
  @IsIn(['monthly_vat', 'quarterly_vat', 'annual_income', 'ewt_summary'])
  report_type: string;

  @ApiProperty({ description: 'Year for the report period', example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  period_year: number;

  @ApiPropertyOptional({
    description: 'Month for monthly reports (1-12)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  period_month?: number;

  @ApiPropertyOptional({
    description: 'Quarter for quarterly reports (1-4)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  period_quarter?: number;
}

export class TaxReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by report type',
    enum: ['all', 'monthly_vat', 'quarterly_vat', 'annual_income', 'ewt_summary'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'monthly_vat', 'quarterly_vat', 'annual_income', 'ewt_summary'])
  report_type?: string = 'all';

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['all', 'draft', 'finalized', 'filed', 'amended'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'draft', 'finalized', 'filed', 'amended'])
  status?: string = 'all';

  @ApiPropertyOptional({ description: 'Filter by year', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ description: 'Search by report number' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class FinalizeTaxReportDto {
  @ApiPropertyOptional({ description: 'Notes for finalization' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FileTaxReportDto {
  @ApiPropertyOptional({ description: 'BIR filing reference number' })
  @IsOptional()
  @IsString()
  filing_reference?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
