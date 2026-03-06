import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ShiftQueryDto } from './dto/shift-query.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Shifts')
@ApiBearerAuth()
@Controller('pos/shifts')
@Roles('vendor_owner', 'vendor_staff', 'admin')
export class ShiftController {
  constructor(private readonly posService: PosService) {}

  // ── Literal-prefixed routes MUST come before /:id routes ──

  @Post('open')
  @ApiOperation({ summary: 'Open a new shift on a terminal' })
  async openShift(
    @Body() dto: OpenShiftDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const shift = await this.posService.openShift(dto, user);
    return {
      success: true,
      data: shift,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('terminal/:terminalId')
  @ApiOperation({ summary: 'List shifts for a terminal' })
  async listByTerminal(
    @Param('terminalId', ParseUUIDPipe) terminalId: string,
    @Query() query: ShiftQueryDto,
  ) {
    const result = await this.posService.listShiftsByTerminal(
      terminalId,
      query.page || 1,
      query.limit || 20,
      query.status,
    );
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'List shifts for a store' })
  async listByStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: ShiftQueryDto,
  ) {
    const result = await this.posService.listShiftsByStore(
      storeId,
      query.page || 1,
      query.limit || 20,
      query.date_from,
      query.date_to,
    );
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ── Parameterized routes after literal ones ──

  @Get(':id')
  @ApiOperation({ summary: 'Get shift by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const shift = await this.posService.getShift(id);
    return {
      success: true,
      data: shift,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get shift transaction summary' })
  async getSummary(@Param('id', ParseUUIDPipe) id: string) {
    const summary = await this.posService.getShiftSummary(id);
    return {
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close an open shift' })
  async closeShift(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const shift = await this.posService.closeShift(id, dto, user);
    return {
      success: true,
      data: shift,
      timestamp: new Date().toISOString(),
    };
  }
}
