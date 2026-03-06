import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsUUID,
  ArrayMinSize,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveSettlementDto {
  @ApiPropertyOptional({ description: 'Admin notes on approval' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ProcessSettlementDto {
  @ApiPropertyOptional({ description: 'Payment reference (bank transfer ref, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  payment_reference?: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RejectSettlementDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class AdjustSettlementDto {
  @ApiProperty({ description: 'Adjustment amount (positive = add, negative = deduct)' })
  @IsNumber()
  adjustment_amount: number;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class BatchProcessDto {
  @ApiProperty({ description: 'Settlement IDs to process', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  settlement_ids: string[];

  @ApiPropertyOptional({ description: 'Reference prefix for batch payment' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference_prefix?: string;
}
