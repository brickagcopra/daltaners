import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
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
import { InventoryService } from './inventory.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { ReleaseStockDto } from './dto/release-stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  @ApiOperation({ summary: 'List stock entries with optional filters' })
  @ApiResponse({ status: 200, description: 'Stock entries retrieved successfully' })
  @Roles('admin', 'vendor_owner', 'vendor_staff')
  @RequirePermissions('inventory:read')
  async listStock(@Query() query: StockQueryDto) {
    const result = await this.inventoryService.listStock(query);
    return {
      ...result,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  }

  @Get('stock/low')
  @ApiOperation({ summary: 'List low-stock items below reorder point' })
  @ApiResponse({ status: 200, description: 'Low stock items retrieved successfully' })
  @Roles('admin', 'vendor_owner', 'vendor_staff')
  @RequirePermissions('inventory:read')
  async getLowStockItems(
    @Query() query: StockQueryDto,
  ) {
    const result = await this.inventoryService.getLowStockItems(
      query.store_location_id,
      query.page,
      query.limit,
    );
    return {
      ...result,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  }

  @Get('stock/:productId/:locationId')
  @ApiOperation({ summary: 'Get stock level for a product at a specific location' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'locationId', description: 'Store location UUID' })
  @ApiResponse({ status: 200, description: 'Stock level retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Stock record not found' })
  @Roles('admin', 'vendor_owner', 'vendor_staff')
  @RequirePermissions('inventory:read')
  async getStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ) {
    return this.inventoryService.getStock(productId, locationId);
  }

  @Post('stock')
  @ApiOperation({ summary: 'Create a new stock entry' })
  @ApiResponse({ status: 201, description: 'Stock entry created successfully' })
  @ApiResponse({ status: 409, description: 'Stock entry already exists for this product and location' })
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'vendor_owner', 'vendor_staff')
  @RequirePermissions('inventory:manage')
  async createStock(
    @Body() dto: CreateStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inventoryService.createStock(dto, userId);
  }

  @Post('stock/adjust')
  @ApiOperation({ summary: 'Adjust stock quantity (add or remove)' })
  @ApiResponse({ status: 200, description: 'Stock adjusted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment or insufficient stock' })
  @ApiResponse({ status: 404, description: 'Stock record not found' })
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'vendor_owner', 'vendor_staff')
  @RequirePermissions('inventory:manage')
  async adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inventoryService.adjustStock(dto, userId);
  }

  @Post('stock/reserve')
  @ApiOperation({ summary: 'Reserve stock for checkout' })
  @ApiResponse({ status: 200, description: 'Stock reserved successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock for reservation' })
  @ApiResponse({ status: 404, description: 'Stock record not found' })
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'vendor_owner', 'vendor_staff', 'customer')
  @RequirePermissions('inventory:reserve')
  async reserveStock(
    @Body() dto: ReserveStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inventoryService.reserveStock(dto, userId);
  }

  @Post('stock/release')
  @ApiOperation({ summary: 'Release reserved stock' })
  @ApiResponse({ status: 200, description: 'Stock released successfully' })
  @ApiResponse({ status: 400, description: 'Cannot release more than reserved' })
  @ApiResponse({ status: 404, description: 'Stock record not found' })
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'vendor_owner', 'vendor_staff')
  @RequirePermissions('inventory:manage')
  async releaseStock(
    @Body() dto: ReleaseStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inventoryService.releaseStock(dto, userId);
  }

  @Get('movements/:stockId')
  @ApiOperation({ summary: 'Get movement history for a stock entry' })
  @ApiParam({ name: 'stockId', description: 'Stock UUID' })
  @ApiResponse({ status: 200, description: 'Movement history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Stock record not found' })
  @Roles('admin', 'vendor_owner', 'vendor_staff')
  @RequirePermissions('inventory:read')
  async getMovements(
    @Param('stockId', ParseUUIDPipe) stockId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.inventoryService.getMovements(
      stockId,
      query.page,
      query.limit,
    );
    return {
      ...result,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  }
}
