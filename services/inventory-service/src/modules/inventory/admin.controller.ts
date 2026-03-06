import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';
import { AdminStockQueryDto, AdminMovementsQueryDto } from './dto/admin-stock-query.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@ApiTags('Admin - Inventory')
@ApiBearerAuth()
@Controller('inventory/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  @ApiOperation({ summary: 'List all stock entries with product info (admin)' })
  async listStock(@Query() query: AdminStockQueryDto) {
    return this.inventoryService.adminListStock(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory statistics (admin)' })
  async getStats() {
    return this.inventoryService.adminGetStats();
  }

  @Get('movements')
  @ApiOperation({ summary: 'List stock movements globally (admin)' })
  async listMovements(@Query() query: AdminMovementsQueryDto) {
    return this.inventoryService.adminListMovements(query);
  }

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust stock quantity (admin)' })
  async adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inventoryService.adjustStock(dto, userId);
  }
}
