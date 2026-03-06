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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponQueryDto } from './dto/coupon-query.dto';

@ApiTags('Admin - Coupons')
@ApiBearerAuth()
@Controller('orders/admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminCouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  @ApiOperation({ summary: 'List all coupons with filters (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated list of coupons' })
  async listCoupons(@Query() query: CouponQueryDto) {
    return this.couponService.listCoupons(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon details by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Coupon details' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiParam({ name: 'id', type: String, description: 'Coupon UUID' })
  async getCoupon(@Param('id', ParseUUIDPipe) id: string) {
    const coupon = await this.couponService.getCouponById(id);
    return {
      success: true,
      data: coupon,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new coupon (admin)' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Coupon code already exists' })
  async createCoupon(
    @CurrentUser('userId') adminUserId: string,
    @Body() dto: CreateCouponDto,
  ) {
    const coupon = await this.couponService.createCoupon(dto, adminUserId);
    return {
      success: true,
      data: coupon,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon (admin)' })
  @ApiResponse({ status: 200, description: 'Coupon updated successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiParam({ name: 'id', type: String, description: 'Coupon UUID' })
  async updateCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    const coupon = await this.couponService.updateCoupon(id, dto);
    return {
      success: true,
      data: coupon,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a coupon (admin) — soft-deletes if has usages' })
  @ApiResponse({ status: 204, description: 'Coupon deleted successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiParam({ name: 'id', type: String, description: 'Coupon UUID' })
  async deleteCoupon(@Param('id', ParseUUIDPipe) id: string) {
    await this.couponService.deleteCoupon(id);
  }
}
