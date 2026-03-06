import { IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseShiftDto {
  @ApiProperty({ description: 'Actual closing cash amount in drawer', minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  closing_cash: number;

  @ApiPropertyOptional({ description: 'Notes about the shift close', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  close_notes?: string;
}
