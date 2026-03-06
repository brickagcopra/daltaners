import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CouponService } from './coupon.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller('orders/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('validate')
  @Roles('customer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a coupon code at checkout' })
  @ApiResponse({ status: 200, description: 'Coupon validation result' })
  @ApiResponse({ status: 400, description: 'Coupon is invalid or cannot be applied' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validateCoupon(
    @CurrentUser('userId') userId: string,
    @Body() dto: ValidateCouponDto,
  ) {
    const result = await this.couponService.validateCoupon(dto, userId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
