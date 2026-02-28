import { IsNotEmpty, IsNumber, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalletTopupDto {
  @ApiProperty({ example: 500, description: 'Amount to top up in PHP' })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(50000)
  amount: number;

  @ApiPropertyOptional({ example: 'Monthly top-up' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
