import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PerformanceService } from './performance.service';
import { AdminPerformanceQueryDto, PerformanceHistoryQueryDto } from './dto/performance-query.dto';

@ApiTags('Admin - Vendor Performance')
@ApiBearerAuth()
@Controller('vendors/admin/performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get()
  @ApiOperation({ summary: 'List all vendor performance metrics with filters and sorting' })
  async listPerformance(@Query() query: AdminPerformanceQueryDto) {
    return this.performanceService.adminListPerformance(query);
  }

  @Get('benchmarks')
  @ApiOperation({ summary: 'Get platform-wide performance benchmarks' })
  async getBenchmarks() {
    return this.performanceService.getPlatformBenchmarks();
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top performing vendors' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default 10)' })
  async getTopPerformers(@Query('limit') limit?: number) {
    return this.performanceService.getTopPerformers(limit || 10);
  }

  @Get('bottom')
  @ApiOperation({ summary: 'Get lowest performing vendors (needs attention)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default 10)' })
  async getBottomPerformers(@Query('limit') limit?: number) {
    return this.performanceService.getBottomPerformers(limit || 10);
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Get specific store performance metrics' })
  @ApiParam({ name: 'id', type: String, description: 'Store UUID' })
  async getStorePerformance(@Param('id', ParseUUIDPipe) id: string) {
    return this.performanceService.adminGetStorePerformance(id);
  }

  @Get('stores/:id/history')
  @ApiOperation({ summary: 'Get specific store performance history' })
  @ApiParam({ name: 'id', type: String, description: 'Store UUID' })
  async getStoreHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PerformanceHistoryQueryDto,
  ) {
    return this.performanceService.adminGetStoreHistory(id, query);
  }

  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger full performance recalculation for all active stores' })
  async triggerRecalculation() {
    return this.performanceService.triggerRecalculation();
  }

  @Post('stores/:id/recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger performance recalculation for a specific store' })
  @ApiParam({ name: 'id', type: String, description: 'Store UUID' })
  async recalculateStore(@Param('id', ParseUUIDPipe) id: string) {
    return this.performanceService.recalculateForStore(id);
  }
}
