import { IsString, IsOptional, MaxLength, IsIn, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTerminalDto {
  @ApiPropertyOptional({ description: 'Terminal display name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Terminal status', enum: ['active', 'inactive', 'maintenance'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'maintenance'])
  status?: string;

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
