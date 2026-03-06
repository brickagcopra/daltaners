import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { LoyaltyQueryDto } from './dto/loyalty-query.dto';
import { AdminLoyaltyQueryDto } from './dto/admin-loyalty-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // ── Customer Endpoints ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('account')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my loyalty account (auto-creates if not exists)' })
  async getMyAccount(@CurrentUser('id') userId: string) {
    return this.loyaltyService.getMyAccount(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my points transaction history' })
  async getMyTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: LoyaltyQueryDto,
  ) {
    return this.loyaltyService.getMyTransactions(
      userId,
      query.page,
      query.limit,
      query.type,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem points for a discount' })
  async redeemPoints(
    @CurrentUser('id') userId: string,
    @Body() dto: RedeemPointsDto,
  ) {
    return this.loyaltyService.redeemPoints(userId, dto.points, dto.order_id);
  }

  // ── Admin Endpoints ──────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/accounts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all loyalty accounts (admin)' })
  async getAdminAccounts(@Query() query: AdminLoyaltyQueryDto) {
    return this.loyaltyService.getAdminAccounts(
      query.page,
      query.limit,
      query.search,
      query.tier,
      query.account_type,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get loyalty program statistics (admin)' })
  async getAdminStats() {
    return this.loyaltyService.getAdminStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/accounts/:id/adjust')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adjust points for a loyalty account (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async adjustPoints(
    @Param('id', ParseUUIDPipe) accountId: string,
    @Body() dto: AdjustPointsDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.loyaltyService.adjustPoints(accountId, dto.points, dto.reason, adminId);
  }
}
