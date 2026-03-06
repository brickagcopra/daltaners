import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreatePolicyRuleDto {
  @ApiProperty({ description: 'Unique rule code', example: 'LATE_DELIVERY' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Rule name', example: 'Late Delivery Violation' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: ['quality', 'delivery', 'pricing', 'listing', 'communication', 'fraud', 'compliance', 'safety', 'content', 'other'],
  })
  @IsString()
  category: string;

  @ApiProperty({ enum: ['warning', 'minor', 'major', 'critical'] })
  @IsString()
  severity: string;

  @ApiProperty({ enum: ['warning', 'suspension', 'fine', 'termination'] })
  @IsString()
  penalty_type: string;

  @ApiPropertyOptional({ description: 'Fine amount (for fine penalty type)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  penalty_value?: number;

  @ApiPropertyOptional({ description: 'Suspension duration in days', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  suspension_days?: number;

  @ApiPropertyOptional({ description: 'Whether this rule is auto-detected by system', default: false })
  @IsOptional()
  @IsBoolean()
  auto_detect?: boolean;

  @ApiPropertyOptional({ description: 'Max violations before escalation', default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  max_violations?: number;
}

export class UpdatePolicyRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['warning', 'minor', 'major', 'critical'] })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ enum: ['warning', 'suspension', 'fine', 'termination'] })
  @IsOptional()
  @IsString()
  penalty_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  penalty_value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  suspension_days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  auto_detect?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  max_violations?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class PolicyRuleQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by code or name' })
  @IsOptional()
  @IsString()
  search?: string;

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

  @ApiPropertyOptional({ description: 'Filter active/inactive rules' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;
}
