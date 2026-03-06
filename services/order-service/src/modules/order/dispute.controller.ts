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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DisputeService } from './dispute.service';
import { CreateDisputeDto, CreateDisputeMessageDto } from './dto/create-dispute.dto';
import { DisputeQueryDto } from './dto/dispute-query.dto';
import { EscalateDisputeDto } from './dto/dispute-action.dto';

@ApiTags('Disputes')
@ApiBearerAuth()
@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post()
  @Roles('customer')
  @RequirePermissions('dispute:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a dispute (customer)' })
  @ApiResponse({ status: 201, description: 'Dispute created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Active dispute already exists' })
  async createDispute(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDisputeDto,
  ) {
    const result = await this.disputeService.createDispute(userId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my')
  @Roles('customer')
  @RequirePermissions('dispute:read')
  @ApiOperation({ summary: 'List my disputes (customer)' })
  @ApiResponse({ status: 200, description: 'List of customer disputes' })
  async getMyDisputes(
    @CurrentUser('userId') userId: string,
    @Query() query: DisputeQueryDto,
  ) {
    return this.disputeService.getCustomerDisputes(userId, query);
  }

  @Get(':id')
  @Roles('customer', 'vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('dispute:read')
  @ApiOperation({ summary: 'Get dispute details' })
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
  @Roles('customer', 'vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('dispute:read')
  @ApiOperation({ summary: 'Get dispute messages' })
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

  @Post(':id/messages')
  @Roles('customer')
  @RequirePermissions('dispute:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a message to a dispute (customer)' })
  @ApiResponse({ status: 201, description: 'Message added' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDisputeMessageDto,
  ) {
    const result = await this.disputeService.addCustomerMessage(id, userId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/escalate')
  @Roles('customer')
  @RequirePermissions('dispute:create')
  @ApiOperation({ summary: 'Escalate a dispute (customer)' })
  @ApiResponse({ status: 200, description: 'Dispute escalated' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute UUID' })
  async escalateDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: EscalateDisputeDto,
  ) {
    const result = await this.disputeService.customerEscalate(id, userId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
