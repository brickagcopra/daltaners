import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MessageQueryDto {
  @ApiPropertyOptional({ default: 50, description: 'Number of messages to return' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Cursor (message_id) for pagination — fetch messages before this ID' })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiPropertyOptional({ description: 'Cursor (message_id) for pagination — fetch messages after this ID' })
  @IsOptional()
  @IsString()
  after?: string;
}

export class ConversationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['order', 'support', 'direct'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ['active', 'closed', 'archived'] })
  @IsOptional()
  @IsString()
  status?: string;
}
