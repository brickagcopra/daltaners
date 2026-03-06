import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
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
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RecommendationService } from './recommendation.service';
import {
  PopularProductsQueryDto,
  SimilarProductsQueryDto,
  FrequentlyBoughtTogetherQueryDto,
  PersonalizedQueryDto,
} from './dto/recommendation-query.dto';

@Controller('catalog/recommendations')
@ApiTags('Recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Get popular products' })
  @ApiResponse({ status: 200, description: 'Popular products returned successfully' })
  async getPopularProducts(@Query() query: PopularProductsQueryDto) {
    const result = await this.recommendationService.getPopularProducts(query);
    return {
      success: true,
      data: result.data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('together/:productId')
  @Public()
  @ApiOperation({ summary: 'Get frequently bought together products' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Frequently bought together products returned' })
  async getFrequentlyBoughtTogether(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: FrequentlyBoughtTogetherQueryDto,
  ) {
    const result = await this.recommendationService.getFrequentlyBoughtTogether(
      productId,
      query,
    );
    return {
      success: true,
      data: result.data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('similar/:productId')
  @Public()
  @ApiOperation({ summary: 'Get similar products' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Similar products returned' })
  async getSimilarProducts(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: SimilarProductsQueryDto,
  ) {
    const result = await this.recommendationService.getSimilarProducts(
      productId,
      query,
    );
    return {
      success: true,
      data: result.data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('personalized')
  @Roles('customer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized product recommendations (customer only)' })
  @ApiResponse({ status: 200, description: 'Personalized recommendations returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPersonalizedProducts(
    @CurrentUser() user: { userId: string },
    @Query() query: PersonalizedQueryDto,
  ) {
    const result = await this.recommendationService.getPersonalizedProducts(
      user.userId,
      query,
    );
    return {
      success: true,
      data: result.data,
      timestamp: new Date().toISOString(),
    };
  }
}
