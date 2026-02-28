import { IsOptional, IsUUID, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReassignDeliveryDto {
  @ApiPropertyOptional({ description: 'Specific rider personnel ID to assign to' })
  @IsOptional()
  @IsUUID()
  personnel_id?: string;

  @ApiPropertyOptional({ description: 'Reason for reassignment' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
