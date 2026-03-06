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
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdvertisingService } from './advertising.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { CampaignQueryDto, AddCampaignProductDto } from './dto/campaign-query.dto';

@ApiTags('Vendor Campaigns')
@ApiBearerAuth()
@Controller('advertising/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendor_owner', 'vendor_staff')
export class VendorCampaignController {
  constructor(private readonly service: AdvertisingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ad campaign' })
  async create(
    @CurrentUser('vendor_id') storeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.service.createCampaign(storeId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my store campaigns' })
  async list(
    @CurrentUser('vendor_id') storeId: string,
    @Query() query: CampaignQueryDto,
  ) {
    return this.service.getCampaignsByStore(storeId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get campaign stats for my store' })
  async stats(@CurrentUser('vendor_id') storeId: string) {
    return this.service.getCampaignStats(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details' })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
  ) {
    const campaign = await this.service.getCampaignById(id);
    if (campaign.store_id !== storeId) {
      throw new Error('Forbidden');
    }
    return campaign;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.service.updateCampaign(id, storeId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete campaign' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
  ) {
    await this.service.deleteCampaign(id, storeId);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit campaign for admin review' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
  ) {
    return this.service.submitForReview(id, storeId);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause active campaign' })
  async pause(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
  ) {
    return this.service.pauseCampaign(id, storeId);
  }

  @Patch(':id/resume')
  @ApiOperation({ summary: 'Resume paused campaign' })
  async resume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
  ) {
    return this.service.resumeCampaign(id, storeId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel campaign' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
  ) {
    return this.service.cancelCampaign(id, storeId);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Get campaign performance metrics' })
  async performance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days') days?: number,
  ) {
    return this.service.getCampaignPerformance(id, days || 30);
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'List products in campaign' })
  async listProducts(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCampaignProducts(id);
  }

  @Post(':id/products')
  @ApiOperation({ summary: 'Add product to campaign' })
  async addProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
    @Body() dto: AddCampaignProductDto,
  ) {
    return this.service.addProduct(id, storeId, dto);
  }

  @Delete(':id/products/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove product from campaign' })
  async removeProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser('vendor_id') storeId: string,
  ) {
    await this.service.removeProduct(id, storeId, productId);
  }
}
