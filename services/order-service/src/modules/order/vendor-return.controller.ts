import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReturnService } from './return.service';
import { ReturnRequestQueryDto } from './dto/return-request-query.dto';
import {
  VendorApproveReturnDto,
  VendorDenyReturnDto,
  VendorMarkReceivedDto,
} from './dto/vendor-return-response.dto';

@ApiTags('Vendor Returns')
@ApiBearerAuth()
@Controller('vendor/returns')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class VendorReturnController {
  constructor(private readonly returnService: ReturnService) {}

  @Get()
  @Roles('vendor_owner', 'vendor_staff')
  @RequirePermissions('return:read')
  @ApiOperation({ summary: 'List return requests for vendor store' })
  @ApiResponse({ status: 200, description: 'List of store return requests' })
  async getStoreReturns(
    @CurrentUser('vendorId') storeId: string,
    @Query() query: ReturnRequestQueryDto,
  ) {
    return this.returnService.getVendorReturns(storeId, query);
  }

  @Get(':id')
  @Roles('vendor_owner', 'vendor_staff')
  @RequirePermissions('return:read')
  @ApiOperation({ summary: 'Get return request details (vendor)' })
  @ApiResponse({ status: 200, description: 'Return request details' })
  @ApiResponse({ status: 404, description: 'Return request not found' })
  @ApiParam({ name: 'id', type: String, description: 'Return request UUID' })
  async getReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    const result = await this.returnService.getReturnById(id, userId, userRole);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/approve')
  @Roles('vendor_owner', 'vendor_staff')
  @RequirePermissions('return:manage')
  @ApiOperation({ summary: 'Approve a return request' })
  @ApiResponse({ status: 200, description: 'Return request approved' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiParam({ name: 'id', type: String, description: 'Return request UUID' })
  async approveReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendorId') storeId: string,
    @Body() dto: VendorApproveReturnDto,
  ) {
    const result = await this.returnService.approveReturn(id, storeId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/deny')
  @Roles('vendor_owner', 'vendor_staff')
  @RequirePermissions('return:manage')
  @ApiOperation({ summary: 'Deny a return request' })
  @ApiResponse({ status: 200, description: 'Return request denied' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiParam({ name: 'id', type: String, description: 'Return request UUID' })
  async denyReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendorId') storeId: string,
    @Body() dto: VendorDenyReturnDto,
  ) {
    const result = await this.returnService.denyReturn(id, storeId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/received')
  @Roles('vendor_owner', 'vendor_staff')
  @RequirePermissions('return:manage')
  @ApiOperation({ summary: 'Mark return items as received' })
  @ApiResponse({ status: 200, description: 'Items marked as received' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiParam({ name: 'id', type: String, description: 'Return request UUID' })
  async markReceived(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendorId') storeId: string,
    @Body() dto: VendorMarkReceivedDto,
  ) {
    const result = await this.returnService.markReceived(id, storeId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
