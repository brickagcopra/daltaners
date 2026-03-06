import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from './entities/product.entity';

export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  rating_average: number;
  rating_count: number;
  total_sold: number;
  store_id: string;
  store_name?: string;
  category_id: string;
  category_name?: string;
  primary_image_url: string | null;
  score?: number;
}

@Injectable()
export class RecommendationRepository {
  private readonly logger = new Logger(RecommendationRepository.name);

  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
  ) {}

  /**
   * Find popular products based on total_sold in the last 30 days.
   * Falls back to all-time total_sold when order_items data unavailable.
   */
  async findPopularProducts(options: {
    store_id?: string;
    category_id?: string;
    limit: number;
  }): Promise<RecommendedProduct[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.name AS name',
        'p.slug AS slug',
        'p.base_price AS base_price',
        'p.sale_price AS sale_price',
        'p.rating_average AS rating_average',
        'p.rating_count AS rating_count',
        'p.total_sold AS total_sold',
        'p.store_id AS store_id',
        'p.category_id AS category_id',
      ])
      .where('p.is_active = :active', { active: true })
      .orderBy('p.total_sold', 'DESC')
      .addOrderBy('p.rating_average', 'DESC')
      .limit(options.limit);

    if (options.store_id) {
      qb.andWhere('p.store_id = :storeId', { storeId: options.store_id });
    }

    if (options.category_id) {
      qb.andWhere('p.category_id = :categoryId', { categoryId: options.category_id });
    }

    const rows = await qb.getRawMany();
    return rows.map((r) => this.mapRawToRecommended(r));
  }

  /**
   * Find products frequently bought together with a given product.
   * Uses cross-schema query against orders.order_items to find co-purchases.
   */
  async findFrequentlyBoughtTogether(
    productId: string,
    limit: number,
  ): Promise<RecommendedProduct[]> {
    try {
      // Find products that appear in the same orders as the given product
      const rows = await this.productRepo.query(
        `
        SELECT
          p.id, p.name, p.slug, p.base_price, p.sale_price,
          p.rating_average, p.rating_count, p.total_sold,
          p.store_id, p.category_id,
          COUNT(DISTINCT oi2.order_id) AS co_purchase_count
        FROM catalog.products p
        INNER JOIN orders.order_items oi2 ON oi2.product_id = p.id
        INNER JOIN orders.order_items oi1 ON oi1.order_id = oi2.order_id
        WHERE oi1.product_id = $1
          AND p.id != $1
          AND p.is_active = true
        GROUP BY p.id
        ORDER BY co_purchase_count DESC, p.total_sold DESC
        LIMIT $2
        `,
        [productId, limit],
      );

      return rows.map((r: Record<string, unknown>) => this.mapRawToRecommended(r));
    } catch (error) {
      // If orders schema doesn't exist or query fails, fall back to category-based
      this.logger.warn(`Co-purchase query failed, falling back to category: ${(error as Error).message}`);
      return this.findSimilarProducts(productId, limit);
    }
  }

  /**
   * Find similar products based on same category + tag overlap.
   * Scores by: same category (weight 3) + shared tags (weight 1 each) + rating.
   */
  async findSimilarProducts(
    productId: string,
    limit: number,
  ): Promise<RecommendedProduct[]> {
    // First get the source product's category and tags
    const sourceProduct = await this.productRepo.findOne({
      where: { id: productId },
      select: ['id', 'category_id', 'dietary_tags', 'store_id', 'base_price'],
    });

    if (!sourceProduct) {
      return [];
    }

    const qb = this.productRepo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.name AS name',
        'p.slug AS slug',
        'p.base_price AS base_price',
        'p.sale_price AS sale_price',
        'p.rating_average AS rating_average',
        'p.rating_count AS rating_count',
        'p.total_sold AS total_sold',
        'p.store_id AS store_id',
        'p.category_id AS category_id',
      ])
      .where('p.is_active = :active', { active: true })
      .andWhere('p.id != :productId', { productId });

    // Prioritize same category, then same store, then price range
    qb.addSelect(
      `(CASE WHEN p.category_id = :catId THEN 3 ELSE 0 END)
       + (CASE WHEN p.store_id = :storeId THEN 1 ELSE 0 END)
       + (CASE WHEN ABS(p.base_price - :basePrice) < :basePrice * 0.3 THEN 1 ELSE 0 END)
       + (p.rating_average / 5.0)`,
      'similarity_score',
    );

    qb.setParameters({
      catId: sourceProduct.category_id,
      storeId: sourceProduct.store_id,
      basePrice: sourceProduct.base_price,
    });

    qb.orderBy('similarity_score', 'DESC')
      .addOrderBy('p.total_sold', 'DESC')
      .limit(limit);

    const rows = await qb.getRawMany();
    return rows.map((r) => this.mapRawToRecommended(r, r.similarity_score));
  }

  /**
   * Find personalized product recommendations for a specific user.
   * Based on user's recent purchase categories and stores, excluding already-purchased items.
   */
  async findPersonalizedProducts(
    userId: string,
    limit: number,
  ): Promise<RecommendedProduct[]> {
    try {
      const rows = await this.productRepo.query(
        `
        WITH user_preferences AS (
          SELECT DISTINCT
            oi.product_id,
            p_ordered.category_id,
            p_ordered.store_id
          FROM orders.orders o
          INNER JOIN orders.order_items oi ON oi.order_id = o.id
          INNER JOIN catalog.products p_ordered ON p_ordered.id = oi.product_id
          WHERE o.customer_id = $1
            AND o.status = 'delivered'
          ORDER BY o.created_at DESC
          LIMIT 50
        ),
        preferred_categories AS (
          SELECT category_id, COUNT(*) AS freq
          FROM user_preferences
          GROUP BY category_id
          ORDER BY freq DESC
          LIMIT 5
        ),
        preferred_stores AS (
          SELECT store_id, COUNT(*) AS freq
          FROM user_preferences
          GROUP BY store_id
          ORDER BY freq DESC
          LIMIT 5
        ),
        already_purchased AS (
          SELECT DISTINCT product_id FROM user_preferences
        )
        SELECT
          p.id, p.name, p.slug, p.base_price, p.sale_price,
          p.rating_average, p.rating_count, p.total_sold,
          p.store_id, p.category_id,
          (CASE WHEN pc.category_id IS NOT NULL THEN 3 ELSE 0 END)
          + (CASE WHEN ps.store_id IS NOT NULL THEN 2 ELSE 0 END)
          + (p.rating_average / 5.0) AS relevance_score
        FROM catalog.products p
        LEFT JOIN preferred_categories pc ON pc.category_id = p.category_id
        LEFT JOIN preferred_stores ps ON ps.store_id = p.store_id
        LEFT JOIN already_purchased ap ON ap.product_id = p.id
        WHERE p.is_active = true
          AND ap.product_id IS NULL
          AND (pc.category_id IS NOT NULL OR ps.store_id IS NOT NULL)
        ORDER BY relevance_score DESC, p.total_sold DESC
        LIMIT $2
        `,
        [userId, limit],
      );

      return rows.map((r: Record<string, unknown>) =>
        this.mapRawToRecommended(r, Number(r.relevance_score) || 0),
      );
    } catch (error) {
      // If orders schema unavailable, fall back to popular products
      this.logger.warn(`Personalized query failed, falling back to popular: ${(error as Error).message}`);
      return this.findPopularProducts({ limit });
    }
  }

  private mapRawToRecommended(
    row: Record<string, unknown>,
    score?: number,
  ): RecommendedProduct {
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      base_price: Number(row.base_price),
      sale_price: row.sale_price != null ? Number(row.sale_price) : null,
      rating_average: Number(row.rating_average),
      rating_count: Number(row.rating_count),
      total_sold: Number(row.total_sold),
      store_id: row.store_id as string,
      store_name: (row.store_name as string) || undefined,
      category_id: row.category_id as string,
      category_name: (row.category_name as string) || undefined,
      primary_image_url: (row.primary_image_url as string) || null,
      score: score != null ? Number(score) : undefined,
    };
  }
}
