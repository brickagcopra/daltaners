import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleOnlineDto {
  @ApiProperty({ description: 'Set rider online (true) or offline (false)', example: true })
  @IsBoolean()
  is_online: boolean;
}
