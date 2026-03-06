import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ElasticsearchService } from './elasticsearch.service';
import { CatalogRepository } from './catalog.repository';
import { SearchQueryDto, SuggestQueryDto } from './dto/search-query.dto';

@Controller('catalog/search')
@ApiTags('Search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SearchController {
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly catalogRepository: CatalogRepository,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search products with full-text search, filters, and facets' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async search(@Query() query: SearchQueryDto) {
    const from = (query.page ?? 0) * (query.size ?? 20);

    const result = await this.elasticsearchService.search({
      query: query.q,
      category_id: query.category_id,
      store_id: query.store_id,
      brand: query.brand,
      min_price: query.min_price,
      max_price: query.max_price,
      dietary_tags: query.dietary_tags,
      sort_by: query.sort_by,
      sort_order: query.sort_order,
      from,
      size: query.size ?? 20,
    });

    return {
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: query.page ?? 0,
        size: query.size ?? 20,
        total_pages: Math.ceil(result.total / (query.size ?? 20)),
      },
      aggregations: result.aggregations,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('suggest')
  @Public()
  @ApiOperation({ summary: 'Get autocomplete suggestions for product names' })
  @ApiResponse({ status: 200, description: 'Suggestions returned' })
  async suggest(@Query() query: SuggestQueryDto) {
    const result = await this.elasticsearchService.suggest(
      query.q ?? '',
      query.size ?? 10,
    );

    return {
      success: true,
      data: result.suggestions,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reindex')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Reindex all products (admin only)' })
  @ApiResponse({ status: 200, description: 'Reindex completed' })
  @HttpCode(HttpStatus.OK)
  async reindex() {
    // Delete and recreate index
    await this.elasticsearchService.reindex();

    // Fetch all active products from DB
    const products = await this.catalogRepository.findAllProductsForIndexing();

    // Bulk index
    const result = await this.elasticsearchService.bulkIndex(products);

    return {
      success: true,
      data: {
        total_products: products.length,
        indexed: result.indexed,
        errors: result.errors,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
