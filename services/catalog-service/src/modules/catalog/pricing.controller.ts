import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PricingService } from './pricing.service';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { PricingRuleQueryDto } from './dto/pricing-rule-query.dto';
import { PriceHistoryQueryDto } from './dto/price-history-query.dto';

@ApiTags('Pricing Rules')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/catalog/pricing-rules')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a pricing rule (vendor)' })
  async createRule(@Body() dto: CreatePricingRuleDto, @Request() req: any) {
    const storeId = req.user.vendor_id;
    const rule = await this.pricingService.createRule(storeId, dto, req.user.sub);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List pricing rules for my store (vendor)' })
  async getRules(@Query() query: PricingRuleQueryDto, @Request() req: any) {
    const storeId = req.user.vendor_id;
    const result = await this.pricingService.getRulesByStore(storeId, query);
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

  @Get('stats')
  @ApiOperation({ summary: 'Get pricing rule statistics (vendor)' })
  async getStats(@Request() req: any) {
    const storeId = req.user.vendor_id;
    const stats = await this.pricingService.getRuleStats(storeId);
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pricing rule detail (vendor)' })
  async getRule(@Param('id') id: string, @Request() req: any) {
    const storeId = req.user.vendor_id;
    const rule = await this.pricingService.getRuleById(id, storeId);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update pricing rule (vendor)' })
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdatePricingRuleDto,
    @Request() req: any,
  ) {
    const storeId = req.user.vendor_id;
    const rule = await this.pricingService.updateRule(id, storeId, dto, req.user.sub);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete pricing rule (vendor)' })
  async deleteRule(@Param('id') id: string, @Request() req: any) {
    const storeId = req.user.vendor_id;
    await this.pricingService.deleteRule(id, storeId, req.user.sub);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a pricing rule (vendor)' })
  async activateRule(@Param('id') id: string, @Request() req: any) {
    const storeId = req.user.vendor_id;
    const rule = await this.pricingService.activateRule(id, storeId, req.user.sub);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause an active pricing rule (vendor)' })
  async pauseRule(@Param('id') id: string, @Request() req: any) {
    const storeId = req.user.vendor_id;
    const rule = await this.pricingService.pauseRule(id, storeId, req.user.sub);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pricing rule (vendor)' })
  async cancelRule(@Param('id') id: string, @Request() req: any) {
    const storeId = req.user.vendor_id;
    const rule = await this.pricingService.cancelRule(id, storeId, req.user.sub);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply pricing rule to matching products (vendor)' })
  async applyRule(@Param('id') id: string, @Request() req: any) {
    const storeId = req.user.vendor_id;
    const count = await this.pricingService.applyRulesToProducts(id, storeId, req.user.sub);
    return {
      success: true,
      data: { products_affected: count },
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/revert')
  @ApiOperation({ summary: 'Revert pricing rule from products (vendor)' })
  async revertRule(@Param('id') id: string, @Request() req: any) {
    const storeId = req.user.vendor_id;
    const count = await this.pricingService.revertRuleFromProducts(id, storeId, req.user.sub);
    return {
      success: true,
      data: { products_reverted: count },
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── Product Pricing Endpoints ──────────────────────────────────────

@ApiTags('Pricing')
@Controller('api/v1/catalog/pricing')
export class ProductPricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('products/:productId/effective-price')
  @ApiOperation({ summary: 'Get effective price for a product (public)' })
  async getEffectivePrice(@Param('productId') productId: string) {
    const result = await this.pricingService.getEffectivePrice(productId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('products/:productId/history')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get price history for a product (vendor)' })
  async getProductHistory(
    @Param('productId') productId: string,
    @Query() query: PriceHistoryQueryDto,
    @Request() req: any,
  ) {
    const storeId = req.user.vendor_id;
    const result = await this.pricingService.getProductPriceHistory(productId, storeId, query);
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

  @Get('history')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get price history for my store (vendor)' })
  async getStoreHistory(@Query() query: PriceHistoryQueryDto, @Request() req: any) {
    const storeId = req.user.vendor_id;
    const result = await this.pricingService.getStorePriceHistory(storeId, query);
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
