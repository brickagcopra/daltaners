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
import { ReturnService } from './return.service';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ReturnRequestQueryDto } from './dto/return-request-query.dto';

@ApiTags('Returns')
@ApiBearerAuth()
@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ReturnController {
  constructor(private readonly returnService: ReturnService) {}

  @Post()
  @Roles('customer')
  @RequirePermissions('return:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a return request (customer)' })
  @ApiResponse({ status: 201, description: 'Return request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or order not eligible' })
  @ApiResponse({ status: 409, description: 'Active return already exists' })
  async createReturn(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateReturnRequestDto,
  ) {
    const result = await this.returnService.createReturnRequest(userId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my')
  @Roles('customer')
  @RequirePermissions('return:read')
  @ApiOperation({ summary: 'List my return requests (customer)' })
  @ApiResponse({ status: 200, description: 'List of customer return requests' })
  async getMyReturns(
    @CurrentUser('userId') userId: string,
    @Query() query: ReturnRequestQueryDto,
  ) {
    return this.returnService.getCustomerReturns(userId, query);
  }

  @Get(':id')
  @Roles('customer', 'vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('return:read')
  @ApiOperation({ summary: 'Get return request details' })
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

  @Patch(':id/cancel')
  @Roles('customer')
  @RequirePermissions('return:cancel')
  @ApiOperation({ summary: 'Cancel a pending return request (customer)' })
  @ApiResponse({ status: 200, description: 'Return request cancelled' })
  @ApiResponse({ status: 400, description: 'Return cannot be cancelled' })
  @ApiParam({ name: 'id', type: String, description: 'Return request UUID' })
  async cancelReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.returnService.cancelReturn(id, userId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
