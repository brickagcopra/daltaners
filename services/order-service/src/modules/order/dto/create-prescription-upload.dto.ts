import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrescriptionUploadDto {
  @ApiProperty({ description: 'URL of the uploaded prescription image' })
  @IsString()
  @MaxLength(500)
  image_url: string;

  @ApiProperty({ description: 'SHA-256 hash of the prescription image' })
  @IsString()
  @MaxLength(64)
  image_hash: string;

  @ApiPropertyOptional({ description: 'Doctor name on the prescription' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  doctor_name?: string;

  @ApiPropertyOptional({ description: 'Doctor PRC license number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  doctor_license?: string;

  @ApiPropertyOptional({ description: 'Date of the prescription (ISO date)' })
  @IsOptional()
  @IsDateString()
  prescription_date?: string;

  @ApiPropertyOptional({ description: 'Expiration date of the prescription (ISO datetime)' })
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
