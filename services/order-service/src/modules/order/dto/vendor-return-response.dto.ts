import { IsEnum, IsOptional, IsString, IsNumber, IsBoolean, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VendorApproveReturnDto {
  @ApiPropertyOptional({ description: 'Vendor response message' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  vendor_response?: string;

  @ApiPropertyOptional({ description: 'Override refund amount (defaults to item total)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refund_amount?: number;
}

export class VendorDenyReturnDto {
  @ApiProperty({ description: 'Reason for denial' })
  @IsString()
  @MaxLength(2000)
  vendor_response: string;
}

export class VendorMarkReceivedDto {
  @ApiPropertyOptional({ description: 'Notes about received items' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  vendor_response?: string;

  @ApiPropertyOptional({ description: 'Whether items can be restocked' })
  @IsOptional()
  @IsBoolean()
  restockable?: boolean;
}

export class AdminReturnActionDto {
  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  admin_notes?: string;

  @ApiPropertyOptional({ description: 'Override refund amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refund_amount?: number;
}
