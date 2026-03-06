import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PricingService } from './pricing.service';
import { AdminPricingRuleQueryDto } from './dto/pricing-rule-query.dto';
import { AdminPriceHistoryQueryDto } from './dto/price-history-query.dto';

@ApiTags('Admin Pricing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/admin/pricing')
export class AdminPricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('rules')
  @ApiOperation({ summary: 'List all pricing rules (admin)' })
  async getAllRules(@Query() query: AdminPricingRuleQueryDto) {
    const result = await this.pricingService.getAllRulesAdmin(query);
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

  @Get('rules/stats')
  @ApiOperation({ summary: 'Get platform-wide pricing rule statistics (admin)' })
  async getStats() {
    const stats = await this.pricingService.getAllRuleStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get pricing rule detail (admin)' })
  async getRule(@Param('id') id: string) {
    const rule = await this.pricingService.getRuleByIdAdmin(id);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('rules/:id/expire')
  @ApiOperation({ summary: 'Force-expire a pricing rule (admin)' })
  async expireRule(@Param('id') id: string, @Request() req: any) {
    const rule = await this.pricingService.forceExpireRule(id, req.user.sub);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('rules/:id/cancel')
  @ApiOperation({ summary: 'Force-cancel a pricing rule (admin)' })
  async cancelRule(@Param('id') id: string, @Request() req: any) {
    const rule = await this.pricingService.forceCancelRule(id, req.user.sub);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get platform-wide price history (admin)' })
  async getHistory(@Query() query: AdminPriceHistoryQueryDto) {
    const result = await this.pricingService.getAllPriceHistoryAdmin(query);
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
