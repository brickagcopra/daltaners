import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VendorRespondDisputeDto {
  @ApiProperty({ description: 'Vendor response message' })
  @IsString()
  @MaxLength(5000)
  message: string;
}

export class EscalateDisputeDto {
  @ApiPropertyOptional({ description: 'Reason for escalation' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  escalation_reason?: string;
}

export class AdminAssignDisputeDto {
  @ApiProperty({ description: 'Admin user ID to assign' })
  @IsUUID()
  admin_id: string;
}

export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Resolution type',
    enum: ['refund', 'partial_refund', 'replacement', 'store_credit', 'no_action', 'warning_issued'],
  })
  @IsEnum(['refund', 'partial_refund', 'replacement', 'store_credit', 'no_action', 'warning_issued'])
  resolution_type: string;

  @ApiPropertyOptional({ description: 'Resolution amount (for refund/partial_refund)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  resolution_amount?: number;

  @ApiPropertyOptional({ description: 'Resolution notes' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  resolution_notes?: string;
}

export class AdminDisputeMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ description: 'Whether this is an internal note (not visible to customer/vendor)' })
  @IsOptional()
  @IsBoolean()
  is_internal?: boolean;
}
