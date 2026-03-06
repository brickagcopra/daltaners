import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCouponDto } from './create-coupon.dto';

export class UpdateCouponDto extends PartialType(CreateCouponDto) {
  @ApiPropertyOptional({ description: 'Enable or disable the coupon' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
