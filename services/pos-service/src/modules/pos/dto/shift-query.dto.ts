import { IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ShiftQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: ['open', 'closed', 'suspended'] })
  @IsOptional()
  @IsIn(['open', 'closed', 'suspended'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter shifts opened from this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter shifts opened until this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}
