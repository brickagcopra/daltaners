import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandDto {
  @ApiPropertyOptional({ description: 'Brand name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Brand description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Brand logo URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({ description: 'Brand banner URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  banner_url?: string;

  @ApiPropertyOptional({ description: 'Brand website URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website_url?: string;

  @ApiPropertyOptional({ description: 'Country of origin', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country_of_origin?: string;

  @ApiPropertyOptional({ description: 'Whether brand is featured' })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;
}
