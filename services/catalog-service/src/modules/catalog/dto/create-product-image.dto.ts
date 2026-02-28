import { IsString, IsOptional, IsBoolean, IsInt, IsUrl, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductImageDto {
  @ApiProperty({ description: 'Full-size image URL', maxLength: 500 })
  @IsUrl()
  @MaxLength(500)
  url: string;

  @ApiPropertyOptional({ description: 'Thumbnail image URL', maxLength: 500 })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  thumbnail_url?: string;

  @ApiPropertyOptional({ description: 'Alt text for accessibility', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt_text?: string;

  @ApiPropertyOptional({ description: 'Display sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ description: 'Whether this is the primary product image', default: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}
