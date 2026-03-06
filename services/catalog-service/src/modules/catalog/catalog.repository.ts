import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
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
import { ProductQueryDto, ProductSortBy, SortOrder } from './dto/product-query.dto';

export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface CategoryTreeNode extends CategoryEntity {
  children: CategoryTreeNode[];
}

@Injectable()
export class CatalogRepository {
  private readonly logger = new Logger(CatalogRepository.name);

  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(ProductImageEntity)
    private readonly productImageRepo: Repository<ProductImageEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly productVariantRepo: Repository<ProductVariantEntity>,
  ) {}

  // ─── Category Methods ─────────────────────────────────────────────────

  async createCategory(dto: CreateCategoryDto, slug: string): Promise<CategoryEntity> {
    let level = 0;
    if (dto.parent_id) {
      const parent = await this.categoryRepo.findOne({
        where: { id: dto.parent_id },
        select: ['id', 'level'],
      });
      if (parent) {
        level = parent.level + 1;
      }
    }

    const category = this.categoryRepo.create({
      ...dto,
      slug,
      level,
      parent_id: dto.parent_id || null,
    });

    return this.categoryRepo.save(category);
  }

  async findCategoryById(id: string): Promise<CategoryEntity | null> {
    return this.categoryRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
  }

  async findCategoryBySlug(slug: string): Promise<CategoryEntity | null> {
    return this.categoryRepo.findOne({
      where: { slug },
      relations: ['children'],
    });
  }

  async findCategoryTree(): Promise<CategoryTreeNode[]> {
    const allCategories = await this.categoryRepo.find({
      where: { is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
    });

    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    for (const cat of allCategories) {
      categoryMap.set(cat.id, { ...cat, children: [] } as CategoryTreeNode);
    }

    for (const cat of allCategories) {
      const node = categoryMap.get(cat.id)!;
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        categoryMap.get(cat.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity | null> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) return null;

    if (dto.parent_id !== undefined) {
      if (dto.parent_id === null) {
        category.level = 0;
      } else {
        const parent = await this.categoryRepo.findOne({
          where: { id: dto.parent_id },
          select: ['id', 'level'],
        });
        if (parent) {
          category.level = parent.level + 1;
        }
      }
    }

    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await this.categoryRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async categoryExists(id: string): Promise<boolean> {
    const count = await this.categoryRepo.count({ where: { id } });
    return count > 0;
  }

  async categorySlugExists(slug: string): Promise<boolean> {
    const count = await this.categoryRepo.count({ where: { slug } });
    return count > 0;
  }

  // ─── Product Methods ──────────────────────────────────────────────────

  async createProduct(dto: CreateProductDto, slug: string): Promise<ProductEntity> {
    const product = this.productRepo.create({
      ...dto,
      slug,
    });
    return this.productRepo.save(product);
  }

  async findProductById(id: string): Promise<ProductEntity | null> {
    return this.productRepo.findOne({
      where: { id },
      relations: ['category', 'images', 'variants'],
      order: {
        images: { sort_order: 'ASC' },
        variants: { name: 'ASC' },
      },
    });
  }

  async findProductBySlug(slug: string): Promise<ProductEntity | null> {
    return this.productRepo.findOne({
      where: { slug },
      relations: ['category', 'images', 'variants'],
      order: {
        images: { sort_order: 'ASC' },
        variants: { name: 'ASC' },
      },
    });
  }

  async findProducts(query: ProductQueryDto): Promise<CursorPaginatedResult<ProductEntity>> {
    const limit = query.limit ?? 20;
    const sortBy = query.sort_by ?? ProductSortBy.CREATED_AT;
    const sortOrder = query.sort_order ?? SortOrder.DESC;

    const qb: SelectQueryBuilder<ProductEntity> = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images', 'images.is_primary = :isPrimary', { isPrimary: true })
      .leftJoinAndSelect('product.category', 'category');

    // Apply filters
    if (query.store_id) {
      qb.andWhere('product.store_id = :storeId', { storeId: query.store_id });
    }

    if (query.category_id) {
      // Include products from child categories so clicking a parent category
      // also returns products assigned to its sub-categories.
      qb.andWhere(
        '(product.category_id = :categoryId OR product.category_id IN ' +
        '(SELECT id FROM catalog.categories WHERE parent_id = :categoryId))',
        { categoryId: query.category_id },
      );
    }

    if (query.brand) {
      qb.andWhere('product.brand = :brand', { brand: query.brand });
    }

    if (query.brand_id) {
      qb.andWhere('product.brand_id = :brandId', { brandId: query.brand_id });
    }

    if (query.min_price !== undefined) {
      qb.andWhere('product.base_price >= :minPrice', { minPrice: query.min_price });
    }

    if (query.max_price !== undefined) {
      qb.andWhere('product.base_price <= :maxPrice', { maxPrice: query.max_price });
    }

    if (query.is_active !== undefined) {
      qb.andWhere('product.is_active = :isActive', { isActive: query.is_active });
    }

    if (query.search) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Cursor-based pagination using composite cursor (created_at + id)
    if (query.cursor) {
      const decodedCursor = this.decodeCursor(query.cursor);
      if (decodedCursor) {
        const { created_at, id } = decodedCursor;
        if (sortOrder === SortOrder.DESC) {
          qb.andWhere(
            `(product.${sortBy} < :cursorSort OR (product.${sortBy} = :cursorSort AND product.id < :cursorId))`,
            { cursorSort: sortBy === ProductSortBy.CREATED_AT ? created_at : created_at, cursorId: id },
          );
        } else {
          qb.andWhere(
            `(product.${sortBy} > :cursorSort OR (product.${sortBy} = :cursorSort AND product.id > :cursorId))`,
            { cursorSort: sortBy === ProductSortBy.CREATED_AT ? created_at : created_at, cursorId: id },
          );
        }
      }
    }

    qb.orderBy(`product.${sortBy}`, sortOrder)
      .addOrderBy('product.id', sortOrder)
      .take(limit + 1);

    const items = await qb.getMany();
    const hasMore = items.length > limit;

    if (hasMore) {
      items.pop();
    }

    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
      ? this.encodeCursor(lastItem.created_at.toISOString(), lastItem.id)
      : null;

    return { items, nextCursor, hasMore };
  }

  async findProductsByStoreId(
    storeId: string,
    query: ProductQueryDto,
  ): Promise<CursorPaginatedResult<ProductEntity>> {
    return this.findProducts({ ...query, store_id: storeId });
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<ProductEntity | null> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) return null;
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await this.productRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async productExists(id: string): Promise<boolean> {
    const count = await this.productRepo.count({ where: { id } });
    return count > 0;
  }

  async productSlugExists(slug: string): Promise<boolean> {
    const count = await this.productRepo.count({ where: { slug } });
    return count > 0;
  }

  async getProductStoreId(productId: string): Promise<string | null> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      select: ['id', 'store_id'],
    });
    return product?.store_id ?? null;
  }

  // ─── Product Image Methods ────────────────────────────────────────────

  async createImage(productId: string, dto: CreateProductImageDto): Promise<ProductImageEntity> {
    if (dto.is_primary) {
      await this.productImageRepo.update(
        { product_id: productId },
        { is_primary: false },
      );
    }

    const image = this.productImageRepo.create({
      ...dto,
      product_id: productId,
    });
    return this.productImageRepo.save(image);
  }

  async findImagesByProductId(productId: string): Promise<ProductImageEntity[]> {
    return this.productImageRepo.find({
      where: { product_id: productId },
      order: { sort_order: 'ASC' },
    });
  }

  async findImageById(imageId: string): Promise<ProductImageEntity | null> {
    return this.productImageRepo.findOne({ where: { id: imageId } });
  }

  async updateImage(imageId: string, dto: Partial<ProductImageEntity>): Promise<ProductImageEntity | null> {
    const image = await this.productImageRepo.findOne({ where: { id: imageId } });
    if (!image) return null;
    Object.assign(image, dto);
    return this.productImageRepo.save(image);
  }

  async deleteImage(imageId: string): Promise<boolean> {
    const result = await this.productImageRepo.delete(imageId);
    return (result.affected ?? 0) > 0;
  }

  async setPrimaryImage(productId: string, imageId: string): Promise<ProductImageEntity | null> {
    await this.productImageRepo.update(
      { product_id: productId },
      { is_primary: false },
    );

    const image = await this.productImageRepo.findOne({
      where: { id: imageId, product_id: productId },
    });
    if (!image) return null;

    image.is_primary = true;
    return this.productImageRepo.save(image);
  }

  // ─── Product Variant Methods ──────────────────────────────────────────

  async createVariant(productId: string, dto: CreateProductVariantDto): Promise<ProductVariantEntity> {
    const variant = this.productVariantRepo.create({
      ...dto,
      product_id: productId,
    });
    return this.productVariantRepo.save(variant);
  }

  async findVariantsByProductId(productId: string): Promise<ProductVariantEntity[]> {
    return this.productVariantRepo.find({
      where: { product_id: productId },
      order: { name: 'ASC' },
    });
  }

  async findVariantById(variantId: string): Promise<ProductVariantEntity | null> {
    return this.productVariantRepo.findOne({ where: { id: variantId } });
  }

  async updateVariant(variantId: string, dto: UpdateProductVariantDto): Promise<ProductVariantEntity | null> {
    const variant = await this.productVariantRepo.findOne({ where: { id: variantId } });
    if (!variant) return null;
    Object.assign(variant, dto);
    return this.productVariantRepo.save(variant);
  }

  async deleteVariant(variantId: string): Promise<boolean> {
    const result = await this.productVariantRepo.delete(variantId);
    return (result.affected ?? 0) > 0;
  }

  // ─── Indexing Helpers ────────────────────────────────────────────────

  async findAllProductsForIndexing(): Promise<ProductEntity[]> {
    return this.productRepo.find({
      where: { is_active: true },
      relations: ['category', 'images'],
      order: { created_at: 'ASC' },
    });
  }

  // ─── Cursor Helpers ───────────────────────────────────────────────────

  private encodeCursor(createdAt: string, id: string): string {
    const payload = JSON.stringify({ created_at: createdAt, id });
    return Buffer.from(payload).toString('base64');
  }

  private decodeCursor(cursor: string): { created_at: string; id: string } | null {
    try {
      const payload = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(payload);
      if (parsed.created_at && parsed.id) {
        return { created_at: parsed.created_at, id: parsed.id };
      }
      return null;
    } catch {
      this.logger.warn(`Invalid cursor format: ${cursor}`);
      return null;
    }
  }
}
