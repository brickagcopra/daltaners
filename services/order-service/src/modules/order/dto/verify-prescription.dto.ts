import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyPrescriptionDto {
  @ApiProperty({ enum: ['verified', 'rejected'], description: 'Verification action' })
  @IsEnum(['verified', 'rejected'])
  status: 'verified' | 'rejected';

  @ApiPropertyOptional({ description: 'Notes from the pharmacist/verifier' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  verification_notes?: string;
}
