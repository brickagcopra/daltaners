import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Cash Movements')
@ApiBearerAuth()
@Controller('pos/shifts')
@Roles('vendor_owner', 'vendor_staff', 'admin')
export class CashMovementController {
  constructor(private readonly posService: PosService) {}

  @Post(':shiftId/cash-movements')
  @ApiOperation({ summary: 'Record a cash movement (cash in, cash out, float, pickup)' })
  async create(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const movement = await this.posService.createCashMovement(shiftId, dto, user);
    return {
      success: true,
      data: movement,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':shiftId/cash-movements')
  @ApiOperation({ summary: 'List cash movements for a shift' })
  async listByShift(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.posService.listCashMovements(
      shiftId,
      query.page || 1,
      query.limit || 50,
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
}
