import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateViolationDto {
  @ApiProperty({ description: 'Store UUID' })
  @IsUUID()
  store_id: string;

  @ApiPropertyOptional({ description: 'Policy rule UUID (optional for custom violations)' })
  @IsOptional()
  @IsUUID()
  rule_id?: string;

  @ApiProperty({
    enum: ['quality', 'delivery', 'pricing', 'listing', 'communication', 'fraud', 'compliance', 'safety', 'content', 'other'],
  })
  @IsString()
  category: string;

  @ApiProperty({ enum: ['warning', 'minor', 'major', 'critical'] })
  @IsString()
  severity: string;

  @ApiProperty({ description: 'Violation subject/title' })
  @IsString()
  @MaxLength(500)
  subject: string;

  @ApiProperty({ description: 'Detailed violation description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Evidence URLs (screenshots, documents)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence_urls?: string[];

  @ApiPropertyOptional({ enum: ['system', 'admin', 'customer_report'], default: 'admin' })
  @IsOptional()
  @IsString()
  detected_by?: string;

  @ApiPropertyOptional({ description: 'Penalty type override' })
  @IsOptional()
  @IsString()
  penalty_type?: string;

  @ApiPropertyOptional({ description: 'Penalty value override (fine amount)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  penalty_value?: number;
}

export class ViolationQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by severity' })
  @IsOptional()
  @IsString()
  severity?: string;
}

export class AdminViolationQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by violation number, store name, subject' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by store UUID' })
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'acknowledged', 'under_review', 'appealed', 'resolved', 'dismissed', 'penalty_applied'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: ['quality', 'delivery', 'pricing', 'listing', 'communication', 'fraud', 'compliance', 'safety', 'content', 'other'],
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ['warning', 'minor', 'major', 'critical'] })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ enum: ['system', 'admin', 'customer_report'] })
  @IsOptional()
  @IsString()
  detected_by?: string;
}

export class ApplyPenaltyDto {
  @ApiProperty({ enum: ['warning', 'suspension', 'fine', 'termination'] })
  @IsString()
  penalty_type: string;

  @ApiPropertyOptional({ description: 'Fine amount (for fine penalty)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  penalty_value?: number;

  @ApiPropertyOptional({ description: 'Suspension days (for suspension penalty)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  suspension_days?: number;

  @ApiPropertyOptional({ description: 'Notes about the penalty' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ResolveViolationDto {
  @ApiProperty({ description: 'Resolution notes' })
  @IsString()
  resolution_notes: string;
}

export class DismissViolationDto {
  @ApiProperty({ description: 'Reason for dismissal' })
  @IsString()
  resolution_notes: string;
}
