import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CatalogService } from './catalog.service';
import { CsvImportService } from './csv-import.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CSV_TEMPLATE_HEADER, CSV_TEMPLATE_EXAMPLE, MAX_CSV_FILE_SIZE } from './dto/csv-import.dto';

@Controller('catalog')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly csvImportService: CsvImportService,
  ) {}

  // ─── Category Endpoints ───────────────────────────────────────────────

  @Get('categories')
  @Public()
  @ApiTags('Categories')
  @ApiOperation({ summary: 'Get category tree (cached)' })
  @ApiResponse({ status: 200, description: 'Category tree returned successfully' })
  async getCategoryTree() {
    return this.catalogService.getCategoryTree();
  }

  @Post('categories')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiTags('Categories')
  @ApiOperation({ summary: 'Create a new category (admin only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiTags('Categories')
  @ApiOperation({ summary: 'Update a category (admin only)' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiTags('Categories')
  @ApiOperation({ summary: 'Delete a category (admin only)' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    await this.catalogService.deleteCategory(id);
  }

  // ─── Product Endpoints ────────────────────────────────────────────────

  @Get('products')
  @Public()
  @ApiTags('Products')
  @ApiOperation({ summary: 'List products with filters and cursor pagination' })
  @ApiResponse({ status: 200, description: 'Products returned successfully' })
  async getProducts(@Query() query: ProductQueryDto) {
    return this.catalogService.getProducts(query);
  }

  // ─── CSV Import Endpoints ──────────────────────────────────────────
  // IMPORTANT: These must be declared BEFORE products/:idOrSlug to avoid route conflicts

  @Post('products/import')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('product:manage')
  @ApiBearerAuth()
  @ApiTags('CSV Import')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import products from CSV file (vendor/admin)' })
  @ApiResponse({ status: 200, description: 'Import results returned' })
  @ApiResponse({ status: 400, description: 'Invalid CSV file' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CSV_FILE_SIZE } }))
  async importProducts(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { userId: string; vendorId: string | null },
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required. Upload a file with field name "file".');
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are accepted.');
    }

    if (!user.vendorId) {
      throw new BadRequestException('You must be associated with a vendor to import products.');
    }

    const result = await this.csvImportService.importProducts(
      file.buffer,
      user.vendorId,
      user.userId,
    );

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('products/import/template')
  @Public()
  @ApiTags('CSV Import')
  @ApiOperation({ summary: 'Download CSV import template' })
  @ApiResponse({ status: 200, description: 'CSV template file' })
  async downloadImportTemplate(@Res() res: Response) {
    const csvContent = `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.csv"');
    res.send(csvContent);
  }

  @Get('products/:idOrSlug')
  @Public()
  @ApiTags('Products')
  @ApiOperation({ summary: 'Get product detail by ID or slug' })
  @ApiParam({ name: 'idOrSlug', description: 'Product UUID or slug' })
  @ApiResponse({ status: 200, description: 'Product returned successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(@Param('idOrSlug') idOrSlug: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(idOrSlug)) {
      return this.catalogService.getProductById(idOrSlug);
    }
    return this.catalogService.getProductBySlug(idOrSlug);
  }

  @Post('products')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('product:manage')
  @ApiBearerAuth()
  @ApiTags('Products')
  @ApiOperation({ summary: 'Create a new product (vendor/admin)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { userId: string; vendorId: string | null },
  ) {
    return this.catalogService.createProduct(dto, user.userId, user.vendorId);
  }

  @Patch('products/:id')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('product:manage')
  @ApiBearerAuth()
  @ApiTags('Products')
  @ApiOperation({ summary: 'Update a product (vendor owner or admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: { userId: string; role: string; vendorId: string | null },
  ) {
    return this.catalogService.updateProduct(id, dto, user.userId, user.role, user.vendorId);
  }

  @Delete('products/:id')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('product:manage')
  @ApiBearerAuth()
  @ApiTags('Products')
  @ApiOperation({ summary: 'Delete a product (vendor owner or admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; role: string; vendorId: string | null },
  ) {
    await this.catalogService.deleteProduct(id, user.userId, user.role, user.vendorId);
  }

  @Get('stores/:storeId/products')
  @Public()
  @ApiTags('Products')
  @ApiOperation({ summary: 'List products by store' })
  @ApiParam({ name: 'storeId', description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'Store products returned successfully' })
  async getProductsByStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: ProductQueryDto,
  ) {
    return this.catalogService.getProductsByStoreId(storeId, query);
  }

  // ─── Product Image Endpoints ──────────────────────────────────────────

  @Post('products/:productId/images')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('product:manage')
  @ApiBearerAuth()
  @ApiTags('Product Images')
  @ApiOperation({ summary: 'Add an image to a product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 201, description: 'Image added successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @HttpCode(HttpStatus.CREATED)
  async addProductImage(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductImageDto,
    @CurrentUser() user: { userId: string; role: string; vendorId: string | null },
  ) {
    return this.catalogService.addProductImage(productId, dto, user.userId, user.role, user.vendorId);
  }

  @Delete('products/:productId/images/:imageId')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('product:manage')
  @ApiBearerAuth()
  @ApiTags('Product Images')
  @ApiOperation({ summary: 'Remove an image from a product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'imageId', description: 'Image UUID' })
  @ApiResponse({ status: 204, description: 'Image removed successfully' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeProductImage(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: { userId: string; role: string; vendorId: string | null },
  ) {
    await this.catalogService.removeProductImage(productId, imageId, user.userId, user.role, user.vendorId);
  }

  @Patch('products/:productId/images/:imageId/primary')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('product:manage')
  @ApiBearerAuth()
  @ApiTags('Product Images')
  @ApiOperation({ summary: 'Set an image as the primary product image' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'imageId', description: 'Image UUID' })
  @ApiResponse({ status: 200, description: 'Primary image set successfully' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async setPrimaryImage(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: { userId: string; role: string; vendorId: string | null },
  ) {
    return this.catalogService.setPrimaryImage(productId, imageId, user.userId, user.role, user.vendorId);
  }

  // ─── Product Variant Endpoints ────────────────────────────────────────

  @Post('products/:productId/variants')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('product:manage')
  @ApiBearerAuth()
  @ApiTags('Product Variants')
  @ApiOperation({ summary: 'Add a variant to a product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 201, description: 'Variant added successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @HttpCode(HttpStatus.CREATED)
  async addProductVariant(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductVariantDto,
    @CurrentUser() user: { userId: string; role: string; vendorId: string | null },
  ) {
    return this.catalogService.addProductVariant(productId, dto, user.userId, user.role, user.vendorId);
  }

  @Patch('products/:productId/variants/:variantId')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('product:manage')
  @ApiBearerAuth()
  @ApiTags('Product Variants')
  @ApiOperation({ summary: 'Update a product variant' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async updateProductVariant(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateProductVariantDto,
    @CurrentUser() user: { userId: string; role: string; vendorId: string | null },
  ) {
    return this.catalogService.updateProductVariant(
      productId, variantId, dto, user.userId, user.role, user.vendorId,
    );
  }

  @Delete('products/:productId/variants/:variantId')
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @RequirePermissions('product:manage')
  @ApiBearerAuth()
  @ApiTags('Product Variants')
  @ApiOperation({ summary: 'Delete a product variant' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  @ApiResponse({ status: 204, description: 'Variant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProductVariant(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @CurrentUser() user: { userId: string; role: string; vendorId: string | null },
  ) {
    await this.catalogService.deleteProductVariant(
      productId, variantId, user.userId, user.role, user.vendorId,
    );
  }
}
