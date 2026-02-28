import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Enable or disable push notifications' })
  @IsOptional()
  @IsBoolean()
  push_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable or disable email notifications' })
  @IsOptional()
  @IsBoolean()
  email_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable or disable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  sms_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Receive order update notifications' })
  @IsOptional()
  @IsBoolean()
  order_updates?: boolean;

  @ApiPropertyOptional({ description: 'Receive promotional notifications' })
  @IsOptional()
  @IsBoolean()
  promotions?: boolean;

  @ApiPropertyOptional({ description: 'Receive delivery update notifications' })
  @IsOptional()
  @IsBoolean()
  delivery_updates?: boolean;
}
