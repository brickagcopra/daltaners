import { IsNotEmpty, IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty({ description: 'Transaction ID to confirm', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsNotEmpty()
  @IsUUID()
  transaction_id: string;

  @ApiPropertyOptional({
    description: 'Gateway transaction ID from payment provider',
    example: 'pi_3ABC123def456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  gateway_transaction_id?: string;
}
