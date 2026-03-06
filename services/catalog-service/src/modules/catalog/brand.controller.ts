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
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandQueryDto } from './dto/brand-query.dto';

// ─── Public Brand Endpoints ──────────────────────────────────────────

@ApiTags('Brands')
@Controller('api/v1/catalog/brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @ApiOperation({ summary: 'List active brands (public)' })
  async getActiveBrands() {
    const brands = await this.brandService.getActiveBrands();
    return {
      success: true,
      data: brands,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('featured')
  @ApiOperation({ summary: 'List featured brands (public)' })
  async getFeaturedBrands() {
    const brands = await this.brandService.getFeaturedBrands();
    return {
      success: true,
      data: brands,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get brand by ID or slug (public)' })
  async getBrand(@Param('idOrSlug') idOrSlug: string) {
    const brand = await this.brandService.getBrandByIdOrSlug(idOrSlug);
    return {
      success: true,
      data: brand,
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── Admin Brand Endpoints ───────────────────────────────────────────

@ApiTags('Admin Brands')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/admin/brands')
export class AdminBrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @ApiOperation({ summary: 'List all brands with filters (admin)' })
  async getBrands(@Query() query: BrandQueryDto) {
    const result = await this.brandService.getBrands(query);
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
  @ApiOperation({ summary: 'Get brand statistics (admin)' })
  async getBrandStats() {
    const stats = await this.brandService.getBrandStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand detail (admin)' })
  async getBrand(@Param('id') id: string) {
    const brand = await this.brandService.getBrandByIdOrSlug(id);
    return {
      success: true,
      data: brand,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new brand (admin)' })
  async createBrand(@Body() dto: CreateBrandDto, @Request() req: any) {
    const brand = await this.brandService.createBrand(dto, req.user.sub);
    return {
      success: true,
      data: brand,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update brand (admin)' })
  async updateBrand(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @Request() req: any,
  ) {
    const brand = await this.brandService.updateBrand(id, dto, req.user.sub);
    return {
      success: true,
      data: brand,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify a pending brand (admin)' })
  async verifyBrand(@Param('id') id: string, @Request() req: any) {
    const brand = await this.brandService.verifyBrand(id, req.user.sub);
    return {
      success: true,
      data: brand,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a verified/suspended brand (admin)' })
  async activateBrand(@Param('id') id: string, @Request() req: any) {
    const brand = await this.brandService.activateBrand(id, req.user.sub);
    return {
      success: true,
      data: brand,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a pending brand (admin)' })
  async rejectBrand(@Param('id') id: string, @Request() req: any) {
    const brand = await this.brandService.rejectBrand(id, req.user.sub);
    return {
      success: true,
      data: brand,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend an active brand (admin)' })
  async suspendBrand(@Param('id') id: string, @Request() req: any) {
    const brand = await this.brandService.suspendBrand(id, req.user.sub);
    return {
      success: true,
      data: brand,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete brand (admin, only if no products linked)' })
  async deleteBrand(@Param('id') id: string, @Request() req: any) {
    await this.brandService.deleteBrand(id, req.user.sub);
  }

  @Post(':id/recalculate')
  @ApiOperation({ summary: 'Recalculate product count for brand (admin)' })
  async recalculateProductCount(@Param('id') id: string) {
    const count = await this.brandService.recalculateProductCount(id);
    return {
      success: true,
      data: { product_count: count },
      timestamp: new Date().toISOString(),
    };
  }
}
