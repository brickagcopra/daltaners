import {
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OperatingHourEntryDto {
  @ApiProperty({ example: 1, description: '0=Sunday, 1=Monday, ..., 6=Saturday', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @ApiPropertyOptional({ example: '08:00', description: 'Opening time in HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'open_time must be in HH:mm format' })
  open_time?: string;

  @ApiPropertyOptional({ example: '22:00', description: 'Closing time in HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'close_time must be in HH:mm format' })
  close_time?: string;

  @ApiProperty({ example: false, description: 'Whether the store is closed on this day' })
  @IsBoolean()
  is_closed: boolean;
}

export class SetOperatingHoursDto {
  @ApiProperty({ type: [OperatingHourEntryDto], description: 'Array of operating hour entries' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatingHourEntryDto)
  hours: OperatingHourEntryDto[];
}
