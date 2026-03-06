import { IsString, IsUUID, IsOptional, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTerminalDto {
  @ApiProperty({ description: 'Store ID the terminal belongs to' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ description: 'Terminal display name', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Unique terminal code', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  terminal_code: string;

  @ApiPropertyOptional({ description: 'Hardware configuration' })
  @IsOptional()
  @IsObject()
  hardware_config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Terminal IP address', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ip_address?: string;
}
