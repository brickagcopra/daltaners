import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { Roles } from '../../common/decorators';

@ApiTags('POS Reports')
@ApiBearerAuth()
@Controller('pos/reports')
@Roles('vendor_owner', 'vendor_staff', 'admin')
export class ReportController {
  constructor(private readonly posService: PosService) {}

  @Get('store/:storeId/sales-summary')
  @ApiOperation({ summary: 'Get sales summary for a store within a date range' })
  async salesSummary(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: ReportQueryDto,
  ) {
    const data = await this.posService.getSalesSummary(storeId, query.date_from, query.date_to);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('store/:storeId/product-sales')
  @ApiOperation({ summary: 'Get top product sales for a store' })
  async productSales(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: ReportQueryDto,
  ) {
    const data = await this.posService.getProductSales(
      storeId, query.date_from, query.date_to, query.top_limit,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('store/:storeId/hourly-sales')
  @ApiOperation({ summary: 'Get hourly sales breakdown for a store' })
  async hourlySales(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: ReportQueryDto,
  ) {
    const data = await this.posService.getHourlySales(storeId, query.date_from, query.date_to);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('store/:storeId/cashier-performance')
  @ApiOperation({ summary: 'Get cashier performance report for a store' })
  async cashierPerformance(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: ReportQueryDto,
  ) {
    const data = await this.posService.getCashierPerformance(storeId, query.date_from, query.date_to);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('store/:storeId/payment-breakdown')
  @ApiOperation({ summary: 'Get payment method breakdown for a store' })
  async paymentBreakdown(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: ReportQueryDto,
  ) {
    const data = await this.posService.getPaymentBreakdown(storeId, query.date_from, query.date_to);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('shift/:shiftId/summary')
  @ApiOperation({ summary: 'Get shift transaction summary (X-report)' })
  async shiftSummary(@Param('shiftId', ParseUUIDPipe) shiftId: string) {
    const data = await this.posService.getShiftSummary(shiftId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
