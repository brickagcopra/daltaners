import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
import { ZoneService } from './zone.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneLookupDto } from './dto/zone-lookup.dto';
import { DeliveryFeeDto } from './dto/delivery-fee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Zones')
@Controller('zones')
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new delivery zone (admin only)' })
  @ApiResponse({ status: 201, description: 'Zone created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  async createZone(@Body() dto: CreateZoneDto) {
    return this.zoneService.createZone(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all active delivery zones' })
  @ApiResponse({ status: 200, description: 'List of active zones' })
  async findAllZones() {
    return this.zoneService.findAllZones();
  }

  @Get('lookup')
  @Public()
  @ApiOperation({ summary: 'Look up which zone a coordinate falls in' })
  @ApiResponse({ status: 200, description: 'Zone found for the given coordinates' })
  @ApiResponse({ status: 404, description: 'No active zone found for coordinates' })
  async lookupZone(@Query() dto: ZoneLookupDto) {
    return this.zoneService.lookupZone(dto.latitude, dto.longitude);
  }

  @Get('delivery-fee')
  @Public()
  @ApiOperation({ summary: 'Calculate delivery fee between two points' })
  @ApiResponse({ status: 200, description: 'Delivery fee calculated' })
  @ApiResponse({ status: 400, description: 'Distance exceeds maximum radius' })
  @ApiResponse({ status: 404, description: 'No active zone found for destination' })
  async calculateDeliveryFee(@Query() dto: DeliveryFeeDto) {
    return this.zoneService.calculateDeliveryFee(
      dto.origin_lat,
      dto.origin_lng,
      dto.destination_lat,
      dto.destination_lng,
    );
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get zone details by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Zone details' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  async findZoneById(@Param('id', ParseUUIDPipe) id: string) {
    return this.zoneService.findZoneById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a delivery zone (admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Zone updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  async updateZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.zoneService.updateZone(id, dto);
  }
}
