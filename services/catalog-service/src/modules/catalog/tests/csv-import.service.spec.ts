import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { CsvImportService } from '../csv-import.service';
import { CatalogRepository } from '../catalog.repository';
import { ElasticsearchService } from '../elasticsearch.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { ProductEntity } from '../entities/product.entity';

describe('CsvImportService', () => {
  let service: CsvImportService;
  let catalogRepository: Partial<Record<keyof CatalogRepository, jest.Mock>>;
  let elasticsearchService: Partial<Record<keyof ElasticsearchService, jest.Mock>>;
  let kafkaProducer: Partial<Record<keyof KafkaProducerService, jest.Mock>>;
  let dataSource: { createQueryRunner: jest.Mock };
  let queryRunner: Partial<Record<keyof QueryRunner, jest.Mock | Record<string, jest.Mock>>>;

  const STORE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const USER_ID = '11111111-2222-3333-4444-555555555555';
  const CATEGORY_ID = 'cccccccc-dddd-eeee-ffff-000000000000';

  const validCsvHeader = 'name,description,category_id,base_price,sale_price,sku,barcode,brand,unit_type,unit_value,cost_price,weight_grams,is_perishable,shelf_life_days,dietary_tags,allergens';

  function makeCsv(rows: string[]): Buffer {
    return Buffer.from([validCsvHeader, ...rows].join('\n'));
  }

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => ({
          id: 'generated-uuid',
          ...data as Record<string, unknown>,
        })),
        save: jest.fn().mockImplementation((_entity: unknown, products: unknown[]) =>
          products.map((p, i) => ({
            ...(p as Record<string, unknown>),
            id: `product-${i}`,
            created_at: new Date(),
            updated_at: new Date(),
          })),
        ),
      } as unknown as Record<string, jest.Mock>,
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    catalogRepository = {
      productSlugExists: jest.fn().mockResolvedValue(false),
      categoryExists: jest.fn().mockResolvedValue(true),
    };

    elasticsearchService = {
      indexProduct: jest.fn().mockResolvedValue(undefined),
    };

    kafkaProducer = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportService,
        { provide: getRepositoryToken(ProductEntity), useValue: {} },
        { provide: CatalogRepository, useValue: catalogRepository },
        { provide: ElasticsearchService, useValue: elasticsearchService },
        { provide: KafkaProducerService, useValue: kafkaProducer },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<CsvImportService>(CsvImportService);
  });

  it('should import a valid CSV with one product', async () => {
    const csv = makeCsv([
      `Test Product,A great product,${CATEGORY_ID},99.99,,SKU-001,,,kg,1,50.00,500,false,,food,none`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.total_rows).toBe(1);
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should import multiple valid rows', async () => {
    const csv = makeCsv([
      `Product A,Desc A,${CATEGORY_ID},10.00,,,,,,,,,,,,`,
      `Product B,Desc B,${CATEGORY_ID},20.00,,,,,,,,,,,,`,
      `Product C,Desc C,${CATEGORY_ID},30.00,,,,,,,,,,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.total_rows).toBe(3);
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
  });

  it('should fail rows with missing required name field', async () => {
    const csv = makeCsv([
      `,Description only,${CATEGORY_ID},10.00,,,,,,,,,,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0].field).toBe('name');
    expect(result.errors[0].row).toBe(2);
  });

  it('should fail rows with missing category_id', async () => {
    const csv = makeCsv([
      `Test Product,Description,,10.00,,,,,,,,,,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.failed).toBe(1);
    expect(result.errors[0].field).toBe('category_id');
  });

  it('should fail rows with invalid category_id UUID format', async () => {
    const csv = makeCsv([
      `Test Product,Description,not-a-uuid,10.00,,,,,,,,,,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.failed).toBe(1);
    expect(result.errors[0].field).toBe('category_id');
    expect(result.errors[0].message).toContain('valid UUID');
  });

  it('should fail rows with missing base_price', async () => {
    const csv = makeCsv([
      `Test Product,Description,${CATEGORY_ID},,,,,,,,,,,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.failed).toBe(1);
    expect(result.errors[0].field).toBe('base_price');
  });

  it('should fail rows with invalid negative base_price', async () => {
    const csv = makeCsv([
      `Test Product,Description,${CATEGORY_ID},-5.00,,,,,,,,,,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.failed).toBe(1);
    expect(result.errors[0].field).toBe('base_price');
  });

  it('should reject CSV exceeding max rows (500)', async () => {
    const rows = Array.from({ length: 501 }, (_, i) =>
      `Product ${i},Desc,${CATEGORY_ID},10.00,,,,,,,,,,,,`,
    );
    const csv = makeCsv(rows);

    await expect(service.importProducts(csv, STORE_ID, USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject empty CSV', async () => {
    const csv = Buffer.from(validCsvHeader + '\n');

    await expect(service.importProducts(csv, STORE_ID, USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should parse semicolon-separated dietary_tags and allergens', async () => {
    const csv = makeCsv([
      `Test Product,Desc,${CATEGORY_ID},10.00,,,,,,,,,,,"vegan;gluten-free;organic","wheat;soy;dairy"`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.successful).toBe(1);
    const createCall = (queryRunner.manager as Record<string, jest.Mock>).create;
    const createdData = createCall.mock.calls[0][1];
    expect(createdData.dietary_tags).toEqual(['vegan', 'gluten-free', 'organic']);
    expect(createdData.allergens).toEqual(['wheat', 'soy', 'dairy']);
  });

  it('should generate unique slugs within same batch', async () => {
    const csv = makeCsv([
      `Same Name,Desc A,${CATEGORY_ID},10.00,,,,,,,,,,,,`,
      `Same Name,Desc B,${CATEGORY_ID},20.00,,,,,,,,,,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.successful).toBe(2);
    const createCall = (queryRunner.manager as Record<string, jest.Mock>).create;
    const slug1 = createCall.mock.calls[0][1].slug;
    const slug2 = createCall.mock.calls[1][1].slug;
    expect(slug1).not.toBe(slug2);
  });

  it('should rollback transaction on database error', async () => {
    (queryRunner.manager as Record<string, jest.Mock>).save = jest.fn().mockRejectedValue(
      new Error('DB constraint violation'),
    );

    const csv = makeCsv([
      `Test Product,Desc,${CATEGORY_ID},10.00,,,,,,,,,,,,`,
    ]);

    await expect(service.importProducts(csv, STORE_ID, USER_ID)).rejects.toThrow(
      BadRequestException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('should tolerate ES indexing failure', async () => {
    elasticsearchService.indexProduct = jest.fn().mockRejectedValue(new Error('ES down'));

    const csv = makeCsv([
      `Test Product,Desc,${CATEGORY_ID},10.00,,,,,,,,,,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.successful).toBe(1);
  });

  it('should tolerate Kafka publish failure', async () => {
    kafkaProducer.publish = jest.fn().mockRejectedValue(new Error('Kafka down'));

    const csv = makeCsv([
      `Test Product,Desc,${CATEGORY_ID},10.00,,,,,,,,,,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.successful).toBe(1);
  });

  it('should handle mixed valid and invalid rows', async () => {
    const csv = makeCsv([
      `Valid Product,Desc,${CATEGORY_ID},10.00,,,,,,,,,,,,`,
      `,Missing Name,${CATEGORY_ID},10.00,,,,,,,,,,,,`,
      `Another Valid,Desc,${CATEGORY_ID},25.00,,,,,,,,,,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.total_rows).toBe(3);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('should reject CSV with missing required headers', async () => {
    const csv = Buffer.from('name,description\nTest,Desc\n');

    await expect(service.importProducts(csv, STORE_ID, USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should validate is_perishable boolean field', async () => {
    const csv = makeCsv([
      `Test Product,Desc,${CATEGORY_ID},10.00,,,,,,,,,maybe,,,`,
    ]);

    const result = await service.importProducts(csv, STORE_ID, USER_ID);

    expect(result.failed).toBe(1);
    expect(result.errors[0].field).toBe('is_perishable');
  });
});
