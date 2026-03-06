import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TerminalHeartbeatDto {
  @ApiPropertyOptional({ description: 'Current IP address of the terminal', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ip_address?: string;
}
