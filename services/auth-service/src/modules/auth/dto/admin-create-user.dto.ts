import { IsEmail, IsOptional, IsString, MinLength, MaxLength, Matches, IsIn } from 'class-validator';

export class AdminCreateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+63\d{10}$/, { message: 'Phone must be in +63XXXXXXXXXX format' })
  phone?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name: string;

  @IsIn(['customer', 'vendor_owner', 'vendor_staff', 'delivery', 'admin'])
  role: string;
}
