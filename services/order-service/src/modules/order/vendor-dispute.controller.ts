import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DisputeService } from './dispute.service';
import { DisputeQueryDto } from './dto/dispute-query.dto';
import { VendorRespondDisputeDto } from './dto/dispute-action.dto';

@ApiTags('Vendor Disputes')
@ApiBearerAuth()
@Controller('vendor/disputes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class VendorDisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Get()
  @Roles('vendor_owner', 'vendor_staff')
  @RequirePermissions('dispute:read')
  @ApiOperation({ summary: 'List disputes for vendor store' })
  @ApiResponse({ status: 200, description: 'List of store disputes' })
  async getStoreDisputes(
    @CurrentUser('vendorId') storeId: string,
    @Query() query: DisputeQueryDto,
  ) {
    return this.disputeService.getVendorDisputes(storeId, query);
  }

  @Get(':id')
  @Roles('vendor_owner', 'vendor_staff')
  @RequirePermissions('dispute:read')
  @ApiOperation({ summary: 'Get dispute details (vendor)' })
  @ApiResponse({ status: 200, description: 'Dispute details' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async getDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    const result = await this.disputeService.getDisputeById(id, userId, userRole);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/messages')
  @Roles('vendor_owner', 'vendor_staff')
  @RequirePermissions('dispute:read')
  @ApiOperation({ summary: 'Get dispute messages (vendor)' })
  @ApiResponse({ status: 200, description: 'Dispute messages' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    const result = await this.disputeService.getDisputeMessages(id, userId, userRole);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/respond')
  @Roles('vendor_owner', 'vendor_staff')
  @RequirePermissions('dispute:manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to a dispute (vendor)' })
  @ApiResponse({ status: 200, description: 'Response added' })
  @ApiResponse({ status: 400, description: 'Cannot respond to resolved/closed dispute' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async respondToDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendorId') storeId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: VendorRespondDisputeDto,
  ) {
    const result = await this.disputeService.vendorRespond(id, storeId, userId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
