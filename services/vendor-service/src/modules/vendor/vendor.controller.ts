import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateStoreLocationDto } from './dto/create-store-location.dto';
import { UpdateStoreLocationDto } from './dto/update-store-location.dto';
import { SetOperatingHoursDto } from './dto/set-operating-hours.dto';
import { CreateStoreStaffDto } from './dto/create-store-staff.dto';
import { UpdateStoreStaffDto } from './dto/update-store-staff.dto';
import { NearbyStoresDto } from './dto/nearby-stores.dto';

@ApiTags('Vendors')
@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  // ─── Store Endpoints ──────────────────────────────────────────────────────────

  @Post('stores')
  @Roles('vendor_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new store' })
  @ApiResponse({ status: 201, description: 'Store created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a vendor owner' })
  async createStore(
    @CurrentUser('id') ownerId: string,
    @Body() dto: CreateStoreDto,
  ) {
    return this.vendorService.createStore(ownerId, dto);
  }

  @Get('stores/me')
  @Roles('vendor_owner', 'vendor_staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the store associated with the current user' })
  @ApiResponse({ status: 200, description: 'Store details for current vendor user' })
  @ApiResponse({ status: 404, description: 'No store associated with this account' })
  async getMyStore(@CurrentUser('id') userId: string) {
    return this.vendorService.findMyStore(userId);
  }

  @Get('stores')
  @Roles('vendor_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own stores' })
  @ApiResponse({ status: 200, description: 'List of stores owned by the authenticated user' })
  async listOwnStores(@CurrentUser('id') ownerId: string) {
    return this.vendorService.findStoresByOwner(ownerId);
  }

  @Get('stores/nearby')
  @Public()
  @ApiOperation({ summary: 'Find nearby stores by coordinates' })
  @ApiResponse({ status: 200, description: 'List of nearby stores with distance' })
  @ApiQuery({ name: 'latitude', required: true, type: Number })
  @ApiQuery({ name: 'longitude', required: true, type: Number })
  @ApiQuery({ name: 'radius_km', required: false, type: Number })
  async findNearbyStores(@Query() query: NearbyStoresDto) {
    return this.vendorService.findNearbyStores(
      query.latitude,
      query.longitude,
      query.radius_km ?? 5,
    );
  }

  @Get('stores/:idOrSlug')
  @Public()
  @ApiOperation({ summary: 'Get store details by ID or slug' })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'Store UUID or slug' })
  @ApiResponse({ status: 200, description: 'Store details' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getStore(@Param('idOrSlug') idOrSlug: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(idOrSlug)) {
      return this.vendorService.findStoreById(idOrSlug);
    }
    return this.vendorService.findStoreBySlug(idOrSlug);
  }

  @Patch('stores/:id')
  @Roles('vendor_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a store' })
  @ApiParam({ name: 'id', type: String, description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'Store updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the store owner' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async updateStore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.vendorService.updateStore(id, ownerId, dto);
  }

  // ─── Location Endpoints ───────────────────────────────────────────────────────

  @Post('stores/:storeId/locations')
  @Roles('vendor_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a store location' })
  @ApiParam({ name: 'storeId', type: String, description: 'Store UUID' })
  @ApiResponse({ status: 201, description: 'Location created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the store owner' })
  async createLocation(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: CreateStoreLocationDto,
  ) {
    return this.vendorService.createLocation(storeId, ownerId, dto);
  }

  @Get('stores/:storeId/locations')
  @Public()
  @ApiOperation({ summary: 'List store locations' })
  @ApiParam({ name: 'storeId', type: String, description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'List of store locations' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async listLocations(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.vendorService.findLocationsByStoreId(storeId);
  }

  @Patch('locations/:id')
  @Roles('vendor_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a store location' })
  @ApiParam({ name: 'id', type: String, description: 'Location UUID' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the store owner' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: UpdateStoreLocationDto,
  ) {
    return this.vendorService.updateLocation(id, ownerId, dto);
  }

  // ─── Operating Hours Endpoints ────────────────────────────────────────────────

  @Put('locations/:locationId/hours')
  @Roles('vendor_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set operating hours for a location (bulk upsert)' })
  @ApiParam({ name: 'locationId', type: String, description: 'Location UUID' })
  @ApiResponse({ status: 200, description: 'Operating hours set successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the store owner' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async setOperatingHours(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: SetOperatingHoursDto,
  ) {
    return this.vendorService.setOperatingHours(locationId, ownerId, dto);
  }

  @Get('locations/:locationId/hours')
  @Public()
  @ApiOperation({ summary: 'Get operating hours for a location' })
  @ApiParam({ name: 'locationId', type: String, description: 'Location UUID' })
  @ApiResponse({ status: 200, description: 'List of operating hours' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async getOperatingHours(@Param('locationId', ParseUUIDPipe) locationId: string) {
    return this.vendorService.getOperatingHours(locationId);
  }

  // ─── Staff Endpoints ──────────────────────────────────────────────────────────

  @Post('stores/:storeId/staff')
  @Roles('vendor_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a staff member to a store' })
  @ApiParam({ name: 'storeId', type: String, description: 'Store UUID' })
  @ApiResponse({ status: 201, description: 'Staff member added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the store owner' })
  @ApiResponse({ status: 409, description: 'User is already a staff member' })
  async addStaff(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: CreateStoreStaffDto,
  ) {
    return this.vendorService.addStaff(storeId, ownerId, dto);
  }

  @Get('stores/:storeId/staff')
  @Roles('vendor_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List staff members for a store' })
  @ApiParam({ name: 'storeId', type: String, description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'List of staff members' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the store owner' })
  async listStaff(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser('id') ownerId: string,
  ) {
    return this.vendorService.findStaffByStoreId(storeId, ownerId);
  }

  @Patch('staff/:id')
  @Roles('vendor_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a staff member' })
  @ApiParam({ name: 'id', type: String, description: 'Staff UUID' })
  @ApiResponse({ status: 200, description: 'Staff member updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the store owner' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async updateStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: UpdateStoreStaffDto,
  ) {
    return this.vendorService.updateStaff(id, ownerId, dto);
  }

  @Delete('staff/:id')
  @Roles('vendor_owner')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a staff member' })
  @ApiParam({ name: 'id', type: String, description: 'Staff UUID' })
  @ApiResponse({ status: 204, description: 'Staff member removed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the store owner' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async removeStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') ownerId: string,
  ) {
    return this.vendorService.removeStaff(id, ownerId);
  }
}
