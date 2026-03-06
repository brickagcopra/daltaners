import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AdvertisingService } from './advertising.service';
import { RecordImpressionDto, RecordClickDto, RecordConversionDto } from './dto/campaign-query.dto';

@ApiTags('Public Ads')
@Controller('ads')
export class PublicAdController {
  constructor(private readonly service: AdvertisingService) {}

  @Public()
  @Get('sponsored-products')
  @ApiOperation({ summary: 'Get sponsored products for a placement' })
  async sponsoredProducts(
    @Query('placement') placement: string = 'search_results',
    @Query('limit') limit: number = 5,
  ) {
    return this.service.getSponsoredProducts(placement, limit);
  }

  @Public()
  @Get('banners')
  @ApiOperation({ summary: 'Get active banners for a placement' })
  async banners(
    @Query('placement') placement: string = 'home_page',
    @Query('limit') limit: number = 5,
  ) {
    return this.service.getActiveBanners(placement, limit);
  }

  @Public()
  @Post(':campaignId/impressions')
  @ApiOperation({ summary: 'Record an ad impression' })
  async recordImpression(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: RecordImpressionDto,
  ) {
    return this.service.recordImpression(campaignId, dto);
  }

  @Public()
  @Post(':campaignId/clicks')
  @ApiOperation({ summary: 'Record an ad click' })
  async recordClick(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: RecordClickDto,
  ) {
    return this.service.recordClick(campaignId, dto);
  }

  @Public()
  @Post('conversions')
  @ApiOperation({ summary: 'Record an ad conversion (order placed from ad click)' })
  async recordConversion(@Body() dto: RecordConversionDto) {
    return this.service.recordConversion(dto);
  }
}
