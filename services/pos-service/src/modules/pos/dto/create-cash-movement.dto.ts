import { IsNumber, IsIn, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCashMovementDto {
  @ApiProperty({ description: 'Type of cash movement', enum: ['cash_in', 'cash_out', 'float', 'pickup'] })
  @IsIn(['cash_in', 'cash_out', 'float', 'pickup'])
  type: string;

  @ApiProperty({ description: 'Amount of the cash movement', minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Reason for the cash movement', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
