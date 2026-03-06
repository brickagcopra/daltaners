import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CatalogService } from '../catalog.service';
import { CatalogRepository, CursorPaginatedResult } from '../catalog.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { CategoryEntity } from '../entities/category.entity';
import { ProductEntity } from '../entities/product.entity';
import { ProductImageEntity } from '../entities/product-image.entity';
import { ProductVariantEntity } from '../entities/product-variant.entity';
import { ElasticsearchService } from '../elasticsearch.service';
import { CATALOG_EVENTS, KAFKA_TOPIC } from '../events/catalog.events';

describe('CatalogService', () => {
  let service: CatalogService;
  let repository: jest.Mocked<CatalogRepository>;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;
  let elasticsearchService: jest.Mocked<ElasticsearchService>;

  const mockCategory: Partial<CategoryEntity> = {
    id: 'cat-uuid-1',
    parent_id: null,
    name: 'Groceries',
    slug: 'groceries',
    icon_url: null,
    sort_order: 0,
    is_active: true,
    level: 0,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const mockProduct: Partial<ProductEntity> = {
    id: 'prod-uuid-1',
    store_id: 'store-uuid-1',
    category_id: 'cat-uuid-1',
    name: 'San Miguel Beer',
    slug: 'san-miguel-beer',
    description: 'Classic Filipino beer',
    sku: 'SMB-001',
    barcode: '1234567890123',
    brand: 'San Miguel',
    base_price: 65,
    sale_price: null,
    is_active: true,
    is_featured: false,
    metadata: {},
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const mockImage: Partial<ProductImageEntity> = {
    id: 'img-uuid-1',
    product_id: 'prod-uuid-1',
    url: 'https://cdn.daltaners.com/products/smb.jpg',
    thumbnail_url: 'https://cdn.daltaners.com/products/smb-thumb.jpg',
    alt_text: 'San Miguel Beer',
    sort_order: 0,
    is_primary: true,
  };

  const mockVariant: Partial<ProductVariantEntity> = {
    id: 'var-uuid-1',
    product_id: 'prod-uuid-1',
    name: '330ml Bottle',
    sku: 'SMB-330',
    price_adjustment: 0,
    stock_quantity: 100,
    is_active: true,
    attributes: { size: '330ml', type: 'bottle' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: CatalogRepository,
          useValue: {
            createCategory: jest.fn(),
            findCategoryById: jest.fn(),
            findCategoryTree: jest.fn(),
            updateCategory: jest.fn(),
            deleteCategory: jest.fn(),
            categoryExists: jest.fn(),
            categorySlugExists: jest.fn(),
            createProduct: jest.fn(),
            findProductById: jest.fn(),
            findProductBySlug: jest.fn(),
            findProducts: jest.fn(),
            findProductsByStoreId: jest.fn(),
            updateProduct: jest.fn(),
            deleteProduct: jest.fn(),
            productExists: jest.fn(),
            productSlugExists: jest.fn(),
            getProductStoreId: jest.fn(),
            createImage: jest.fn(),
            findImageById: jest.fn(),
            deleteImage: jest.fn(),
            setPrimaryImage: jest.fn(),
            createVariant: jest.fn(),
            findVariantById: jest.fn(),
            updateVariant: jest.fn(),
            deleteVariant: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: ElasticsearchService,
          useValue: {
            indexProduct: jest.fn().mockResolvedValue(undefined),
            removeProduct: jest.fn().mockResolvedValue(undefined),
            isAvailable: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    repository = module.get(CatalogRepository) as jest.Mocked<CatalogRepository>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
    kafkaProducer = module.get(KafkaProducerService) as jest.Mocked<KafkaProducerService>;
    elasticsearchService = module.get(ElasticsearchService) as jest.Mocked<ElasticsearchService>;
  });

  // ============================================================
  // Category Operations
  // ============================================================

  describe('createCategory', () => {
    const createDto = { name: 'Groceries', icon_url: null, sort_order: 0, is_active: true };

    it('should create category with unique slug', async () => {
      repository.categorySlugExists.mockResolvedValue(false);
      repository.createCategory.mockResolvedValue(mockCategory as CategoryEntity);
      redisService.del.mockResolvedValue();

      const result = await service.createCategory(createDto as any);

      expect(result).toEqual(mockCategory);
      expect(repository.createCategory).toHaveBeenCalledWith(createDto, 'groceries');
      expect(redisService.del).toHaveBeenCalledWith('catalog:categories:tree');
    });

    it('should generate unique slug when slug already exists', async () => {
      repository.categorySlugExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      repository.createCategory.mockResolvedValue(mockCategory as CategoryEntity);
      redisService.del.mockResolvedValue();

      await service.createCategory(createDto as any);

      expect(repository.createCategory).toHaveBeenCalledWith(createDto, 'groceries-1');
    });

    it('should validate parent category exists when parent_id provided', async () => {
      const dtoWithParent = { ...createDto, parent_id: 'parent-uuid-1' };
      repository.categorySlugExists.mockResolvedValue(false);
      repository.categoryExists.mockResolvedValue(true);
      repository.createCategory.mockResolvedValue(mockCategory as CategoryEntity);
      redisService.del.mockResolvedValue();

      await service.createCategory(dtoWithParent as any);

      expect(repository.categoryExists).toHaveBeenCalledWith('parent-uuid-1');
    });

    it('should throw NotFoundException when parent category does not exist', async () => {
      const dtoWithParent = { ...createDto, parent_id: 'invalid-uuid' };
      repository.categorySlugExists.mockResolvedValue(false);
      repository.categoryExists.mockResolvedValue(false);

      await expect(service.createCategory(dtoWithParent as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategoryTree', () => {
    const mockTree = [{ id: 'cat-uuid-1', name: 'Groceries', children: [] }];

    it('should return cached category tree when available', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockTree));

      const result = await service.getCategoryTree();

      expect(result).toEqual(mockTree);
      expect(repository.findCategoryTree).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when not cached', async () => {
      redisService.get.mockResolvedValue(null);
      repository.findCategoryTree.mockResolvedValue(mockTree as any);
      redisService.set.mockResolvedValue();

      const result = await service.getCategoryTree();

      expect(result).toEqual(mockTree);
      expect(repository.findCategoryTree).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalledWith(
        'catalog:categories:tree',
        JSON.stringify(mockTree),
        3600,
      );
    });
  });

  describe('getCategoryById', () => {
    it('should return category when found', async () => {
      repository.findCategoryById.mockResolvedValue(mockCategory as CategoryEntity);

      const result = await service.getCategoryById('cat-uuid-1');
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      repository.findCategoryById.mockResolvedValue(null);

      await expect(service.getCategoryById('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCategory', () => {
    const updateDto = { name: 'Updated Groceries' };

    it('should update category successfully', async () => {
      const updatedCategory = { ...mockCategory, name: 'Updated Groceries' };
      repository.updateCategory.mockResolvedValue(updatedCategory as CategoryEntity);
      redisService.del.mockResolvedValue();

      const result = await service.updateCategory('cat-uuid-1', updateDto as any);

      expect(result).toEqual(updatedCategory);
      expect(redisService.del).toHaveBeenCalledWith('catalog:categories:tree');
    });

    it('should throw NotFoundException when category not found', async () => {
      repository.updateCategory.mockResolvedValue(null);

      await expect(
        service.updateCategory('invalid-uuid', updateDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when setting parent_id to self', async () => {
      const selfParentDto = { parent_id: 'cat-uuid-1' };

      await expect(
        service.updateCategory('cat-uuid-1', selfParentDto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category and invalidate cache', async () => {
      repository.deleteCategory.mockResolvedValue(true);
      redisService.del.mockResolvedValue();

      await service.deleteCategory('cat-uuid-1');

      expect(repository.deleteCategory).toHaveBeenCalledWith('cat-uuid-1');
      expect(redisService.del).toHaveBeenCalledWith('catalog:categories:tree');
    });

    it('should throw NotFoundException when category not found', async () => {
      repository.deleteCategory.mockResolvedValue(false);

      await expect(service.deleteCategory('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // Product Operations
  // ============================================================

  describe('createProduct', () => {
    const createDto = {
      name: 'San Miguel Beer',
      store_id: 'store-uuid-1',
      category_id: 'cat-uuid-1',
      base_price: 65,
    };
    const userId = 'user-uuid-1';
    const vendorId = 'vendor-uuid-1';

    it('should create product with unique slug and publish event', async () => {
      repository.categoryExists.mockResolvedValue(true);
      repository.productSlugExists.mockResolvedValue(false);
      repository.createProduct.mockResolvedValue(mockProduct as ProductEntity);
      kafkaProducer.publish.mockResolvedValue();

      const result = await service.createProduct(createDto as any, userId, vendorId);

      expect(result).toEqual(mockProduct);
      expect(repository.createProduct).toHaveBeenCalledWith(createDto, 'san-miguel-beer');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        KAFKA_TOPIC,
        CATALOG_EVENTS.PRODUCT_CREATED,
        expect.objectContaining({ product_id: 'prod-uuid-1' }),
      );
    });

    it('should throw NotFoundException when category does not exist', async () => {
      repository.categoryExists.mockResolvedValue(false);

      await expect(
        service.createProduct(createDto as any, userId, vendorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate unique slug when slug already exists', async () => {
      repository.categoryExists.mockResolvedValue(true);
      repository.productSlugExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      repository.createProduct.mockResolvedValue(mockProduct as ProductEntity);
      kafkaProducer.publish.mockResolvedValue();

      await service.createProduct(createDto as any, userId, vendorId);

      expect(repository.createProduct).toHaveBeenCalledWith(createDto, 'san-miguel-beer-1');
    });

    it('should not throw when Kafka publish fails', async () => {
      repository.categoryExists.mockResolvedValue(true);
      repository.productSlugExists.mockResolvedValue(false);
      repository.createProduct.mockResolvedValue(mockProduct as ProductEntity);
      kafkaProducer.publish.mockRejectedValue(new Error('Kafka down'));

      const result = await service.createProduct(createDto as any, userId, vendorId);

      expect(result).toEqual(mockProduct);
    });
  });

  describe('getProductById', () => {
    it('should return product when found', async () => {
      repository.findProductById.mockResolvedValue(mockProduct as ProductEntity);

      const result = await service.getProductById('prod-uuid-1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findProductById.mockResolvedValue(null);

      await expect(service.getProductById('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProductBySlug', () => {
    it('should return product when found', async () => {
      repository.findProductBySlug.mockResolvedValue(mockProduct as ProductEntity);

      const result = await service.getProductBySlug('san-miguel-beer');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findProductBySlug.mockResolvedValue(null);

      await expect(service.getProductBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProducts', () => {
    it('should delegate to repository with query', async () => {
      const query = { limit: 10 };
      const mockResult: CursorPaginatedResult<ProductEntity> = {
        items: [mockProduct as ProductEntity],
        nextCursor: null,
        hasMore: false,
      };
      repository.findProducts.mockResolvedValue(mockResult);

      const result = await service.getProducts(query as any);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getProductsByStoreId', () => {
    it('should delegate to repository with store ID and query', async () => {
      const query = { limit: 10 };
      const mockResult: CursorPaginatedResult<ProductEntity> = {
        items: [mockProduct as ProductEntity],
        nextCursor: null,
        hasMore: false,
      };
      repository.findProductsByStoreId.mockResolvedValue(mockResult);

      const result = await service.getProductsByStoreId('store-uuid-1', query as any);
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateProduct', () => {
    const updateDto = { name: 'Updated San Miguel' };
    const userId = 'user-uuid-1';

    it('should update product as admin without ownership check', async () => {
      repository.findProductById
        .mockResolvedValueOnce(mockProduct as ProductEntity)
        .mockResolvedValueOnce({ ...mockProduct, name: 'Updated San Miguel' } as ProductEntity);
      repository.updateProduct.mockResolvedValue(mockProduct as ProductEntity);
      kafkaProducer.publish.mockResolvedValue();

      const result = await service.updateProduct('prod-uuid-1', updateDto as any, userId, 'admin', null);

      expect(result.name).toBe('Updated San Miguel');
      expect(repository.getProductStoreId).not.toHaveBeenCalled();
    });

    it('should validate vendor ownership for non-admin users', async () => {
      repository.findProductById
        .mockResolvedValueOnce(mockProduct as ProductEntity)
        .mockResolvedValueOnce(mockProduct as ProductEntity);
      repository.getProductStoreId.mockResolvedValue('store-uuid-1');
      repository.updateProduct.mockResolvedValue(mockProduct as ProductEntity);
      kafkaProducer.publish.mockResolvedValue();

      await service.updateProduct('prod-uuid-1', updateDto as any, userId, 'vendor_owner', 'vendor-uuid-1');

      expect(repository.getProductStoreId).toHaveBeenCalledWith('prod-uuid-1');
    });

    it('should throw ForbiddenException when vendor has no vendor ID', async () => {
      repository.findProductById.mockResolvedValue(mockProduct as ProductEntity);

      await expect(
        service.updateProduct('prod-uuid-1', updateDto as any, userId, 'vendor_owner', null),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findProductById.mockResolvedValue(null);

      await expect(
        service.updateProduct('invalid-uuid', updateDto as any, userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when update returns null', async () => {
      repository.findProductById.mockResolvedValue(mockProduct as ProductEntity);
      repository.updateProduct.mockResolvedValue(null);

      await expect(
        service.updateProduct('prod-uuid-1', updateDto as any, userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate category when category_id is provided in update', async () => {
      const dtoWithCategory = { category_id: 'cat-uuid-2' };
      repository.findProductById.mockResolvedValue(mockProduct as ProductEntity);
      repository.categoryExists.mockResolvedValue(false);

      await expect(
        service.updateProduct('prod-uuid-1', dtoWithCategory as any, userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate new slug when name changes', async () => {
      const nameUpdateDto = { name: 'New Product Name' };
      repository.findProductById
        .mockResolvedValueOnce(mockProduct as ProductEntity)
        .mockResolvedValueOnce({ ...mockProduct, name: 'New Product Name' } as ProductEntity);
      repository.productSlugExists.mockResolvedValue(false);
      repository.updateProduct.mockResolvedValue(mockProduct as ProductEntity);
      kafkaProducer.publish.mockResolvedValue();

      await service.updateProduct('prod-uuid-1', nameUpdateDto as any, userId, 'admin', null);

      expect(repository.updateProduct).toHaveBeenCalledWith(
        'prod-uuid-1',
        expect.objectContaining({ slug: 'new-product-name' }),
      );
    });

    it('should publish PRODUCT_UPDATED event', async () => {
      repository.findProductById
        .mockResolvedValueOnce(mockProduct as ProductEntity)
        .mockResolvedValueOnce(mockProduct as ProductEntity);
      repository.updateProduct.mockResolvedValue(mockProduct as ProductEntity);
      kafkaProducer.publish.mockResolvedValue();

      await service.updateProduct('prod-uuid-1', updateDto as any, userId, 'admin', null);

      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        KAFKA_TOPIC,
        CATALOG_EVENTS.PRODUCT_UPDATED,
        expect.objectContaining({ product_id: 'prod-uuid-1' }),
      );
    });
  });

  describe('deleteProduct', () => {
    const userId = 'user-uuid-1';

    it('should delete product as admin', async () => {
      repository.findProductById.mockResolvedValue(mockProduct as ProductEntity);
      repository.deleteProduct.mockResolvedValue(true);

      await service.deleteProduct('prod-uuid-1', userId, 'admin', null);

      expect(repository.findProductById).toHaveBeenCalledWith('prod-uuid-1');
      expect(repository.deleteProduct).toHaveBeenCalledWith('prod-uuid-1');
    });

    it('should validate vendor ownership for non-admin', async () => {
      repository.findProductById.mockResolvedValue(mockProduct as ProductEntity);
      repository.getProductStoreId.mockResolvedValue('store-uuid-1');
      repository.deleteProduct.mockResolvedValue(true);

      await service.deleteProduct('prod-uuid-1', userId, 'vendor_owner', 'vendor-uuid-1');

      expect(repository.getProductStoreId).toHaveBeenCalledWith('prod-uuid-1');
    });

    it('should throw ForbiddenException when vendor has no vendor ID', async () => {
      repository.findProductById.mockResolvedValue(mockProduct as ProductEntity);

      await expect(
        service.deleteProduct('prod-uuid-1', userId, 'vendor_owner', null),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findProductById.mockResolvedValue(null);

      await expect(
        service.deleteProduct('invalid-uuid', userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove product from ES index and publish delete event', async () => {
      repository.findProductById.mockResolvedValue(mockProduct as ProductEntity);
      repository.deleteProduct.mockResolvedValue(true);

      await service.deleteProduct('prod-uuid-1', userId, 'admin', null);

      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        KAFKA_TOPIC,
        CATALOG_EVENTS.PRODUCT_DELETED,
        expect.objectContaining({ product_id: 'prod-uuid-1' }),
      );
    });
  });

  // ============================================================
  // Product Image Operations
  // ============================================================

  describe('addProductImage', () => {
    const imageDto = {
      url: 'https://cdn.daltaners.com/new.jpg',
      alt_text: 'New image',
      is_primary: false,
    };
    const userId = 'user-uuid-1';

    it('should add image to product', async () => {
      repository.productExists.mockResolvedValue(true);
      repository.createImage.mockResolvedValue(mockImage as ProductImageEntity);

      const result = await service.addProductImage('prod-uuid-1', imageDto as any, userId, 'admin', null);

      expect(result).toEqual(mockImage);
      expect(repository.createImage).toHaveBeenCalledWith('prod-uuid-1', imageDto);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.productExists.mockResolvedValue(false);

      await expect(
        service.addProductImage('invalid-uuid', imageDto as any, userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate vendor ownership for non-admin', async () => {
      repository.productExists.mockResolvedValue(true);
      repository.getProductStoreId.mockResolvedValue('store-uuid-1');
      repository.createImage.mockResolvedValue(mockImage as ProductImageEntity);

      await service.addProductImage('prod-uuid-1', imageDto as any, userId, 'vendor_owner', 'vendor-uuid-1');

      expect(repository.getProductStoreId).toHaveBeenCalledWith('prod-uuid-1');
    });
  });

  describe('removeProductImage', () => {
    const userId = 'user-uuid-1';

    it('should remove image from product', async () => {
      repository.findImageById.mockResolvedValue(mockImage as ProductImageEntity);
      repository.deleteImage.mockResolvedValue(true);

      await service.removeProductImage('prod-uuid-1', 'img-uuid-1', userId, 'admin', null);

      expect(repository.deleteImage).toHaveBeenCalledWith('img-uuid-1');
    });

    it('should throw NotFoundException when image not found', async () => {
      repository.findImageById.mockResolvedValue(null);

      await expect(
        service.removeProductImage('prod-uuid-1', 'invalid-uuid', userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when image belongs to different product', async () => {
      const wrongProductImage = { ...mockImage, product_id: 'other-product' };
      repository.findImageById.mockResolvedValue(wrongProductImage as ProductImageEntity);

      await expect(
        service.removeProductImage('prod-uuid-1', 'img-uuid-1', userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when delete returns false', async () => {
      repository.findImageById.mockResolvedValue(mockImage as ProductImageEntity);
      repository.deleteImage.mockResolvedValue(false);

      await expect(
        service.removeProductImage('prod-uuid-1', 'img-uuid-1', userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setPrimaryImage', () => {
    const userId = 'user-uuid-1';

    it('should set image as primary', async () => {
      const primaryImage = { ...mockImage, is_primary: true };
      repository.setPrimaryImage.mockResolvedValue(primaryImage as ProductImageEntity);

      const result = await service.setPrimaryImage('prod-uuid-1', 'img-uuid-1', userId, 'admin', null);

      expect(result.is_primary).toBe(true);
      expect(repository.setPrimaryImage).toHaveBeenCalledWith('prod-uuid-1', 'img-uuid-1');
    });

    it('should throw NotFoundException when image not found', async () => {
      repository.setPrimaryImage.mockResolvedValue(null);

      await expect(
        service.setPrimaryImage('prod-uuid-1', 'invalid-uuid', userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate vendor ownership for non-admin', async () => {
      repository.getProductStoreId.mockResolvedValue('store-uuid-1');
      repository.setPrimaryImage.mockResolvedValue(mockImage as ProductImageEntity);

      await service.setPrimaryImage('prod-uuid-1', 'img-uuid-1', userId, 'vendor_owner', 'vendor-uuid-1');

      expect(repository.getProductStoreId).toHaveBeenCalledWith('prod-uuid-1');
    });
  });

  // ============================================================
  // Product Variant Operations
  // ============================================================

  describe('addProductVariant', () => {
    const variantDto = {
      name: '330ml Bottle',
      sku: 'SMB-330',
      price_adjustment: 0,
      stock_quantity: 100,
    };
    const userId = 'user-uuid-1';

    it('should add variant to product', async () => {
      repository.productExists.mockResolvedValue(true);
      repository.createVariant.mockResolvedValue(mockVariant as ProductVariantEntity);

      const result = await service.addProductVariant('prod-uuid-1', variantDto as any, userId, 'admin', null);

      expect(result).toEqual(mockVariant);
      expect(repository.createVariant).toHaveBeenCalledWith('prod-uuid-1', variantDto);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.productExists.mockResolvedValue(false);

      await expect(
        service.addProductVariant('invalid-uuid', variantDto as any, userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate vendor ownership for non-admin', async () => {
      repository.productExists.mockResolvedValue(true);
      repository.getProductStoreId.mockResolvedValue('store-uuid-1');
      repository.createVariant.mockResolvedValue(mockVariant as ProductVariantEntity);

      await service.addProductVariant('prod-uuid-1', variantDto as any, userId, 'vendor_owner', 'vendor-uuid-1');

      expect(repository.getProductStoreId).toHaveBeenCalledWith('prod-uuid-1');
    });
  });

  describe('updateProductVariant', () => {
    const updateDto = { name: '500ml Bottle', price_adjustment: 15 };
    const userId = 'user-uuid-1';

    it('should update variant successfully', async () => {
      const updatedVariant = { ...mockVariant, name: '500ml Bottle', price_adjustment: 15 };
      repository.findVariantById.mockResolvedValue(mockVariant as ProductVariantEntity);
      repository.updateVariant.mockResolvedValue(updatedVariant as ProductVariantEntity);

      const result = await service.updateProductVariant(
        'prod-uuid-1', 'var-uuid-1', updateDto as any, userId, 'admin', null,
      );

      expect(result.name).toBe('500ml Bottle');
    });

    it('should throw NotFoundException when variant not found', async () => {
      repository.findVariantById.mockResolvedValue(null);

      await expect(
        service.updateProductVariant('prod-uuid-1', 'invalid-uuid', updateDto as any, userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when variant belongs to different product', async () => {
      const wrongProductVariant = { ...mockVariant, product_id: 'other-product' };
      repository.findVariantById.mockResolvedValue(wrongProductVariant as ProductVariantEntity);

      await expect(
        service.updateProductVariant('prod-uuid-1', 'var-uuid-1', updateDto as any, userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when update returns null', async () => {
      repository.findVariantById.mockResolvedValue(mockVariant as ProductVariantEntity);
      repository.updateVariant.mockResolvedValue(null);

      await expect(
        service.updateProductVariant('prod-uuid-1', 'var-uuid-1', updateDto as any, userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate vendor ownership for non-admin', async () => {
      repository.findVariantById.mockResolvedValue(mockVariant as ProductVariantEntity);
      repository.getProductStoreId.mockResolvedValue('store-uuid-1');
      repository.updateVariant.mockResolvedValue(mockVariant as ProductVariantEntity);

      await service.updateProductVariant(
        'prod-uuid-1', 'var-uuid-1', updateDto as any, userId, 'vendor_owner', 'vendor-uuid-1',
      );

      expect(repository.getProductStoreId).toHaveBeenCalledWith('prod-uuid-1');
    });
  });

  describe('deleteProductVariant', () => {
    const userId = 'user-uuid-1';

    it('should delete variant successfully', async () => {
      repository.findVariantById.mockResolvedValue(mockVariant as ProductVariantEntity);
      repository.deleteVariant.mockResolvedValue(true);

      await service.deleteProductVariant('prod-uuid-1', 'var-uuid-1', userId, 'admin', null);

      expect(repository.deleteVariant).toHaveBeenCalledWith('var-uuid-1');
    });

    it('should throw NotFoundException when variant not found', async () => {
      repository.findVariantById.mockResolvedValue(null);

      await expect(
        service.deleteProductVariant('prod-uuid-1', 'invalid-uuid', userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when variant belongs to different product', async () => {
      const wrongProductVariant = { ...mockVariant, product_id: 'other-product' };
      repository.findVariantById.mockResolvedValue(wrongProductVariant as ProductVariantEntity);

      await expect(
        service.deleteProductVariant('prod-uuid-1', 'var-uuid-1', userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when delete returns false', async () => {
      repository.findVariantById.mockResolvedValue(mockVariant as ProductVariantEntity);
      repository.deleteVariant.mockResolvedValue(false);

      await expect(
        service.deleteProductVariant('prod-uuid-1', 'var-uuid-1', userId, 'admin', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate vendor ownership for non-admin', async () => {
      repository.findVariantById.mockResolvedValue(mockVariant as ProductVariantEntity);
      repository.getProductStoreId.mockResolvedValue('store-uuid-1');
      repository.deleteVariant.mockResolvedValue(true);

      await service.deleteProductVariant('prod-uuid-1', 'var-uuid-1', userId, 'vendor_owner', 'vendor-uuid-1');

      expect(repository.getProductStoreId).toHaveBeenCalledWith('prod-uuid-1');
    });
  });
});
