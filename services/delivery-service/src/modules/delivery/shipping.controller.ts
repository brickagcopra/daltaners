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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShippingService } from './shipping.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ShipmentQueryDto } from './dto/shipment-query.dto';
import { ShippingRateRequestDto } from './dto/shipping-rate.dto';

@ApiTags('Shipping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // --- Carrier Listing (for vendors) ---

  @Get('carriers')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @ApiOperation({ summary: 'List active shipping carriers' })
  @ApiResponse({ status: 200, description: 'List of active carriers' })
  async getActiveCarriers() {
    const carriers = await this.shippingService.getActiveCarriers();
    return {
      success: true,
      data: carriers,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('carriers/:id')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @ApiOperation({ summary: 'Get carrier details' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiResponse({ status: 200, description: 'Carrier details' })
  async getCarrier(@Param('id', ParseUUIDPipe) id: string) {
    const carrier = await this.shippingService.getCarrier(id);
    return {
      success: true,
      data: carrier,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('carriers/:id/services')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @ApiOperation({ summary: 'List carrier services' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiResponse({ status: 200, description: 'List of carrier services' })
  async getCarrierServices(@Param('id', ParseUUIDPipe) id: string) {
    const services = await this.shippingService.listCarrierServices(id);
    return {
      success: true,
      data: services,
      timestamp: new Date().toISOString(),
    };
  }

  // --- Shipping Rates ---

  @Post('rates')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get shipping rates from all carriers' })
  @ApiResponse({ status: 200, description: 'Shipping rates from available carriers' })
  async getShippingRates(@Body() dto: ShippingRateRequestDto) {
    const rates = await this.shippingService.getShippingRates(dto);
    return {
      success: true,
      data: rates,
      timestamp: new Date().toISOString(),
    };
  }

  // --- Shipment CRUD ---

  @Post('shipments')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @ApiOperation({ summary: 'Create a new shipment' })
  @ApiResponse({ status: 201, description: 'Shipment created' })
  async createShipment(@Body() dto: CreateShipmentDto) {
    const shipment = await this.shippingService.createShipment(dto);
    return {
      success: true,
      data: shipment,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('shipments')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @ApiOperation({ summary: 'List shipments (vendor-scoped)' })
  @ApiResponse({ status: 200, description: 'Paginated list of shipments' })
  async listShipments(
    @Query() query: ShipmentQueryDto,
    @CurrentUser() user: { sub: string; vendor_id?: string },
  ) {
    // Vendors only see their own shipments
    const storeFilter = user.vendor_id
      ? { ...query, store_id: query.store_id || user.vendor_id }
      : query;

    const { items, total } = await this.shippingService.listShipments(storeFilter);
    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('shipments/:id')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @ApiOperation({ summary: 'Get shipment details' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment details' })
  async getShipment(@Param('id', ParseUUIDPipe) id: string) {
    const shipment = await this.shippingService.getShipment(id);
    return {
      success: true,
      data: shipment,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('shipments/order/:orderId')
  @Roles('vendor_owner', 'vendor_staff', 'admin', 'customer')
  @ApiOperation({ summary: 'Get shipment by order ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Shipment for this order' })
  async getShipmentByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    const shipment = await this.shippingService.getShipmentByOrder(orderId);
    return {
      success: true,
      data: shipment,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('shipments/:id/book')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Book a pending shipment with the carrier' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment booked with carrier' })
  async bookShipment(@Param('id', ParseUUIDPipe) id: string) {
    const shipment = await this.shippingService.bookShipment(id);
    return {
      success: true,
      data: shipment,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('shipments/:id/label')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate shipping label' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Label generated' })
  async generateLabel(@Param('id', ParseUUIDPipe) id: string) {
    const shipment = await this.shippingService.generateLabel(id);
    return {
      success: true,
      data: shipment,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('shipments/:id/status')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @ApiOperation({ summary: 'Update shipment status' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment status updated' })
  async updateShipmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    const shipment = await this.shippingService.updateShipmentStatus(id, dto);
    return {
      success: true,
      data: shipment,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('shipments/:id/cancel')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment cancelled' })
  async cancelShipment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    const shipment = await this.shippingService.cancelShipment(id, body.reason);
    return {
      success: true,
      data: shipment,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('shipments/:id/track')
  @Roles('vendor_owner', 'vendor_staff', 'admin', 'customer')
  @ApiOperation({ summary: 'Track a shipment via carrier API' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Tracking information from carrier' })
  async trackShipment(@Param('id', ParseUUIDPipe) id: string) {
    const tracking = await this.shippingService.trackShipment(id);
    return {
      success: true,
      data: tracking,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('shipments/stats/summary')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @ApiOperation({ summary: 'Get shipment statistics' })
  @ApiResponse({ status: 200, description: 'Shipment statistics' })
  async getShipmentStats(
    @CurrentUser() user: { sub: string; vendor_id?: string },
    @Query('store_id') storeId?: string,
  ) {
    const effectiveStoreId = storeId || user.vendor_id;
    const stats = await this.shippingService.getShipmentStats(effectiveStoreId);
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }
}
