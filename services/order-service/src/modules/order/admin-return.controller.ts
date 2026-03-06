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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReturnService } from './return.service';
import { AdminReturnQueryDto } from './dto/return-request-query.dto';
import { AdminReturnActionDto } from './dto/vendor-return-response.dto';

@ApiTags('Admin Returns')
@ApiBearerAuth()
@Controller('admin/returns')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminReturnController {
  constructor(private readonly returnService: ReturnService) {}

  @Get()
  @Roles('admin')
  @RequirePermissions('return:admin')
  @ApiOperation({ summary: 'List all return requests (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated list of all return requests' })
  async getAllReturns(@Query() query: AdminReturnQueryDto) {
    return this.returnService.getAdminReturns(query);
  }

  @Get('stats')
  @Roles('admin')
  @RequirePermissions('return:admin')
  @ApiOperation({ summary: 'Get return statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Return statistics' })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  async getReturnStats(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.returnService.getReturnStats(dateFrom, dateTo);
  }

  @Get(':id')
  @Roles('admin')
  @RequirePermissions('return:admin')
  @ApiOperation({ summary: 'Get return request details (admin)' })
  @ApiResponse({ status: 200, description: 'Return request details' })
  @ApiResponse({ status: 404, description: 'Return request not found' })
  @ApiParam({ name: 'id', type: String, description: 'Return request UUID' })
  async getReturn(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.returnService.getReturnById(id, undefined, 'admin');
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/escalate')
  @Roles('admin')
  @RequirePermissions('return:admin')
  @ApiOperation({ summary: 'Escalate a return request' })
  @ApiResponse({ status: 200, description: 'Return request escalated' })
  @ApiParam({ name: 'id', type: String, description: 'Return request UUID' })
  async escalateReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReturnActionDto,
  ) {
    const result = await this.returnService.escalateReturn(id, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/override-approve')
  @Roles('admin')
  @RequirePermissions('return:admin')
  @ApiOperation({ summary: 'Override approve a return request (admin)' })
  @ApiResponse({ status: 200, description: 'Return request approved by admin' })
  @ApiParam({ name: 'id', type: String, description: 'Return request UUID' })
  async overrideApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReturnActionDto,
  ) {
    const result = await this.returnService.overrideApprove(id, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/override-deny')
  @Roles('admin')
  @RequirePermissions('return:admin')
  @ApiOperation({ summary: 'Override deny a return request (admin)' })
  @ApiResponse({ status: 200, description: 'Return request denied by admin' })
  @ApiParam({ name: 'id', type: String, description: 'Return request UUID' })
  async overrideDeny(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReturnActionDto,
  ) {
    const result = await this.returnService.overrideDeny(id, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
