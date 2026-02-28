import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '../entities/store-staff.entity';

export class CreateStoreStaffDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID to add as staff' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ enum: StaffRole, example: StaffRole.STAFF })
  @IsEnum(StaffRole)
  role: StaffRole;

  @ApiPropertyOptional({
    example: ['product:manage', 'order:view'],
    description: 'List of permission strings',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
