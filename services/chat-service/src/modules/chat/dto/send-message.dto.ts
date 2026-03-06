import { IsString, IsOptional, IsIn, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ enum: ['text', 'image', 'location', 'system'], default: 'text' })
  @IsIn(['text', 'image', 'location', 'system'])
  message_type: string;

  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  media_url?: string;
}
