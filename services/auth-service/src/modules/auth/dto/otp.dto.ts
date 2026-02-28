import { IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OtpRequestDto {
  @ApiProperty({ example: '+639171234567' })
  @IsString()
  @Matches(/^\+63\d{10}$/, { message: 'Phone must be a valid Philippine number' })
  phone: string;
}

export class OtpVerifyDto {
  @ApiProperty({ example: '+639171234567' })
  @IsString()
  @Matches(/^\+63\d{10}$/, { message: 'Phone must be a valid Philippine number' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
