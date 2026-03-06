import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CatalogRepository, CursorPaginatedResult } from './catalog.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { CategoryEntity } from './entities/category.entity';
import { ProductEntity } from './entities/product.entity';
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductVariantEntity } from './entities/product-variant.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CATALOG_EVENTS, KAFKA_TOPIC, ProductEventData } from './events/catalog.events';
import { ElasticsearchService } from './elasticsearch.service';

const CATEGORY_TREE_CACHE_KEY = 'catalog:categories:tree';
const CATEGORY_TREE_TTL = 3600; // 1 hour in seconds

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  // ─── Category Operations ──────────────────────────────────────────────

  async createCategory(dto: CreateCategoryDto): Promise<CategoryEntity> {
    const slug = this.generateSlug(dto.name);
    const uniqueSlug = await this.ensureUniqueCategorySlug(slug);

    if (dto.parent_id) {
      const parentExists = await this.catalogRepository.categoryExists(dto.parent_id);
      if (!parentExists) {
        throw new NotFoundException(`Parent category with ID ${dto.parent_id} not found`);
      }
    }

    const category = await this.catalogRepository.createCategory(dto, uniqueSlug);
    await this.invalidateCategoryTreeCache();
    this.logger.log(`Category created: ${category.id} (${category.name})`);
    return category;
  }

  async getCategoryTree(): Promise<unknown> {
    const cached = await this.redisService.get(CATEGORY_TREE_CACHE_KEY);
    if (cached) {
      this.logger.debug('Category tree served from cache');
      return JSON.parse(cached);
    }

    const tree = await this.catalogRepository.findCategoryTree();
    await this.redisService.set(CATEGORY_TREE_CACHE_KEY, JSON.stringify(tree), CATEGORY_TREE_TTL);
    this.logger.debug('Category tree cached');
    return tree;
  }

  async getCategoryById(id: string): Promise<CategoryEntity> {
    const category = await this.catalogRepository.findCategoryById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    if (dto.parent_id === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    const category = await this.catalogRepository.updateCategory(id, dto);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    await this.invalidateCategoryTreeCache();
    this.logger.log(`Category updated: ${id}`);
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const deleted = await this.catalogRepository.deleteCategory(id);
    if (!deleted) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    await this.invalidateCategoryTreeCache();
    this.logger.log(`Category deleted: ${id}`);
  }

  // ─── Product Operations ───────────────────────────────────────────────

  async createProduct(
    dto: CreateProductDto,
    userId: string,
    userVendorId: string | null,
  ): Promise<ProductEntity> {
    const categoryExists = await this.catalogRepository.categoryExists(dto.category_id);
    if (!categoryExists) {
      throw new NotFoundException(`Category with ID ${dto.category_id} not found`);
    }

    const slug = this.generateSlug(dto.name);
    const uniqueSlug = await this.ensureUniqueProductSlug(slug);

    const product = await this.catalogRepository.createProduct(dto, uniqueSlug);

    // Fetch full product with relations for ES indexing
    const fullProduct = await this.catalogRepository.findProductById(product.id);
    if (fullProduct) {
      this.indexProductAsync(fullProduct);
    }

    await this.publishProductEvent(CATALOG_EVENTS.PRODUCT_CREATED, product);
    this.logger.log(`Product created: ${product.id} (${product.name}) by user ${userId}`);
    return fullProduct ?? product;
  }

  async getProductById(id: string): Promise<ProductEntity> {
    const product = await this.catalogRepository.findProductById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async getProductBySlug(slug: string): Promise<ProductEntity> {
    const product = await this.catalogRepository.findProductBySlug(slug);
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return product;
  }

  async getProducts(query: ProductQueryDto): Promise<CursorPaginatedResult<ProductEntity>> {
    return this.catalogRepository.findProducts(query);
  }

  async getProductsByStoreId(
    storeId: string,
    query: ProductQueryDto,
  ): Promise<CursorPaginatedResult<ProductEntity>> {
    return this.catalogRepository.findProductsByStoreId(storeId, query);
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    userId: string,
    userRole: string,
    userVendorId: string | null,
  ): Promise<ProductEntity> {
    const existingProduct = await this.catalogRepository.findProductById(id);
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (userRole !== 'admin') {
      await this.validateVendorOwnership(id, userVendorId);
    }

    if (dto.category_id) {
      const categoryExists = await this.catalogRepository.categoryExists(dto.category_id);
      if (!categoryExists) {
        throw new NotFoundException(`Category with ID ${dto.category_id} not found`);
      }
    }

    if (dto.name) {
      const slug = this.generateSlug(dto.name);
      const uniqueSlug = await this.ensureUniqueProductSlug(slug, id);
      (dto as Record<string, unknown>).slug = uniqueSlug;
    }

    const product = await this.catalogRepository.updateProduct(id, dto);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.publishProductEvent(CATALOG_EVENTS.PRODUCT_UPDATED, product);
    this.logger.log(`Product updated: ${id} by user ${userId}`);

    const fullProduct = await this.catalogRepository.findProductById(id);
    if (fullProduct) {
      this.indexProductAsync(fullProduct);
    }
    return fullProduct!;
  }

  async deleteProduct(
    id: string,
    userId: string,
    userRole: string,
    userVendorId: string | null,
  ): Promise<void> {
    const product = await this.catalogRepository.findProductById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (userRole !== 'admin') {
      await this.validateVendorOwnership(id, userVendorId);
    }

    const deleted = await this.catalogRepository.deleteProduct(id);
    if (!deleted) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Remove from Elasticsearch
    this.removeProductFromIndexAsync(id);

    // Publish delete event
    await this.publishProductEvent(CATALOG_EVENTS.PRODUCT_DELETED, product);
    this.logger.log(`Product deleted: ${id} by user ${userId}`);
  }

  // ─── Product Image Operations ─────────────────────────────────────────

  async addProductImage(
    productId: string,
    dto: CreateProductImageDto,
    userId: string,
    userRole: string,
    userVendorId: string | null,
  ): Promise<ProductImageEntity> {
    const productExists = await this.catalogRepository.productExists(productId);
    if (!productExists) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (userRole !== 'admin') {
      await this.validateVendorOwnership(productId, userVendorId);
    }

    const image = await this.catalogRepository.createImage(productId, dto);
    this.logger.log(`Image added to product ${productId}: ${image.id} by user ${userId}`);
    return image;
  }

  async removeProductImage(
    productId: string,
    imageId: string,
    userId: string,
    userRole: string,
    userVendorId: string | null,
  ): Promise<void> {
    if (userRole !== 'admin') {
      await this.validateVendorOwnership(productId, userVendorId);
    }

    const image = await this.catalogRepository.findImageById(imageId);
    if (!image || image.product_id !== productId) {
      throw new NotFoundException(`Image with ID ${imageId} not found for product ${productId}`);
    }

    const deleted = await this.catalogRepository.deleteImage(imageId);
    if (!deleted) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    this.logger.log(`Image ${imageId} removed from product ${productId} by user ${userId}`);
  }

  async setPrimaryImage(
    productId: string,
    imageId: string,
    userId: string,
    userRole: string,
    userVendorId: string | null,
  ): Promise<ProductImageEntity> {
    if (userRole !== 'admin') {
      await this.validateVendorOwnership(productId, userVendorId);
    }

    const image = await this.catalogRepository.setPrimaryImage(productId, imageId);
    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found for product ${productId}`);
    }

    this.logger.log(`Image ${imageId} set as primary for product ${productId} by user ${userId}`);
    return image;
  }

  // ─── Product Variant Operations ───────────────────────────────────────

  async addProductVariant(
    productId: string,
    dto: CreateProductVariantDto,
    userId: string,
    userRole: string,
    userVendorId: string | null,
  ): Promise<ProductVariantEntity> {
    const productExists = await this.catalogRepository.productExists(productId);
    if (!productExists) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (userRole !== 'admin') {
      await this.validateVendorOwnership(productId, userVendorId);
    }

    const variant = await this.catalogRepository.createVariant(productId, dto);
    this.logger.log(`Variant added to product ${productId}: ${variant.id} by user ${userId}`);
    return variant;
  }

  async updateProductVariant(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
    userId: string,
    userRole: string,
    userVendorId: string | null,
  ): Promise<ProductVariantEntity> {
    if (userRole !== 'admin') {
      await this.validateVendorOwnership(productId, userVendorId);
    }

    const variant = await this.catalogRepository.findVariantById(variantId);
    if (!variant || variant.product_id !== productId) {
      throw new NotFoundException(`Variant with ID ${variantId} not found for product ${productId}`);
    }

    const updated = await this.catalogRepository.updateVariant(variantId, dto);
    if (!updated) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    this.logger.log(`Variant ${variantId} updated for product ${productId} by user ${userId}`);
    return updated;
  }

  async deleteProductVariant(
    productId: string,
    variantId: string,
    userId: string,
    userRole: string,
    userVendorId: string | null,
  ): Promise<void> {
    if (userRole !== 'admin') {
      await this.validateVendorOwnership(productId, userVendorId);
    }

    const variant = await this.catalogRepository.findVariantById(variantId);
    if (!variant || variant.product_id !== productId) {
      throw new NotFoundException(`Variant with ID ${variantId} not found for product ${productId}`);
    }

    const deleted = await this.catalogRepository.deleteVariant(variantId);
    if (!deleted) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    this.logger.log(`Variant ${variantId} deleted from product ${productId} by user ${userId}`);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async ensureUniqueCategorySlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    while (await this.catalogRepository.categorySlugExists(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  }

  private async ensureUniqueProductSlug(baseSlug: string, excludeProductId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    let exists = await this.catalogRepository.productSlugExists(slug);
    if (exists && excludeProductId) {
      const existingProduct = await this.catalogRepository.findProductBySlug(slug);
      if (existingProduct && existingProduct.id === excludeProductId) {
        return slug;
      }
    }

    while (exists) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      exists = await this.catalogRepository.productSlugExists(slug);
      if (exists && excludeProductId) {
        const existingProduct = await this.catalogRepository.findProductBySlug(slug);
        if (existingProduct && existingProduct.id === excludeProductId) {
          return slug;
        }
      }
    }

    return slug;
  }

  private async validateVendorOwnership(productId: string, userVendorId: string | null): Promise<void> {
    if (!userVendorId) {
      throw new ForbiddenException('You must be associated with a vendor to manage products');
    }

    const storeId = await this.catalogRepository.getProductStoreId(productId);
    if (!storeId) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // In a full implementation, we would cross-check store_id against
    // the vendor service to confirm this vendor owns the store.
    // For now we log the validation.
    this.logger.debug(
      `Vendor ownership check: vendor=${userVendorId}, store=${storeId}, product=${productId}`,
    );
  }

  private indexProductAsync(product: ProductEntity): void {
    this.elasticsearchService.indexProduct(product).catch((err: Error) => {
      this.logger.error(`Async ES index failed for product ${product.id}: ${err.message}`);
    });
  }

  private removeProductFromIndexAsync(productId: string): void {
    this.elasticsearchService.removeProduct(productId).catch((err: Error) => {
      this.logger.error(`Async ES remove failed for product ${productId}: ${err.message}`);
    });
  }

  private async invalidateCategoryTreeCache(): Promise<void> {
    await this.redisService.del(CATEGORY_TREE_CACHE_KEY);
    this.logger.debug('Category tree cache invalidated');
  }

  private async publishProductEvent(eventType: string, product: ProductEntity): Promise<void> {
    const eventData: ProductEventData = {
      product_id: product.id,
      store_id: product.store_id,
      category_id: product.category_id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode,
      base_price: Number(product.base_price),
      sale_price: product.sale_price ? Number(product.sale_price) : null,
      is_active: product.is_active,
    };

    try {
      await this.kafkaProducer.publish(KAFKA_TOPIC, eventType, eventData);
    } catch (error) {
      this.logger.error(
        `Failed to publish ${eventType} event for product ${product.id}: ${(error as Error).message}`,
      );
      // Do not throw -- event publishing failure should not block the request
    }
  }
}
