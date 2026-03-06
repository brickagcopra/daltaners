import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VendorResponseDto {
  @ApiProperty({ description: 'Vendor response text to the review' })
  @IsString()
  @MaxLength(2000)
  response: string;
}
