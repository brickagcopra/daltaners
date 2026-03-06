import { IsOptional, IsEmail, IsString, Matches, IsIn, IsBoolean } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+63\d{10}$/, { message: 'Phone must be in +63XXXXXXXXXX format' })
  phone?: string;

  @IsOptional()
  @IsIn(['customer', 'vendor_owner', 'vendor_staff', 'delivery', 'admin'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
