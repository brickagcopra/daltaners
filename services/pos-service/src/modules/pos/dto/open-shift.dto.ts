import { IsUUID, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenShiftDto {
  @ApiProperty({ description: 'Terminal ID to open shift on' })
  @IsUUID()
  terminal_id: string;

  @ApiProperty({ description: 'Opening cash float amount', minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  opening_cash: number;

  @ApiPropertyOptional({ description: 'Cashier display name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cashier_name?: string;
}
