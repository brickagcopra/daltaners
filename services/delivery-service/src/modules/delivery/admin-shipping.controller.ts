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
import { ShippingService } from './shipping.service';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { UpdateCarrierDto } from './dto/update-carrier.dto';
import { CarrierQueryDto } from './dto/carrier-query.dto';
import { CreateCarrierServiceDto, UpdateCarrierServiceDto } from './dto/create-carrier-service.dto';
import { AdminShipmentQueryDto } from './dto/shipment-query.dto';

@ApiTags('Admin Shipping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Controller('admin/shipping')
export class AdminShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // --- Carrier Management ---

  @Post('carriers')
  @ApiOperation({ summary: 'Create a new shipping carrier' })
  @ApiResponse({ status: 201, description: 'Carrier created' })
  async createCarrier(@Body() dto: CreateCarrierDto) {
    const carrier = await this.shippingService.createCarrier(dto);
    return {
      success: true,
      data: carrier,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('carriers')
  @ApiOperation({ summary: 'List all carriers (with search/filter)' })
  @ApiResponse({ status: 200, description: 'Paginated list of carriers' })
  async listCarriers(@Query() query: CarrierQueryDto) {
    const { items, total } = await this.shippingService.listCarriers(query);
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

  @Get('carriers/:id')
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

  @Patch('carriers/:id')
  @ApiOperation({ summary: 'Update carrier' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiResponse({ status: 200, description: 'Carrier updated' })
  async updateCarrier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarrierDto,
  ) {
    const carrier = await this.shippingService.updateCarrier(id, dto);
    return {
      success: true,
      data: carrier,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('carriers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete carrier' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiResponse({ status: 204, description: 'Carrier deleted' })
  async deleteCarrier(@Param('id', ParseUUIDPipe) id: string) {
    await this.shippingService.deleteCarrier(id);
  }

  // --- Carrier Service Management ---

  @Post('services')
  @ApiOperation({ summary: 'Create a carrier service' })
  @ApiResponse({ status: 201, description: 'Carrier service created' })
  async createCarrierService(@Body() dto: CreateCarrierServiceDto) {
    const service = await this.shippingService.createCarrierService(dto);
    return {
      success: true,
      data: service,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('carriers/:id/services')
  @ApiOperation({ summary: 'List services for a carrier' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiResponse({ status: 200, description: 'List of carrier services' })
  async listCarrierServices(@Param('id', ParseUUIDPipe) id: string) {
    const services = await this.shippingService.listCarrierServices(id);
    return {
      success: true,
      data: services,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Get carrier service details' })
  @ApiParam({ name: 'id', description: 'Carrier Service ID' })
  @ApiResponse({ status: 200, description: 'Carrier service details' })
  async getCarrierService(@Param('id', ParseUUIDPipe) id: string) {
    const service = await this.shippingService.getCarrierService(id);
    return {
      success: true,
      data: service,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('services/:id')
  @ApiOperation({ summary: 'Update carrier service' })
  @ApiParam({ name: 'id', description: 'Carrier Service ID' })
  @ApiResponse({ status: 200, description: 'Carrier service updated' })
  async updateCarrierService(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarrierServiceDto,
  ) {
    const service = await this.shippingService.updateCarrierService(id, dto);
    return {
      success: true,
      data: service,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('services/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete carrier service' })
  @ApiParam({ name: 'id', description: 'Carrier Service ID' })
  @ApiResponse({ status: 204, description: 'Carrier service deleted' })
  async deleteCarrierService(@Param('id', ParseUUIDPipe) id: string) {
    await this.shippingService.deleteCarrierService(id);
  }

  // --- Shipment Management ---

  @Get('shipments')
  @ApiOperation({ summary: 'List all shipments (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated list of shipments' })
  async listShipments(@Query() query: AdminShipmentQueryDto) {
    const { items, total } = await this.shippingService.listShipments(query);
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

  @Get('shipments/stats')
  @ApiOperation({ summary: 'Get platform-wide shipment stats' })
  @ApiResponse({ status: 200, description: 'Shipment statistics' })
  async getShipmentStats(@Query('store_id') storeId?: string) {
    const stats = await this.shippingService.getShipmentStats(storeId);
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('shipments/:id')
  @ApiOperation({ summary: 'Get shipment details (admin)' })
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

  @Patch('shipments/:id/status')
  @ApiOperation({ summary: 'Force update shipment status (admin override)' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment status updated' })
  async updateShipmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { status: string; notes?: string },
  ) {
    const shipment = await this.shippingService.updateShipmentStatus(id, dto);
    return {
      success: true,
      data: shipment,
      timestamp: new Date().toISOString(),
    };
  }

  // --- Webhook ---

  @Post('webhook/:carrierCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle carrier webhook callback' })
  @ApiParam({ name: 'carrierCode', description: 'Carrier code (e.g., jnt, lbc)' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Param('carrierCode') carrierCode: string,
    @Body() payload: Record<string, unknown>,
  ) {
    await this.shippingService.handleCarrierWebhook(carrierCode, payload);
    return {
      success: true,
      data: { message: 'Webhook received' },
      timestamp: new Date().toISOString(),
    };
  }
}
