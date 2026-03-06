import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsIn,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateTaxConfigDto {
  @ApiProperty({ description: 'Tax configuration name', example: 'Standard VAT' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Type of tax',
    enum: ['vat', 'ewt', 'percentage_tax', 'excise', 'custom'],
    example: 'vat',
  })
  @IsIn(['vat', 'ewt', 'percentage_tax', 'excise', 'custom'])
  tax_type: string;

  @ApiProperty({ description: 'Tax rate as decimal (e.g., 0.12 = 12%)', example: 0.12 })
  @IsNumber()
  @Min(0)
  @Max(1)
  rate: number;

  @ApiProperty({
    description: 'What this tax applies to',
    enum: ['all', 'category', 'zone', 'vendor_tier'],
    example: 'all',
  })
  @IsIn(['all', 'category', 'zone', 'vendor_tier'])
  applies_to: string;

  @ApiPropertyOptional({
    description: 'Specific value for applies_to (category name, zone ID, tier name)',
    example: 'grocery',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  applies_to_value?: string;

  @ApiPropertyOptional({ description: 'Description of this tax config' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether tax is inclusive in price', default: true })
  @IsOptional()
  @IsBoolean()
  is_inclusive?: boolean;

  @ApiPropertyOptional({ description: 'Effective from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @ApiPropertyOptional({ description: 'Effective until date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  effective_until?: string;
}

export class UpdateTaxConfigDto {
  @ApiPropertyOptional({ description: 'Tax configuration name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Tax rate as decimal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  rate?: number;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether tax is inclusive in price' })
  @IsOptional()
  @IsBoolean()
  is_inclusive?: boolean;

  @ApiPropertyOptional({ description: 'Whether this config is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Effective from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @ApiPropertyOptional({ description: 'Effective until date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  effective_until?: string;
}

export class TaxConfigQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by tax type',
    enum: ['all', 'vat', 'ewt', 'percentage_tax', 'excise', 'custom'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'vat', 'ewt', 'percentage_tax', 'excise', 'custom'])
  tax_type?: string = 'all';

  @ApiPropertyOptional({
    description: 'Filter by applies_to',
    enum: ['all', 'all_scope', 'category', 'zone', 'vendor_tier'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'all_scope', 'category', 'zone', 'vendor_tier'])
  applies_to?: string = 'all';

  @ApiPropertyOptional({
    description: 'Filter by active status',
    enum: ['all', 'active', 'inactive'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  status?: string = 'all';
}
