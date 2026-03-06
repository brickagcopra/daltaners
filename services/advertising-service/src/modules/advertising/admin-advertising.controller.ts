import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdvertisingService } from './advertising.service';
import { AdminCampaignQueryDto, AdminCampaignActionDto } from './dto/campaign-query.dto';

@ApiTags('Admin Advertising')
@ApiBearerAuth()
@Controller('admin/advertising')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAdvertisingController {
  constructor(private readonly service: AdvertisingService) {}

  @Get('campaigns')
  @ApiOperation({ summary: 'List all campaigns (admin)' })
  async listAll(@Query() query: AdminCampaignQueryDto) {
    return this.service.getAllCampaigns(query);
  }

  @Get('campaigns/stats')
  @ApiOperation({ summary: 'Get platform-wide campaign stats' })
  async campaignStats() {
    return this.service.getCampaignStats();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get platform advertising stats (spend, impressions, clicks, etc.)' })
  async platformStats() {
    return this.service.getPlatformStats();
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign detail (admin)' })
  async getCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCampaignById(id);
  }

  @Get('campaigns/:id/performance')
  @ApiOperation({ summary: 'Get campaign performance (admin)' })
  async getPerformance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days') days?: number,
  ) {
    return this.service.getCampaignPerformance(id, days || 30);
  }

  @Patch('campaigns/:id/approve')
  @ApiOperation({ summary: 'Approve a pending campaign' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.service.approveCampaign(id, adminId);
  }

  @Patch('campaigns/:id/reject')
  @ApiOperation({ summary: 'Reject a pending campaign' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminCampaignActionDto,
  ) {
    return this.service.rejectCampaign(id, adminId, dto.reason);
  }

  @Patch('campaigns/:id/suspend')
  @ApiOperation({ summary: 'Suspend an active campaign' })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminCampaignActionDto,
  ) {
    return this.service.suspendCampaign(id, adminId, dto.reason);
  }
}
