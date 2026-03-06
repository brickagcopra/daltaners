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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VendorService } from './vendor.service';
import { AdminVendorQueryDto, AdminVendorActionDto, AdminVendorUpdateDto } from './dto/admin-vendor-query.dto';

@ApiTags('Admin - Vendors')
@ApiBearerAuth()
@Controller('vendors/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminVendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get('stores')
  @ApiOperation({ summary: 'List all vendor stores with filters (admin)' })
  async listStores(@Query() query: AdminVendorQueryDto) {
    return this.vendorService.adminListStores(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get vendor statistics (admin)' })
  async getStats() {
    return this.vendorService.adminGetStats();
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Get vendor store detail (admin)' })
  @ApiParam({ name: 'id', type: String, description: 'Store UUID' })
  async getStore(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorService.adminGetStore(id);
  }

  @Post('stores/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending vendor store (admin)' })
  @ApiParam({ name: 'id', type: String, description: 'Store UUID' })
  async approveStore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminVendorActionDto,
  ) {
    return this.vendorService.adminApproveStore(id, dto);
  }

  @Post('stores/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a vendor store (admin)' })
  @ApiParam({ name: 'id', type: String, description: 'Store UUID' })
  async suspendStore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminVendorActionDto,
  ) {
    return this.vendorService.adminSuspendStore(id, dto);
  }

  @Post('stores/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended vendor store (admin)' })
  @ApiParam({ name: 'id', type: String, description: 'Store UUID' })
  async reactivateStore(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorService.adminReactivateStore(id);
  }

  @Patch('stores/:id')
  @ApiOperation({ summary: 'Update vendor store admin fields (commission, tier, featured)' })
  @ApiParam({ name: 'id', type: String, description: 'Store UUID' })
  async updateStore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminVendorUpdateDto,
  ) {
    return this.vendorService.adminUpdateStore(id, dto);
  }
}
