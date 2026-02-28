import { IsNotEmpty, IsNumber, IsUUID, Min, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalletTransferDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsNotEmpty()
  @IsUUID()
  recipient_user_id: string;

  @ApiProperty({ example: 100, description: 'Amount to transfer in PHP' })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'Payment for groceries' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
