import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by notification channel', enum: ['push', 'sms', 'email'] })
  @IsOptional()
  @IsString()
  @IsIn(['push', 'sms', 'email'])
  channel?: string;

  @ApiPropertyOptional({ description: 'Filter by read status', enum: ['read', 'unread'] })
  @IsOptional()
  @IsString()
  @IsIn(['read', 'unread'])
  status?: string;
}
