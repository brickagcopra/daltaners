import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { VendorCouponQueryDto } from './dto/vendor-coupon-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Vendor Coupons')
@Controller('orders/vendor/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendor_owner', 'vendor_staff')
@ApiBearerAuth()
export class VendorCouponController {
  constructor(private readonly couponService: CouponService) {}

  private getStoreId(user: { vendor_id?: string | null }): string {
    if (!user.vendor_id) {
      throw new ForbiddenException('No store associated with this account');
    }
    return user.vendor_id;
  }

  @Get()
  @ApiOperation({ summary: 'List coupons for the vendor store' })
  async listVendorCoupons(
    @Query() query: VendorCouponQueryDto,
    @CurrentUser() user: { id: string; vendor_id: string | null },
  ) {
    const storeId = this.getStoreId(user);
    return this.couponService.listVendorCoupons(storeId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific vendor coupon' })
  async getVendorCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; vendor_id: string | null },
  ) {
    const storeId = this.getStoreId(user);
    const coupon = await this.couponService.getVendorCoupon(id, storeId);
    return {
      success: true,
      data: coupon,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a coupon for the vendor store' })
  async createVendorCoupon(
    @Body() dto: CreateCouponDto,
    @CurrentUser() user: { id: string; vendor_id: string | null },
  ) {
    const storeId = this.getStoreId(user);
    const coupon = await this.couponService.createVendorCoupon(dto, storeId, user.id);
    return {
      success: true,
      data: coupon,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vendor coupon' })
  async updateVendorCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() user: { id: string; vendor_id: string | null },
  ) {
    const storeId = this.getStoreId(user);
    const coupon = await this.couponService.updateVendorCoupon(id, dto, storeId);
    return {
      success: true,
      data: coupon,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vendor coupon' })
  async deleteVendorCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; vendor_id: string | null },
  ) {
    const storeId = this.getStoreId(user);
    await this.couponService.deleteVendorCoupon(id, storeId);
  }
}
