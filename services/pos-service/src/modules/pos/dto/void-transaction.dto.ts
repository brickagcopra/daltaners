import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoidTransactionDto {
  @ApiProperty({ description: 'Reason for voiding the transaction', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  void_reason: string;
}
