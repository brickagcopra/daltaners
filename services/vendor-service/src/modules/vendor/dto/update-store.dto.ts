import { PartialType } from '@nestjs/swagger';
import { CreateStoreDto } from './create-store.dto';
import { IsOptional, IsString, IsNumber, MaxLength, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreDto extends PartialType(CreateStoreDto) {
  @ApiPropertyOptional({ example: 'https://cdn.daltaners.ph/stores/logo.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({ example: 'https://cdn.daltaners.ph/stores/banner.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  banner_url?: string;

  @ApiPropertyOptional({ example: 'DTI-123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dti_registration?: string;

  @ApiPropertyOptional({ example: '123-456-789-000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bir_tin?: string;

  @ApiPropertyOptional({ example: 'https://cdn.daltaners.ph/permits/permit.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  business_permit_url?: string;

  @ApiPropertyOptional({ example: 30, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  preparation_time_minutes?: number;
}
