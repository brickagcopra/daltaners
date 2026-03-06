import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PerformanceService } from './performance.service';
import { VendorService } from './vendor.service';
import { PerformanceHistoryQueryDto } from './dto/performance-query.dto';

@ApiTags('Vendor Performance')
@ApiBearerAuth()
@Controller('vendors/performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendor_owner', 'vendor_staff')
export class PerformanceController {
  constructor(
    private readonly performanceService: PerformanceService,
    private readonly vendorService: VendorService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my store performance metrics' })
  async getMyPerformance(
    @CurrentUser() user: { sub: string },
  ) {
    const store = await this.vendorService.findMyStore(user.sub);
    return this.performanceService.getMyPerformance(store.id);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get my store performance history (trend data)' })
  async getMyPerformanceHistory(
    @CurrentUser() user: { sub: string },
    @Query() query: PerformanceHistoryQueryDto,
  ) {
    const store = await this.vendorService.findMyStore(user.sub);
    return this.performanceService.getMyPerformanceHistory(store.id, query);
  }

  @Get('me/benchmarks')
  @ApiOperation({ summary: 'Get platform-wide performance benchmarks for comparison' })
  async getBenchmarks() {
    return this.performanceService.getPlatformBenchmarks();
  }
}
