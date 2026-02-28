import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BroadcastDto {
  @ApiProperty({ description: 'Broadcast notification title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Broadcast notification body content' })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiProperty({ description: 'Notification channel', enum: ['push', 'sms', 'email'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['push', 'sms', 'email'])
  channel: 'push' | 'sms' | 'email';

  @ApiPropertyOptional({
    description: 'Target user role to filter broadcast recipients',
    enum: ['customer', 'vendor_owner', 'vendor_staff', 'delivery', 'admin'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['customer', 'vendor_owner', 'vendor_staff', 'delivery', 'admin'])
  target_role?: string;
}
