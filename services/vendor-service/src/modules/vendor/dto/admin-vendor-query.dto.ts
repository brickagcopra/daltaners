import { IsOptional, IsString, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AdminVendorQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by store name, owner email, slug' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'active', 'suspended', 'closed'],
    description: 'Filter by store status',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: ['grocery', 'restaurant', 'pharmacy', 'electronics', 'fashion', 'general', 'specialty'],
    description: 'Filter by store category',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: ['free', 'silver', 'gold', 'platinum'],
    description: 'Filter by subscription tier',
  })
  @IsOptional()
  @IsString()
  subscription_tier?: string;
}

export class AdminVendorActionDto {
  @ApiPropertyOptional({ description: 'Reason for the action' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Commission rate to set (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commission_rate?: number;
}

export class AdminVendorUpdateDto {
  @ApiPropertyOptional({ description: 'Commission rate (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commission_rate?: number;

  @ApiPropertyOptional({ enum: ['free', 'silver', 'gold', 'platinum'] })
  @IsOptional()
  @IsString()
  subscription_tier?: string;

  @ApiPropertyOptional({ description: 'Feature the store on homepage' })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;
}
