import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsLatitude,
  IsLongitude,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Home', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  label: string;

  @ApiProperty({ example: '123 Rizal Street', maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  address_line1: string;

  @ApiPropertyOptional({ example: 'Unit 4B, Sunrise Tower', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address_line2?: string;

  @ApiProperty({ example: 'Barangay San Antonio', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  barangay: string;

  @ApiProperty({ example: 'Makati City', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Metro Manila', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  province: string;

  @ApiProperty({ example: 'NCR', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  region: string;

  @ApiProperty({ example: '1203', maxLength: 10 })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  postal_code: string;

  @ApiProperty({ example: 14.5547 })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 121.0244 })
  @IsNumber()
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({ example: 'Ring the doorbell twice' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  delivery_instructions?: string;
}
