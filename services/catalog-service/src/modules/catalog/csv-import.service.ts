import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { ProductEntity } from './entities/product.entity';
import { CatalogRepository } from './catalog.repository';
import { ElasticsearchService } from './elasticsearch.service';
import { KafkaProducerService } from './kafka-producer.service';
import { CATALOG_EVENTS, KAFKA_TOPIC, ProductEventData } from './events/catalog.events';
import {
  CsvImportResult,
  CsvRowError,
  CSV_EXPECTED_HEADERS,
  MAX_CSV_ROWS,
} from './dto/csv-import.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly catalogRepository: CatalogRepository,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly dataSource: DataSource,
  ) {}

  async importProducts(
    csvBuffer: Buffer,
    storeId: string,
    userId: string,
  ): Promise<CsvImportResult> {
    // Parse CSV
    let records: Record<string, string>[];
    try {
      records = parse(csvBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch {
      throw new BadRequestException('Invalid CSV file. Please check the format and try again.');
    }

    if (records.length === 0) {
      throw new BadRequestException('CSV file is empty. Please add product rows and try again.');
    }

    if (records.length > MAX_CSV_ROWS) {
      throw new BadRequestException(
        `CSV file contains ${records.length} rows. Maximum allowed is ${MAX_CSV_ROWS}.`,
      );
    }

    // Validate headers
    const fileHeaders = Object.keys(records[0]);
    const missingHeaders = CSV_EXPECTED_HEADERS.filter((h) => !fileHeaders.includes(h));
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `CSV is missing required columns: ${missingHeaders.join(', ')}`,
      );
    }

    // Validate rows and collect valid products
    const errors: CsvRowError[] = [];
    const validProducts: Array<{
      row: number;
      data: Partial<ProductEntity>;
    }> = [];
    const usedSlugs = new Set<string>();

    // Pre-fetch existing slugs for collision detection
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 because row 1 is header, data starts at row 2
      const rowErrors = this.validateRow(row, rowNum);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      // Generate unique slug
      const baseSlug = this.generateSlug(row.name);
      let slug = baseSlug;
      let counter = 1;

      // Check against in-batch slugs
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Check against database slugs
      while (await this.catalogRepository.productSlugExists(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      usedSlugs.add(slug);

      // Parse semicolon-separated arrays
      const dietaryTags = row.dietary_tags
        ? row.dietary_tags.split(';').map((t) => t.trim()).filter(Boolean)
        : null;
      const allergens = row.allergens
        ? row.allergens.split(';').map((a) => a.trim()).filter(Boolean)
        : null;

      validProducts.push({
        row: rowNum,
        data: {
          store_id: storeId,
          category_id: row.category_id.trim(),
          name: row.name.trim(),
          slug,
          description: row.description?.trim() || null,
          sku: row.sku?.trim() || null,
          barcode: row.barcode?.trim() || null,
          brand: row.brand?.trim() || null,
          unit_type: row.unit_type?.trim() || null,
          unit_value: row.unit_value ? parseFloat(row.unit_value) : null,
          base_price: parseFloat(row.base_price),
          sale_price: row.sale_price ? parseFloat(row.sale_price) : null,
          cost_price: row.cost_price ? parseFloat(row.cost_price) : null,
          weight_grams: row.weight_grams ? parseInt(row.weight_grams, 10) : null,
          is_perishable: row.is_perishable?.toLowerCase() === 'true',
          shelf_life_days: row.shelf_life_days ? parseInt(row.shelf_life_days, 10) : null,
          dietary_tags: dietaryTags,
          allergens,
          is_active: true,
          metadata: {},
        },
      });
    }

    if (validProducts.length === 0) {
      return {
        total_rows: records.length,
        successful: 0,
        failed: errors.length,
        errors,
      };
    }

    // Insert valid products in a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let insertedProducts: ProductEntity[] = [];
    try {
      const entities = validProducts.map((vp) =>
        queryRunner.manager.create(ProductEntity, vp.data),
      );
      insertedProducts = await queryRunner.manager.save(ProductEntity, entities);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `CSV import transaction failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new BadRequestException(
        'Failed to import products due to a database error. Please try again.',
      );
    } finally {
      await queryRunner.release();
    }

    // Async ES indexing + Kafka events (fire-and-forget)
    for (const product of insertedProducts) {
      this.indexProductAsync(product);
      this.publishProductEventAsync(product);
    }

    this.logger.log(
      `CSV import completed: ${insertedProducts.length} products imported for store ${storeId} by user ${userId}`,
    );

    return {
      total_rows: records.length,
      successful: insertedProducts.length,
      failed: errors.length,
      errors,
    };
  }

  private validateRow(row: Record<string, string>, rowNum: number): CsvRowError[] {
    const errors: CsvRowError[] = [];

    // Required fields
    if (!row.name?.trim()) {
      errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
    }

    if (!row.category_id?.trim()) {
      errors.push({ row: rowNum, field: 'category_id', message: 'Category ID is required' });
    } else if (!UUID_REGEX.test(row.category_id.trim())) {
      errors.push({ row: rowNum, field: 'category_id', message: 'Category ID must be a valid UUID' });
    }

    if (!row.base_price?.trim()) {
      errors.push({ row: rowNum, field: 'base_price', message: 'Base price is required' });
    } else {
      const price = parseFloat(row.base_price);
      if (isNaN(price) || price < 0) {
        errors.push({ row: rowNum, field: 'base_price', message: 'Base price must be a non-negative number' });
      }
    }

    // Optional numeric fields
    if (row.sale_price?.trim()) {
      const salePrice = parseFloat(row.sale_price);
      if (isNaN(salePrice) || salePrice < 0) {
        errors.push({ row: rowNum, field: 'sale_price', message: 'Sale price must be a non-negative number' });
      }
    }

    if (row.cost_price?.trim()) {
      const costPrice = parseFloat(row.cost_price);
      if (isNaN(costPrice) || costPrice < 0) {
        errors.push({ row: rowNum, field: 'cost_price', message: 'Cost price must be a non-negative number' });
      }
    }

    if (row.unit_value?.trim()) {
      const unitValue = parseFloat(row.unit_value);
      if (isNaN(unitValue) || unitValue <= 0) {
        errors.push({ row: rowNum, field: 'unit_value', message: 'Unit value must be a positive number' });
      }
    }

    if (row.weight_grams?.trim()) {
      const weight = parseInt(row.weight_grams, 10);
      if (isNaN(weight) || weight < 0) {
        errors.push({ row: rowNum, field: 'weight_grams', message: 'Weight must be a non-negative integer' });
      }
    }

    if (row.shelf_life_days?.trim()) {
      const shelfLife = parseInt(row.shelf_life_days, 10);
      if (isNaN(shelfLife) || shelfLife < 0) {
        errors.push({ row: rowNum, field: 'shelf_life_days', message: 'Shelf life must be a non-negative integer' });
      }
    }

    if (row.is_perishable?.trim()) {
      const val = row.is_perishable.trim().toLowerCase();
      if (val !== 'true' && val !== 'false') {
        errors.push({ row: rowNum, field: 'is_perishable', message: 'is_perishable must be true or false' });
      }
    }

    return errors;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private indexProductAsync(product: ProductEntity): void {
    this.elasticsearchService.indexProduct(product).catch((err: Error) => {
      this.logger.error(`CSV import: async ES index failed for product ${product.id}: ${err.message}`);
    });
  }

  private publishProductEventAsync(product: ProductEntity): void {
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

    this.kafkaProducer
      .publish(KAFKA_TOPIC, CATALOG_EVENTS.PRODUCT_CREATED, eventData)
      .catch((err: Error) => {
        this.logger.error(
          `CSV import: Kafka event failed for product ${product.id}: ${err.message}`,
        );
      });
  }
}
