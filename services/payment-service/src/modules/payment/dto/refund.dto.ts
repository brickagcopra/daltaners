import { IsNotEmpty, IsUUID, IsOptional, IsNumber, IsString, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundDto {
  @ApiProperty({ description: 'Transaction ID to refund', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsNotEmpty()
  @IsUUID()
  transaction_id: string;

  @ApiPropertyOptional({ description: 'Partial refund amount (if not provided, full refund)', example: 500.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ description: 'Reason for the refund', example: 'Customer requested cancellation' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
