import { IsEmail, IsOptional, IsString, MinLength, MaxLength, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+639171234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+63\d{10}$/, { message: 'Phone must be a valid Philippine number (+63XXXXXXXXXX)' })
  phone?: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name: string;

  @ApiProperty({ example: 'Dela Cruz' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name: string;

  @ApiPropertyOptional({ enum: ['customer', 'vendor_owner', 'delivery'], default: 'customer' })
  @IsOptional()
  @IsEnum(['customer', 'vendor_owner', 'delivery'])
  role?: string;
}
