import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsUrl,
  IsEmail,
  IsObject,
  MaxLength,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCarrierDto {
  @ApiProperty({ description: 'Carrier name', example: 'J&T Express' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Unique carrier code', example: 'jnt' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ description: 'Carrier logo URL' })
  @IsOptional()
  @IsUrl()
  logo_url?: string;

  @ApiProperty({ description: 'Carrier type', enum: ['third_party', 'platform'] })
  @IsIn(['third_party', 'platform'])
  type: string;

  @ApiPropertyOptional({ description: 'API base URL for carrier integration' })
  @IsOptional()
  @IsUrl()
  api_base_url?: string;

  @ApiPropertyOptional({ description: 'Encrypted API credentials (keys, tokens)', default: {} })
  @IsOptional()
  @IsObject()
  api_credentials?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Supported service types',
    example: ['grocery', 'parcel'],
    default: ['grocery', 'food', 'pharmacy', 'parcel'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supported_service_types?: string[];

  @ApiPropertyOptional({ description: 'Whether the carrier is active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Selection priority (higher = preferred)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ description: 'Carrier contact phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contact_phone?: string;

  @ApiPropertyOptional({ description: 'Carrier contact email' })
  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @ApiPropertyOptional({ description: 'Webhook secret for verifying carrier callbacks' })
  @IsOptional()
  @IsString()
  webhook_secret?: string;

  @ApiPropertyOptional({
    description: 'Tracking URL template (use {{tracking_number}} placeholder)',
    example: 'https://www.jtexpress.ph/track?billcode={{tracking_number}}',
  })
  @IsOptional()
  @IsString()
  tracking_url_template?: string;

  @ApiPropertyOptional({ description: 'Additional carrier settings', default: {} })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
