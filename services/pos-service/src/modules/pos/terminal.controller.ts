import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { CreateTerminalDto } from './dto/create-terminal.dto';
import { UpdateTerminalDto } from './dto/update-terminal.dto';
import { TerminalHeartbeatDto } from './dto/terminal-heartbeat.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Terminals')
@ApiBearerAuth()
@Controller('pos/terminals')
@Roles('vendor_owner', 'vendor_staff', 'admin')
export class TerminalController {
  constructor(private readonly posService: PosService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new POS terminal' })
  async create(
    @Body() dto: CreateTerminalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const terminal = await this.posService.createTerminal(dto, user);
    return {
      success: true,
      data: terminal,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'List terminals for a store' })
  async listByStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.posService.listTerminals(
      storeId,
      query.page || 1,
      query.limit || 20,
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

  @Get(':id')
  @ApiOperation({ summary: 'Get terminal by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const terminal = await this.posService.getTerminal(id);
    return {
      success: true,
      data: terminal,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a terminal' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerminalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const terminal = await this.posService.updateTerminal(id, dto, user);
    return {
      success: true,
      data: terminal,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a terminal' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.posService.deleteTerminal(id, user);
  }

  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send terminal heartbeat' })
  async heartbeat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TerminalHeartbeatDto,
  ) {
    await this.posService.heartbeat(id, dto.ip_address);
  }
}
