import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { ProductEntity } from './entities/product.entity';

const INDEX_NAME = 'daltaners_products';

export interface ProductSearchDocument {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  category_id: string;
  category_name: string | null;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  slug: string;
  base_price: number;
  sale_price: number | null;
  rating_average: number;
  rating_count: number;
  total_sold: number;
  dietary_tags: string[];
  allergens: string[];
  is_active: boolean;
  is_featured: boolean;
  is_perishable: boolean;
  requires_prescription: boolean;
  image_url: string | null;
  updated_at: string;
}

export interface SearchResult {
  items: ProductSearchDocument[];
  total: number;
  aggregations?: Record<string, unknown>;
}

export interface SuggestResult {
  suggestions: string[];
}

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;
  private enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const node = this.configService.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200');
    this.enabled = this.configService.get<string>('ELASTICSEARCH_ENABLED', 'true') !== 'false';

    this.client = new Client({
      node,
      auth: {
        username: this.configService.get<string>('ELASTICSEARCH_USERNAME', ''),
        password: this.configService.get<string>('ELASTICSEARCH_PASSWORD', ''),
      },
      requestTimeout: 10000,
      maxRetries: 3,
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Elasticsearch is disabled via ELASTICSEARCH_ENABLED=false');
      return;
    }

    try {
      const health = await this.client.cluster.health();
      this.logger.log(`Elasticsearch cluster: ${health.cluster_name} (status: ${health.status})`);
      await this.ensureIndex();
    } catch (error) {
      this.logger.error(`Elasticsearch connection failed: ${(error as Error).message}`);
      this.logger.warn('Product search will fall back to PostgreSQL');
      this.enabled = false;
    }
  }

  isAvailable(): boolean {
    return this.enabled;
  }

  // ─── Index Management ──────────────────────────────────────────────────

  async ensureIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await this.createIndex();
      this.logger.log(`Index ${INDEX_NAME} created`);
    } else {
      this.logger.log(`Index ${INDEX_NAME} already exists`);
    }
  }

  private async createIndex(): Promise<void> {
    await this.client.indices.create({
      index: INDEX_NAME,
      body: {
        settings: {
          number_of_shards: 3,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              product_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'synonym_filter', 'edge_ngram_filter'],
              },
              product_search_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'synonym_filter'],
              },
              filipino_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding'],
              },
              autocomplete_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'edge_ngram_filter'],
              },
              autocomplete_search_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding'],
              },
            },
            filter: {
              synonym_filter: {
                type: 'synonym',
                synonyms: [
                  'bigas, rice',
                  'asukal, sugar',
                  'gatas, milk, leche',
                  'manok, chicken',
                  'baboy, pork',
                  'isda, fish',
                  'gulay, vegetables, veggie',
                  'prutas, fruits, fruit',
                  'tinapay, bread, pandesal',
                  'itlog, eggs, egg',
                  'kape, coffee',
                  'tubig, water',
                  'asin, salt',
                  'suka, vinegar',
                  'toyo, soy sauce',
                  'patis, fish sauce',
                  'bawang, garlic',
                  'sibuyas, onion, onions',
                  'kamatis, tomato, tomatoes',
                  'kamote, sweet potato',
                  'mais, corn',
                  'gabi, taro',
                  'kangkong, water spinach',
                  'pechay, bok choy, chinese cabbage',
                  'saging, banana',
                  'mangga, mango',
                  'niyog, coconut',
                  'kalamansi, calamansi, lime',
                  'sabaw, soup, broth',
                  'ulam, viand, main dish',
                  'merienda, snack, snacks',
                  'kanin, cooked rice',
                  'tsokolate, chocolate',
                  'gawgaw, cornstarch',
                  'bihon, vermicelli, rice noodle',
                  'pancit, noodles',
                ],
              },
              edge_ngram_filter: {
                type: 'edge_ngram',
                min_gram: 2,
                max_gram: 15,
              },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            store_id: { type: 'keyword' },
            name: {
              type: 'text',
              analyzer: 'product_analyzer',
              search_analyzer: 'product_search_analyzer',
              fields: {
                exact: { type: 'keyword' },
                filipino: { type: 'text', analyzer: 'filipino_analyzer' },
                autocomplete: {
                  type: 'text',
                  analyzer: 'autocomplete_analyzer',
                  search_analyzer: 'autocomplete_search_analyzer',
                },
              },
            },
            description: { type: 'text', analyzer: 'filipino_analyzer' },
            short_description: { type: 'text', analyzer: 'filipino_analyzer' },
            category_id: { type: 'keyword' },
            category_name: { type: 'text', analyzer: 'filipino_analyzer', fields: { keyword: { type: 'keyword' } } },
            brand: { type: 'keyword' },
            sku: { type: 'keyword' },
            barcode: { type: 'keyword' },
            slug: { type: 'keyword' },
            base_price: { type: 'float' },
            sale_price: { type: 'float' },
            rating_average: { type: 'float' },
            rating_count: { type: 'integer' },
            total_sold: { type: 'integer' },
            dietary_tags: { type: 'keyword' },
            allergens: { type: 'keyword' },
            is_active: { type: 'boolean' },
            is_featured: { type: 'boolean' },
            is_perishable: { type: 'boolean' },
            requires_prescription: { type: 'boolean' },
            image_url: { type: 'keyword', index: false },
            updated_at: { type: 'date' },
          },
        },
      },
    });
  }

  // ─── Product Indexing ──────────────────────────────────────────────────

  async indexProduct(product: ProductEntity): Promise<void> {
    if (!this.enabled) return;

    try {
      const doc = this.productToDocument(product);
      await this.client.index({
        index: INDEX_NAME,
        id: product.id,
        document: doc,
      });
      this.logger.debug(`Indexed product: ${product.id}`);
    } catch (error) {
      this.logger.error(`Failed to index product ${product.id}: ${(error as Error).message}`);
    }
  }

  async removeProduct(productId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.client.delete({
        index: INDEX_NAME,
        id: productId,
      });
      this.logger.debug(`Removed product from index: ${productId}`);
    } catch (error) {
      const err = error as Record<string, unknown>;
      if ((err.meta as Record<string, unknown>)?.statusCode === 404) {
        this.logger.debug(`Product ${productId} not found in index (already removed)`);
        return;
      }
      this.logger.error(`Failed to remove product ${productId} from index: ${(error as Error).message}`);
    }
  }

  async bulkIndex(products: ProductEntity[]): Promise<{ indexed: number; errors: number }> {
    if (!this.enabled || products.length === 0) {
      return { indexed: 0, errors: 0 };
    }

    const batchSize = 500;
    let indexed = 0;
    let errors = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const operations = batch.flatMap((product) => [
        { index: { _index: INDEX_NAME, _id: product.id } },
        this.productToDocument(product),
      ]);

      try {
        const result = await this.client.bulk({ operations, refresh: false });

        if (result.errors) {
          const failedItems = result.items.filter((item) => item.index?.error);
          errors += failedItems.length;
          indexed += batch.length - failedItems.length;
          for (const item of failedItems) {
            this.logger.error(`Bulk index error for ${item.index?._id}: ${JSON.stringify(item.index?.error)}`);
          }
        } else {
          indexed += batch.length;
        }
      } catch (error) {
        errors += batch.length;
        this.logger.error(`Bulk index batch failed: ${(error as Error).message}`);
      }
    }

    // Refresh the index to make all documents searchable
    try {
      await this.client.indices.refresh({ index: INDEX_NAME });
    } catch {
      this.logger.warn('Failed to refresh index after bulk indexing');
    }

    this.logger.log(`Bulk index complete: ${indexed} indexed, ${errors} errors`);
    return { indexed, errors };
  }

  // ─── Search ────────────────────────────────────────────────────────────

  async search(params: {
    query?: string;
    category_id?: string;
    store_id?: string;
    brand?: string;
    min_price?: number;
    max_price?: number;
    dietary_tags?: string[];
    is_active?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    from?: number;
    size?: number;
  }): Promise<SearchResult> {
    if (!this.enabled) {
      return { items: [], total: 0 };
    }

    const {
      query,
      category_id,
      store_id,
      brand,
      min_price,
      max_price,
      dietary_tags,
      is_active = true,
      sort_by = '_score',
      sort_order = 'desc',
      from = 0,
      size = 20,
    } = params;

    const must: Record<string, unknown>[] = [];
    const filter: Record<string, unknown>[] = [];

    // Text query with boosted fields
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'name^3',
            'name.filipino^2',
            'brand^2',
            'description',
            'short_description',
            'category_name',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 1,
        },
      });
    }

    // Filters
    filter.push({ term: { is_active } });

    if (category_id) {
      filter.push({ term: { category_id } });
    }
    if (store_id) {
      filter.push({ term: { store_id } });
    }
    if (brand) {
      filter.push({ term: { brand } });
    }
    if (dietary_tags && dietary_tags.length > 0) {
      filter.push({ terms: { dietary_tags } });
    }
    if (min_price !== undefined || max_price !== undefined) {
      const range: Record<string, number> = {};
      if (min_price !== undefined) range.gte = min_price;
      if (max_price !== undefined) range.lte = max_price;
      filter.push({ range: { base_price: range } });
    }

    // Build sort
    const sort: SortCombinations[] = [];
    if (query && query.trim() && sort_by === '_score') {
      sort.push('_score');
    }
    if (sort_by && sort_by !== '_score') {
      sort.push({ [sort_by]: { order: sort_order as 'asc' | 'desc' } } as SortCombinations);
    }
    sort.push({ total_sold: { order: 'desc' as const } } as SortCombinations);
    sort.push({ rating_average: { order: 'desc' as const } } as SortCombinations);

    // Aggregations for faceted search
    const aggs = {
      categories: {
        terms: { field: 'category_name.keyword', size: 20 },
      },
      brands: {
        terms: { field: 'brand', size: 20, missing: 'Unknown' },
      },
      price_range: {
        stats: { field: 'base_price' },
      },
      dietary_tags: {
        terms: { field: 'dietary_tags', size: 20 },
      },
    };

    try {
      const result = await this.client.search({
        index: INDEX_NAME,
        body: {
          query: {
            bool: {
              must: must.length > 0 ? must : [{ match_all: {} }],
              filter,
            },
          },
          sort,
          from,
          size,
          aggs,
          _source: true,
        },
      });

      const hits = result.hits.hits;
      const total = typeof result.hits.total === 'number'
        ? result.hits.total
        : (result.hits.total as { value: number })?.value ?? 0;

      const items: ProductSearchDocument[] = hits.map((hit) => hit._source as ProductSearchDocument);

      return {
        items,
        total,
        aggregations: result.aggregations as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.error(`Search failed: ${(error as Error).message}`);
      return { items: [], total: 0 };
    }
  }

  // ─── Autocomplete Suggestions ──────────────────────────────────────────

  async suggest(query: string, size: number = 10): Promise<SuggestResult> {
    if (!this.enabled || !query.trim()) {
      return { suggestions: [] };
    }

    try {
      const result = await this.client.search({
        index: INDEX_NAME,
        body: {
          query: {
            bool: {
              must: [
                {
                  match: {
                    'name.autocomplete': {
                      query: query.trim(),
                    },
                  },
                },
              ],
              filter: [{ term: { is_active: true } }],
            },
          },
          _source: ['name', 'brand', 'category_name'],
          size,
          collapse: {
            field: 'name.exact',
          },
        },
      });

      const suggestions = result.hits.hits.map((hit) => {
        const source = hit._source as { name: string; brand?: string; category_name?: string };
        return source.name;
      });

      return { suggestions };
    } catch (error) {
      this.logger.error(`Suggest failed: ${(error as Error).message}`);
      return { suggestions: [] };
    }
  }

  // ─── Reindex ───────────────────────────────────────────────────────────

  async deleteIndex(): Promise<void> {
    if (!this.enabled) return;

    try {
      const exists = await this.client.indices.exists({ index: INDEX_NAME });
      if (exists) {
        await this.client.indices.delete({ index: INDEX_NAME });
        this.logger.log(`Index ${INDEX_NAME} deleted`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete index: ${(error as Error).message}`);
      throw error;
    }
  }

  async reindex(): Promise<{ indexed: number; errors: number }> {
    // This method just recreates the index — the caller (catalog.service) fetches products
    await this.deleteIndex();
    await this.createIndex();
    this.logger.log('Index recreated, ready for bulk indexing');
    return { indexed: 0, errors: 0 };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private productToDocument(product: ProductEntity): ProductSearchDocument {
    const primaryImage = product.images?.find((img) => img.is_primary);
    const firstImage = product.images?.[0];

    return {
      id: product.id,
      store_id: product.store_id,
      name: product.name,
      description: product.description,
      short_description: product.short_description,
      category_id: product.category_id,
      category_name: product.category?.name ?? null,
      brand: product.brand,
      sku: product.sku,
      barcode: product.barcode,
      slug: product.slug,
      base_price: Number(product.base_price),
      sale_price: product.sale_price ? Number(product.sale_price) : null,
      rating_average: Number(product.rating_average),
      rating_count: product.rating_count,
      total_sold: product.total_sold,
      dietary_tags: product.dietary_tags ?? [],
      allergens: product.allergens ?? [],
      is_active: product.is_active,
      is_featured: product.is_featured,
      is_perishable: product.is_perishable,
      requires_prescription: product.requires_prescription,
      image_url: primaryImage?.url ?? firstImage?.url ?? null,
      updated_at: product.updated_at?.toISOString() ?? new Date().toISOString(),
    };
  }
}
