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
import { OrderService } from './order.service';
import { AdminOrderQueryDto, AdminOrderStatsQueryDto } from './dto/admin-order-query.dto';

@ApiTags('Admin - Orders')
@ApiBearerAuth()
@Controller('orders/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('orders')
  @ApiOperation({ summary: 'List all orders with admin filters (admin)' })
  async listOrders(@Query() query: AdminOrderQueryDto) {
    return this.orderService.adminListOrders(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get order statistics for dashboard (admin)' })
  async getStats(@Query() query: AdminOrderStatsQueryDto) {
    return this.orderService.adminGetStats(query);
  }
}
