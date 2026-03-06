import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService, ProductSearchDocument } from '../elasticsearch.service';
import { ProductEntity } from '../entities/product.entity';
import { ProductImageEntity } from '../entities/product-image.entity';
import { CategoryEntity } from '../entities/category.entity';

// Mock the @elastic/elasticsearch Client
const mockClient = {
  cluster: { health: jest.fn() },
  indices: {
    exists: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    refresh: jest.fn(),
  },
  index: jest.fn(),
  delete: jest.fn(),
  bulk: jest.fn(),
  search: jest.fn(),
};

jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
}));

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;

  const mockProduct: Partial<ProductEntity> = {
    id: 'prod-uuid-1',
    store_id: 'store-uuid-1',
    category_id: 'cat-uuid-1',
    name: 'Sinandomeng Rice 5kg',
    slug: 'sinandomeng-rice-5kg',
    description: 'Premium Filipino rice',
    short_description: 'Premium rice',
    sku: 'RICE-001',
    barcode: '1234567890123',
    brand: 'NFA Rice',
    base_price: 250,
    sale_price: 220,
    rating_average: 4.5,
    rating_count: 120,
    total_sold: 5000,
    dietary_tags: ['gluten-free'],
    allergens: [],
    is_active: true,
    is_featured: true,
    is_perishable: false,
    requires_prescription: false,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-15'),
    category: {
      id: 'cat-uuid-1',
      name: 'Rice & Grains',
      slug: 'rice-grains',
      parent_id: null,
      icon_url: null,
      sort_order: 0,
      is_active: true,
      level: 0,
      created_at: new Date(),
      updated_at: new Date(),
    } as CategoryEntity,
    images: [
      {
        id: 'img-uuid-1',
        product_id: 'prod-uuid-1',
        url: 'https://cdn.daltaners.com/rice.jpg',
        thumbnail_url: 'https://cdn.daltaners.com/rice-thumb.jpg',
        alt_text: 'Rice bag',
        sort_order: 0,
        is_primary: true,
      } as ProductImageEntity,
    ],
    variants: [],
  };

  const mockProduct2: Partial<ProductEntity> = {
    ...mockProduct,
    id: 'prod-uuid-2',
    name: 'Chicken Adobo',
    slug: 'chicken-adobo',
    brand: 'Kusina de Manila',
    base_price: 180,
    sale_price: null,
    category: { ...mockProduct.category!, name: 'Filipino Dishes' } as CategoryEntity,
    images: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock successful cluster health check
    mockClient.cluster.health.mockResolvedValue({
      cluster_name: 'daltaners-es-cluster',
      status: 'green',
    });
    mockClient.indices.exists.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                ELASTICSEARCH_NODE: 'http://localhost:9200',
                ELASTICSEARCH_ENABLED: 'true',
                ELASTICSEARCH_USERNAME: '',
                ELASTICSEARCH_PASSWORD: '',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ElasticsearchService>(ElasticsearchService);
  });

  // ============================================================
  // Initialization
  // ============================================================

  describe('onModuleInit', () => {
    it('should connect to Elasticsearch and check index', async () => {
      await service.onModuleInit();

      expect(mockClient.cluster.health).toHaveBeenCalled();
      expect(mockClient.indices.exists).toHaveBeenCalledWith({ index: 'daltaners_products' });
      expect(service.isAvailable()).toBe(true);
    });

    it('should create index if it does not exist', async () => {
      mockClient.indices.exists.mockResolvedValue(false);
      mockClient.indices.create.mockResolvedValue({});

      await service.onModuleInit();

      expect(mockClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'daltaners_products',
          body: expect.objectContaining({
            settings: expect.objectContaining({
              analysis: expect.objectContaining({
                analyzer: expect.objectContaining({
                  product_analyzer: expect.any(Object),
                  filipino_analyzer: expect.any(Object),
                  autocomplete_analyzer: expect.any(Object),
                }),
                filter: expect.objectContaining({
                  synonym_filter: expect.objectContaining({
                    type: 'synonym',
                    synonyms: expect.arrayContaining(['bigas, rice', 'gatas, milk, leche']),
                  }),
                  edge_ngram_filter: expect.objectContaining({
                    type: 'edge_ngram',
                    min_gram: 2,
                    max_gram: 15,
                  }),
                }),
              }),
            }),
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                name: expect.objectContaining({
                  type: 'text',
                  analyzer: 'product_analyzer',
                }),
                category_id: { type: 'keyword' },
                base_price: { type: 'float' },
              }),
            }),
          }),
        }),
      );
    });

    it('should disable service if connection fails', async () => {
      mockClient.cluster.health.mockRejectedValue(new Error('Connection refused'));

      await service.onModuleInit();

      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return false when disabled via config', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ElasticsearchService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                if (key === 'ELASTICSEARCH_ENABLED') return 'false';
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<ElasticsearchService>(ElasticsearchService);
      await disabledService.onModuleInit();

      expect(disabledService.isAvailable()).toBe(false);
    });
  });

  // ============================================================
  // Product Indexing
  // ============================================================

  describe('indexProduct', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should index a product document', async () => {
      mockClient.index.mockResolvedValue({ result: 'created' });

      await service.indexProduct(mockProduct as ProductEntity);

      expect(mockClient.index).toHaveBeenCalledWith({
        index: 'daltaners_products',
        id: 'prod-uuid-1',
        document: expect.objectContaining({
          id: 'prod-uuid-1',
          name: 'Sinandomeng Rice 5kg',
          store_id: 'store-uuid-1',
          category_id: 'cat-uuid-1',
          category_name: 'Rice & Grains',
          brand: 'NFA Rice',
          base_price: 250,
          sale_price: 220,
          rating_average: 4.5,
          dietary_tags: ['gluten-free'],
          is_active: true,
          image_url: 'https://cdn.daltaners.com/rice.jpg',
        }),
      });
    });

    it('should use first image if no primary image', async () => {
      mockClient.index.mockResolvedValue({ result: 'created' });
      const productNoPrimary = {
        ...mockProduct,
        images: [{ ...mockProduct.images![0], is_primary: false }],
      };

      await service.indexProduct(productNoPrimary as ProductEntity);

      expect(mockClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            image_url: 'https://cdn.daltaners.com/rice.jpg',
          }),
        }),
      );
    });

    it('should set image_url to null if no images', async () => {
      mockClient.index.mockResolvedValue({ result: 'created' });

      await service.indexProduct(mockProduct2 as ProductEntity);

      expect(mockClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            image_url: null,
          }),
        }),
      );
    });

    it('should not throw on index failure', async () => {
      mockClient.index.mockRejectedValue(new Error('Index failed'));

      await expect(service.indexProduct(mockProduct as ProductEntity)).resolves.toBeUndefined();
    });

    it('should skip indexing when disabled', async () => {
      mockClient.cluster.health.mockRejectedValue(new Error('Connection refused'));
      await service.onModuleInit();

      await service.indexProduct(mockProduct as ProductEntity);

      expect(mockClient.index).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Remove Product
  // ============================================================

  describe('removeProduct', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should remove a product from index', async () => {
      mockClient.delete.mockResolvedValue({ result: 'deleted' });

      await service.removeProduct('prod-uuid-1');

      expect(mockClient.delete).toHaveBeenCalledWith({
        index: 'daltaners_products',
        id: 'prod-uuid-1',
      });
    });

    it('should handle 404 (already removed) gracefully', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).meta = { statusCode: 404 };
      mockClient.delete.mockRejectedValue(notFoundError);

      await expect(service.removeProduct('prod-uuid-1')).resolves.toBeUndefined();
    });

    it('should not throw on other delete errors', async () => {
      const error = new Error('Server error');
      (error as any).meta = { statusCode: 500 };
      mockClient.delete.mockRejectedValue(error);

      await expect(service.removeProduct('prod-uuid-1')).resolves.toBeUndefined();
    });

    it('should skip when disabled', async () => {
      mockClient.cluster.health.mockRejectedValue(new Error('Connection refused'));
      await service.onModuleInit();

      await service.removeProduct('prod-uuid-1');

      expect(mockClient.delete).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Bulk Index
  // ============================================================

  describe('bulkIndex', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should bulk index products', async () => {
      mockClient.bulk.mockResolvedValue({ errors: false, items: [{}, {}] });
      mockClient.indices.refresh.mockResolvedValue({});

      const result = await service.bulkIndex([
        mockProduct as ProductEntity,
        mockProduct2 as ProductEntity,
      ]);

      expect(result.indexed).toBe(2);
      expect(result.errors).toBe(0);
      expect(mockClient.bulk).toHaveBeenCalledWith({
        operations: expect.arrayContaining([
          { index: { _index: 'daltaners_products', _id: 'prod-uuid-1' } },
          expect.objectContaining({ name: 'Sinandomeng Rice 5kg' }),
        ]),
        refresh: false,
      });
      expect(mockClient.indices.refresh).toHaveBeenCalledWith({ index: 'daltaners_products' });
    });

    it('should handle partial bulk failures', async () => {
      mockClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          { index: { _id: 'prod-uuid-1', status: 201 } },
          { index: { _id: 'prod-uuid-2', error: { type: 'mapper_parsing_exception' } } },
        ],
      });
      mockClient.indices.refresh.mockResolvedValue({});

      const result = await service.bulkIndex([
        mockProduct as ProductEntity,
        mockProduct2 as ProductEntity,
      ]);

      expect(result.indexed).toBe(1);
      expect(result.errors).toBe(1);
    });

    it('should return zeros for empty array', async () => {
      const result = await service.bulkIndex([]);

      expect(result).toEqual({ indexed: 0, errors: 0 });
      expect(mockClient.bulk).not.toHaveBeenCalled();
    });

    it('should handle full batch failure', async () => {
      mockClient.bulk.mockRejectedValue(new Error('Bulk failed'));
      mockClient.indices.refresh.mockResolvedValue({});

      const result = await service.bulkIndex([mockProduct as ProductEntity]);

      expect(result.errors).toBe(1);
      expect(result.indexed).toBe(0);
    });
  });

  // ============================================================
  // Search
  // ============================================================

  describe('search', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    const mockSearchResponse = {
      hits: {
        total: { value: 2 },
        hits: [
          { _source: { id: 'prod-uuid-1', name: 'Sinandomeng Rice', base_price: 250 } },
          { _source: { id: 'prod-uuid-2', name: 'Jasmine Rice', base_price: 280 } },
        ],
      },
      aggregations: {
        categories: { buckets: [{ key: 'Rice & Grains', doc_count: 2 }] },
        brands: { buckets: [{ key: 'NFA Rice', doc_count: 1 }] },
        price_range: { min: 250, max: 280, avg: 265 },
        dietary_tags: { buckets: [] },
      },
    };

    it('should search with text query', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      const result = await service.search({ query: 'rice' });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'daltaners_products',
          body: expect.objectContaining({
            query: {
              bool: {
                must: [
                  expect.objectContaining({
                    multi_match: expect.objectContaining({
                      query: 'rice',
                      fuzziness: 'AUTO',
                    }),
                  }),
                ],
                filter: expect.arrayContaining([{ term: { is_active: true } }]),
              },
            },
          }),
        }),
      );
    });

    it('should search with category filter', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      await service.search({ category_id: 'cat-uuid-1' });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: {
              bool: {
                must: [{ match_all: {} }],
                filter: expect.arrayContaining([
                  { term: { is_active: true } },
                  { term: { category_id: 'cat-uuid-1' } },
                ]),
              },
            },
          }),
        }),
      );
    });

    it('should search with price range filter', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      await service.search({ min_price: 100, max_price: 500 });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: {
              bool: {
                must: [{ match_all: {} }],
                filter: expect.arrayContaining([
                  { range: { base_price: { gte: 100, lte: 500 } } },
                ]),
              },
            },
          }),
        }),
      );
    });

    it('should search with brand and store filters', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      await service.search({ brand: 'NFA Rice', store_id: 'store-uuid-1' });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: {
              bool: {
                must: [{ match_all: {} }],
                filter: expect.arrayContaining([
                  { term: { brand: 'NFA Rice' } },
                  { term: { store_id: 'store-uuid-1' } },
                ]),
              },
            },
          }),
        }),
      );
    });

    it('should search with dietary_tags filter', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      await service.search({ dietary_tags: ['halal', 'gluten-free'] });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: {
              bool: {
                must: [{ match_all: {} }],
                filter: expect.arrayContaining([
                  { terms: { dietary_tags: ['halal', 'gluten-free'] } },
                ]),
              },
            },
          }),
        }),
      );
    });

    it('should respect pagination params', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      await service.search({ from: 20, size: 10 });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ from: 20, size: 10 }),
        }),
      );
    });

    it('should return aggregations', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      const result = await service.search({ query: 'rice' });

      expect(result.aggregations).toBeDefined();
      expect(result.aggregations).toHaveProperty('categories');
      expect(result.aggregations).toHaveProperty('brands');
      expect(result.aggregations).toHaveProperty('price_range');
    });

    it('should return empty results on search failure', async () => {
      mockClient.search.mockRejectedValue(new Error('Search failed'));

      const result = await service.search({ query: 'rice' });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return empty results when disabled', async () => {
      mockClient.cluster.health.mockRejectedValue(new Error('Connection refused'));
      await service.onModuleInit();

      const result = await service.search({ query: 'rice' });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(mockClient.search).not.toHaveBeenCalled();
    });

    it('should handle numeric total in hits', async () => {
      mockClient.search.mockResolvedValue({
        hits: {
          total: 5,
          hits: [{ _source: { id: 'p1' } }],
        },
        aggregations: {},
      });

      const result = await service.search({ query: 'test' });

      expect(result.total).toBe(5);
    });
  });

  // ============================================================
  // Suggest / Autocomplete
  // ============================================================

  describe('suggest', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return autocomplete suggestions', async () => {
      mockClient.search.mockResolvedValue({
        hits: {
          hits: [
            { _source: { name: 'Sinandomeng Rice 5kg' } },
            { _source: { name: 'Sinandomeng Rice 10kg' } },
          ],
        },
      });

      const result = await service.suggest('sinan', 5);

      expect(result.suggestions).toEqual([
        'Sinandomeng Rice 5kg',
        'Sinandomeng Rice 10kg',
      ]);
      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: {
              bool: {
                must: [{ match: { 'name.autocomplete': { query: 'sinan' } } }],
                filter: [{ term: { is_active: true } }],
              },
            },
            _source: ['name', 'brand', 'category_name'],
            size: 5,
            collapse: { field: 'name.exact' },
          }),
        }),
      );
    });

    it('should return empty for empty query', async () => {
      const result = await service.suggest('');

      expect(result.suggestions).toEqual([]);
      expect(mockClient.search).not.toHaveBeenCalled();
    });

    it('should return empty on failure', async () => {
      mockClient.search.mockRejectedValue(new Error('Search failed'));

      const result = await service.suggest('rice');

      expect(result.suggestions).toEqual([]);
    });
  });

  // ============================================================
  // Reindex
  // ============================================================

  describe('reindex', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should delete and recreate the index', async () => {
      mockClient.indices.exists.mockResolvedValue(true);
      mockClient.indices.delete.mockResolvedValue({});
      mockClient.indices.create.mockResolvedValue({});

      await service.reindex();

      expect(mockClient.indices.delete).toHaveBeenCalledWith({ index: 'daltaners_products' });
      expect(mockClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'daltaners_products' }),
      );
    });
  });

  describe('deleteIndex', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should delete index if it exists', async () => {
      mockClient.indices.exists.mockResolvedValue(true);
      mockClient.indices.delete.mockResolvedValue({});

      await service.deleteIndex();

      expect(mockClient.indices.delete).toHaveBeenCalledWith({ index: 'daltaners_products' });
    });

    it('should skip if index does not exist', async () => {
      mockClient.indices.exists.mockResolvedValue(false);

      await service.deleteIndex();

      expect(mockClient.indices.delete).not.toHaveBeenCalled();
    });

    it('should propagate delete errors', async () => {
      mockClient.indices.exists.mockResolvedValue(true);
      mockClient.indices.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteIndex()).rejects.toThrow('Delete failed');
    });
  });
});
