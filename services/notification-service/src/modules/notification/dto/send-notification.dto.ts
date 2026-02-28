import { IsNotEmpty, IsString, IsUUID, IsIn, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({ description: 'Target user UUID' })
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @ApiProperty({ description: 'Notification channel', enum: ['push', 'sms', 'email'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['push', 'sms', 'email'])
  channel: 'push' | 'sms' | 'email';

  @ApiProperty({ description: 'Notification title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification body content' })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
