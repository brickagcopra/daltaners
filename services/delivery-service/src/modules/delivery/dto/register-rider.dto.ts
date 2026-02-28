import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VehicleType {
  BICYCLE = 'bicycle',
  MOTORCYCLE = 'motorcycle',
  CAR = 'car',
  VAN = 'van',
  WALKING = 'walking',
}

export class RegisterRiderDto {
  @ApiProperty({ description: 'User ID of the rider', format: 'uuid' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ enum: VehicleType, description: 'Type of vehicle used for delivery' })
  @IsEnum(VehicleType)
  vehicle_type: VehicleType;

  @ApiPropertyOptional({ description: 'Vehicle plate number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehicle_plate?: string;

  @ApiPropertyOptional({ description: 'Driver license number', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  license_number?: string;

  @ApiPropertyOptional({ description: 'License expiry date (ISO 8601)', example: '2027-12-31' })
  @IsOptional()
  @IsDateString()
  license_expiry?: string;
}
