import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DeliveryFeeDto {
  @ApiProperty({ example: 14.5547, description: 'Origin latitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  origin_lat: number;

  @ApiProperty({ example: 121.0244, description: 'Origin longitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  origin_lng: number;

  @ApiProperty({ example: 14.5896, description: 'Destination latitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  destination_lat: number;

  @ApiProperty({ example: 121.0563, description: 'Destination longitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  destination_lng: number;
}
