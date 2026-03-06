import { IsInt, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustPointsDto {
  @ApiProperty({ description: 'Points to adjust (positive to add, negative to deduct)' })
  @IsInt()
  points: number;

  @ApiProperty({ description: 'Reason for the adjustment', minLength: 5, maxLength: 500 })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
