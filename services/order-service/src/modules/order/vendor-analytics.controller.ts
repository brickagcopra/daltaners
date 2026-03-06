import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrderService } from './order.service';
import { VendorAnalyticsQueryDto } from './dto/vendor-analytics-query.dto';

@ApiTags('Vendor - Analytics')
@ApiBearerAuth()
@Controller('orders/vendor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendor_owner', 'vendor_staff', 'admin')
export class VendorAnalyticsController {
  constructor(private readonly orderService: OrderService) {}

  @Get(':storeId/analytics')
  @ApiOperation({ summary: 'Get vendor store analytics (vendor/admin)' })
  @ApiParam({ name: 'storeId', description: 'Store UUID' })
  async getAnalytics(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: VendorAnalyticsQueryDto,
  ) {
    return this.orderService.getVendorAnalytics(storeId, query.date_from, query.date_to);
  }
}
