import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateAppealDto {
  @ApiProperty({ description: 'Reason for appeal' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Supporting evidence URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence_urls?: string[];
}

export class AppealQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['pending', 'under_review', 'approved', 'denied', 'escalated'],
    description: 'Filter by appeal status',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class AdminAppealQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by appeal number, store name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by store UUID' })
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'under_review', 'approved', 'denied', 'escalated'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class ReviewAppealDto {
  @ApiProperty({ description: 'Admin notes on the appeal review' })
  @IsString()
  admin_notes: string;
}

export class DenyAppealDto {
  @ApiProperty({ description: 'Reason for denial' })
  @IsString()
  admin_notes: string;
}
