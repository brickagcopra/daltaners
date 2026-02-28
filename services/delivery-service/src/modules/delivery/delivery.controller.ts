import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeliveryService } from './delivery.service';
import { RegisterRiderDto } from './dto/register-rider.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { NearbyRidersDto } from './dto/nearby-riders.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { ToggleOnlineDto } from './dto/toggle-online.dto';
import { ReassignDeliveryDto } from './dto/reassign-delivery.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  // --- Rider Endpoints ---

  @Post('riders')
  @Roles('delivery', 'admin')
  @ApiOperation({ summary: 'Register a new delivery rider' })
  @ApiResponse({ status: 201, description: 'Rider registered successfully' })
  @ApiResponse({ status: 409, description: 'Rider already registered' })
  async registerRider(@Body() dto: RegisterRiderDto) {
    return this.deliveryService.registerRider(dto);
  }

  @Patch('riders/online')
  @Roles('delivery')
  @ApiOperation({ summary: 'Toggle rider online/offline status' })
  @ApiResponse({ status: 200, description: 'Online status updated' })
  async toggleOnline(
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleOnlineDto,
  ) {
    return this.deliveryService.toggleOnline(userId, dto.is_online);
  }

  @Post('riders/location')
  @Roles('delivery')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update rider GPS location' })
  @ApiResponse({ status: 204, description: 'Location updated' })
  async updateLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    await this.deliveryService.updateGpsLocation(userId, dto);
  }

  @Get('riders/nearby')
  @Roles('admin', 'vendor_owner', 'vendor_staff')
  @ApiOperation({ summary: 'Find nearby available riders' })
  @ApiResponse({ status: 200, description: 'List of nearby riders' })
  @ApiQuery({ name: 'latitude', type: Number, required: true })
  @ApiQuery({ name: 'longitude', type: Number, required: true })
  @ApiQuery({ name: 'radius_km', type: Number, required: false })
  async findNearbyRiders(@Query() dto: NearbyRidersDto) {
    return this.deliveryService.findNearbyRiders(
      dto.latitude,
      dto.longitude,
      dto.radius_km ?? 5,
    );
  }

  @Get('riders/me')
  @Roles('delivery')
  @ApiOperation({ summary: 'Get current rider profile' })
  @ApiResponse({ status: 200, description: 'Rider profile' })
  async getMyRiderProfile(@CurrentUser('id') userId: string) {
    return this.deliveryService.getRiderByUserId(userId);
  }

  // --- Delivery Endpoints ---

  @Post('deliveries')
  @Roles('admin', 'vendor_owner', 'vendor_staff')
  @ApiOperation({ summary: 'Create a delivery assignment' })
  @ApiResponse({ status: 201, description: 'Delivery created' })
  @ApiResponse({ status: 409, description: 'Delivery already exists for this order' })
  async createDelivery(@Body() dto: CreateDeliveryDto) {
    return this.deliveryService.createDelivery(dto);
  }

  @Get('deliveries/:id')
  @ApiOperation({ summary: 'Get delivery details by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Delivery details' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async getDeliveryById(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveryService.getDeliveryById(id);
  }

  @Get('deliveries/order/:orderId')
  @ApiOperation({ summary: 'Get delivery by order ID' })
  @ApiParam({ name: 'orderId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Delivery details for the order' })
  @ApiResponse({ status: 404, description: 'Delivery not found for this order' })
  async getDeliveryByOrderId(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.deliveryService.getDeliveryByOrderId(orderId);
  }

  @Patch('deliveries/:id/status')
  @Roles('delivery', 'admin')
  @ApiOperation({ summary: 'Update delivery status' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Delivery status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateDeliveryStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.deliveryService.updateDeliveryStatus(id, dto);
  }

  @Post('deliveries/:id/accept')
  @Roles('delivery')
  @ApiOperation({ summary: 'Accept a delivery assignment' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Delivery accepted' })
  @ApiResponse({ status: 400, description: 'Cannot accept delivery' })
  async acceptDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.deliveryService.acceptDelivery(id, userId);
  }

  @Post('deliveries/:id/reject')
  @Roles('delivery')
  @ApiOperation({ summary: 'Reject a delivery assignment' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Delivery rejected' })
  @ApiResponse({ status: 400, description: 'Cannot reject delivery' })
  async rejectDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.deliveryService.rejectDelivery(id, userId);
  }

  @Get('my')
  @Roles('delivery')
  @ApiOperation({ summary: 'Get my deliveries as a rider' })
  @ApiResponse({ status: 200, description: 'List of rider deliveries' })
  async getMyDeliveries(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const { items, total, page, limit } = await this.deliveryService.getMyDeliveries(
      userId,
      pagination.page,
      pagination.limit,
    );
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // --- Admin Delivery Management ---

  @Post('deliveries/:id/reassign')
  @Roles('admin')
  @ApiOperation({ summary: 'Reassign delivery to a different rider (admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Delivery reassigned' })
  @ApiResponse({ status: 400, description: 'Cannot reassign delivery' })
  async reassignDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReassignDeliveryDto,
  ) {
    return this.deliveryService.reassignDelivery(id, dto.personnel_id, dto.reason);
  }

  @Post('deliveries/:id/auto-assign')
  @Roles('admin')
  @ApiOperation({ summary: 'Trigger automatic rider re-assignment (admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Delivery auto-assigned to new rider' })
  @ApiResponse({ status: 400, description: 'No rider available' })
  async autoAssignDelivery(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveryService.autoAssignDelivery(id);
  }

  @Get('deliveries/active')
  @Roles('admin')
  @ApiOperation({ summary: 'List all active deliveries (admin only)' })
  @ApiResponse({ status: 200, description: 'List of active deliveries' })
  async getActiveDeliveries(@Query() pagination: PaginationQueryDto) {
    return this.deliveryService.getActiveDeliveries(
      pagination.page,
      pagination.limit,
    );
  }
}
