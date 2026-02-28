import { IsOptional, IsEnum, IsArray, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '../entities/store-staff.entity';

export class UpdateStoreStaffDto {
  @ApiPropertyOptional({ enum: StaffRole, example: StaffRole.MANAGER })
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @ApiPropertyOptional({ example: ['product:manage', 'order:view', 'order:manage'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
