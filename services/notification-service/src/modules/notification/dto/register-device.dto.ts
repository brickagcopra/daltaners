import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'FCM device token', example: 'dABC123...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token!: string;

  @ApiProperty({
    description: 'Unique device identifier',
    example: 'device-uuid-or-fingerprint',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  device_id!: string;
}
