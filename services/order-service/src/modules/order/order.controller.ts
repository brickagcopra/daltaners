import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Roles('customer')
  @RequirePermissions('order:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createOrder(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(userId, dto);
  }

  @Get()
  @Roles('admin')
  @RequirePermissions('order:read')
  @ApiOperation({ summary: 'List all orders with filters (admin)' })
  @ApiResponse({ status: 200, description: 'List of orders with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getOrders(@Query() query: OrderQueryDto) {
    return this.orderService.getOrders(query);
  }

  @Get('my')
  @Roles('customer')
  @RequirePermissions('order:read')
  @ApiOperation({ summary: 'List own orders (customer)' })
  @ApiResponse({ status: 200, description: 'List of customer orders with cursor pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of orders to return' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'Cursor for pagination' })
  async getMyOrders(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.orderService.getCustomerOrders(userId, limit || 20, cursor);
  }

  @Get('vendor/:storeId')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('order:read')
  @ApiOperation({ summary: 'List orders for a vendor store' })
  @ApiResponse({ status: 200, description: 'List of vendor orders with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'storeId', type: String, description: 'Store UUID' })
  async getVendorOrders(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: OrderQueryDto,
    @CurrentUser('vendorId') vendorId: string,
  ) {
    return this.orderService.getVendorOrders(storeId, query, vendorId);
  }

  @Get(':id')
  @Roles('customer', 'vendor_owner', 'vendor_staff', 'delivery', 'admin')
  @RequirePermissions('order:read')
  @ApiOperation({ summary: 'Get order details by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  async getOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.orderService.getOrder(id, userId, userRole);
  }

  @Post(':id/cancel')
  @Roles('customer', 'vendor_owner', 'admin')
  @RequirePermissions('order:cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled in current status' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
    @Body('cancellation_reason') cancellationReason?: string,
  ) {
    return this.orderService.cancelOrder(id, userId, userRole, cancellationReason);
  }

  @Patch(':id/status')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('order:update')
  @ApiOperation({ summary: 'Update order status (vendor/admin)' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.orderService.updateStatus(id, dto, userId, userRole);
  }
}
