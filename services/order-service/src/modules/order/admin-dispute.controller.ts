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
import { DisputeService } from './dispute.service';
import { AdminDisputeQueryDto } from './dto/dispute-query.dto';
import {
  EscalateDisputeDto,
  ResolveDisputeDto,
  AdminAssignDisputeDto,
  AdminDisputeMessageDto,
} from './dto/dispute-action.dto';

@ApiTags('Admin Disputes')
@ApiBearerAuth()
@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminDisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Get()
  @Roles('admin')
  @RequirePermissions('dispute:admin')
  @ApiOperation({ summary: 'List all disputes (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated list of all disputes' })
  async getAllDisputes(@Query() query: AdminDisputeQueryDto) {
    return this.disputeService.getAdminDisputes(query);
  }

  @Get('stats')
  @Roles('admin')
  @RequirePermissions('dispute:admin')
  @ApiOperation({ summary: 'Get dispute statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Dispute statistics' })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  async getDisputeStats(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.disputeService.getDisputeStats(dateFrom, dateTo);
  }

  @Get(':id')
  @Roles('admin')
  @RequirePermissions('dispute:admin')
  @ApiOperation({ summary: 'Get dispute details (admin)' })
  @ApiResponse({ status: 200, description: 'Dispute details with all messages (including internal)' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async getDispute(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.disputeService.getDisputeById(id, undefined, 'admin');
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/messages')
  @Roles('admin')
  @RequirePermissions('dispute:admin')
  @ApiOperation({ summary: 'Get all dispute messages including internal notes (admin)' })
  @ApiResponse({ status: 200, description: 'All dispute messages' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async getMessages(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.disputeService.getDisputeMessages(id, '', 'admin');
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/messages')
  @Roles('admin')
  @RequirePermissions('dispute:admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add message to dispute (admin, supports internal notes)' })
  @ApiResponse({ status: 201, description: 'Message added' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') adminId: string,
    @Body() dto: AdminDisputeMessageDto,
  ) {
    const result = await this.disputeService.addAdminMessage(id, adminId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/assign')
  @Roles('admin')
  @RequirePermissions('dispute:admin')
  @ApiOperation({ summary: 'Assign dispute to an admin' })
  @ApiResponse({ status: 200, description: 'Dispute assigned' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async assignDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminAssignDisputeDto,
  ) {
    const result = await this.disputeService.assignDispute(id, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/escalate')
  @Roles('admin')
  @RequirePermissions('dispute:admin')
  @ApiOperation({ summary: 'Escalate a dispute (admin)' })
  @ApiResponse({ status: 200, description: 'Dispute escalated' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async escalateDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') adminId: string,
    @Body() dto: EscalateDisputeDto,
  ) {
    const result = await this.disputeService.adminEscalate(id, adminId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/resolve')
  @Roles('admin')
  @RequirePermissions('dispute:admin')
  @ApiOperation({ summary: 'Resolve a dispute (admin)' })
  @ApiResponse({ status: 200, description: 'Dispute resolved' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async resolveDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') adminId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    const result = await this.disputeService.resolveDispute(id, adminId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/close')
  @Roles('admin')
  @RequirePermissions('dispute:admin')
  @ApiOperation({ summary: 'Close a dispute (admin)' })
  @ApiResponse({ status: 200, description: 'Dispute closed' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async closeDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    const result = await this.disputeService.closeDispute(id, adminId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('auto-escalate')
  @Roles('admin')
  @RequirePermissions('dispute:admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger auto-escalation of overdue disputes (admin/scheduler)' })
  @ApiResponse({ status: 200, description: 'Number of disputes auto-escalated' })
  async triggerAutoEscalation() {
    const count = await this.disputeService.autoEscalateOverdueDisputes();
    return {
      success: true,
      data: { escalated_count: count },
      timestamp: new Date().toISOString(),
    };
  }
}
