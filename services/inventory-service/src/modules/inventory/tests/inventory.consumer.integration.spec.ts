import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { InventoryService } from '../inventory.service';
import { InventoryRepository } from '../inventory.repository';
import { StockCacheService } from '../stock-cache.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { StockEntity } from '../entities/stock.entity';
import { StockMovementEntity, MovementType } from '../entities/stock-movement.entity';

describe('Inventory Consumer Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let module: TestingModule;
  let dataSource: DataSource;
  let inventoryService: InventoryService;
  let mockKafka: jest.Mocked<KafkaProducerService>;

  const mockStockCache = {
    getStockLevel: jest.fn().mockResolvedValue(null),
    setStockLevel: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
    atomicReserve: jest.fn().mockResolvedValue(false),
    atomicRelease: jest.fn().mockResolvedValue(undefined),
  };

  const productId = '11111111-1111-1111-1111-111111111111';
  const locationId = '22222222-2222-2222-2222-222222222222';
  const userId = '33333333-3333-3333-3333-333333333333';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();

    const pgClient = new Client({ connectionString: container.getConnectionUri() });
    await pgClient.connect();
    await pgClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await pgClient.query('CREATE SCHEMA IF NOT EXISTS inventory');
    await pgClient.end();

    mockKafka = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishEvent: jest.fn().mockResolvedValue(undefined),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: container.getConnectionUri(),
          entities: [StockEntity, StockMovementEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([StockEntity, StockMovementEntity]),
      ],
      providers: [
        InventoryService,
        InventoryRepository,
        { provide: StockCacheService, useValue: mockStockCache },
        { provide: KafkaProducerService, useValue: mockKafka },
      ],
    }).compile();

    inventoryService = module.get<InventoryService>(InventoryService);
    dataSource = module.get<DataSource>(DataSource);
  }, 60000);

  afterAll(async () => {
    await dataSource?.destroy();
    await module?.close();
    await container?.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStockCache.getStockLevel.mockResolvedValue(null);
    mockStockCache.atomicReserve.mockResolvedValue(false);
  });

  let productCounter = 0;
  const nextProductId = () => {
    productCounter++;
    const hex = productCounter.toString(16).padStart(12, '0');
    return `aaaaaaaa-aaaa-aaaa-aaaa-${hex}`;
  };

  describe('createStock', () => {
    it('should create stock entry in database', async () => {
      const pid = nextProductId();
      const stock = await inventoryService.createStock(
        {
          product_id: pid,
          store_location_id: locationId,
          quantity: 100,
          reorder_point: 10,
          reorder_quantity: 50,
        } as any,
        userId,
      );

      expect(stock).toBeDefined();
      expect(stock.id).toBeDefined();
      expect(stock.productId).toBe(pid);
      expect(stock.storeLocationId).toBe(locationId);
      expect(stock.quantity).toBe(100);
      expect(stock.reservedQuantity).toBe(0);

      // Verify in database
      const dbStock = await dataSource.getRepository(StockEntity).findOne({
        where: { id: stock.id },
      });
      expect(dbStock).toBeDefined();
      expect(dbStock!.quantity).toBe(100);
    });

    it('should reject duplicate stock entry', async () => {
      const pid = nextProductId();
      await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 50 } as any,
        userId,
      );

      await expect(
        inventoryService.createStock(
          { product_id: pid, store_location_id: locationId, quantity: 30 } as any,
          userId,
        ),
      ).rejects.toThrow('already exists');
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock and create movement record', async () => {
      const pid = nextProductId();
      const stock = await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 50 } as any,
        userId,
      );

      const result = await inventoryService.reserveStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 10 }],
          reference_id: '44444444-4444-4444-4444-444444444444',
        } as any,
        userId,
      );

      expect(result.reserved).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(10);
      expect(result.items[0].availableAfter).toBe(40);

      // Verify DB state
      const dbStock = await dataSource.getRepository(StockEntity).findOne({
        where: { id: stock.id },
      });
      expect(dbStock!.quantity).toBe(50);
      expect(dbStock!.reservedQuantity).toBe(10);

      // Verify movement record
      const movements = await dataSource.getRepository(StockMovementEntity).find({
        where: { stockId: stock.id },
      });
      const reservation = movements.find((m) => m.movementType === MovementType.RESERVATION);
      expect(reservation).toBeDefined();
      expect(reservation!.quantity).toBe(10);
    });

    it('should publish inventory.reserved event', async () => {
      const pid = nextProductId();
      await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 100 } as any,
        userId,
      );

      await inventoryService.reserveStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 5 }],
        } as any,
        userId,
      );

      expect(mockKafka.publishEvent).toHaveBeenCalledWith(
        'daltaners.inventory.reserved',
        'reserved',
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ productId: pid, quantity: 5 }),
          ]),
        }),
        expect.any(String),
      );
    });

    it('should fail on insufficient stock', async () => {
      const pid = nextProductId();
      await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 5 } as any,
        userId,
      );

      await expect(
        inventoryService.reserveStock(
          {
            items: [{ product_id: pid, store_location_id: locationId, quantity: 10 }],
          } as any,
          userId,
        ),
      ).rejects.toThrow('Insufficient');
    });
  });

  describe('releaseStock', () => {
    it('should release reserved stock and create movement record', async () => {
      const pid = nextProductId();
      const stock = await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 50 } as any,
        userId,
      );

      // First reserve
      await inventoryService.reserveStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 15 }],
          reference_id: '55555555-5555-5555-5555-555555555555',
        } as any,
        userId,
      );

      // Then release
      const result = await inventoryService.releaseStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 15 }],
          reference_id: '55555555-5555-5555-5555-555555555555',
        } as any,
        userId,
      );

      expect(result.released).toBe(true);
      expect(result.items[0].availableAfter).toBe(50);

      // Verify DB state
      const dbStock = await dataSource.getRepository(StockEntity).findOne({
        where: { id: stock.id },
      });
      expect(dbStock!.quantity).toBe(50);
      expect(dbStock!.reservedQuantity).toBe(0);

      // Verify release movement
      const movements = await dataSource.getRepository(StockMovementEntity).find({
        where: { stockId: stock.id },
      });
      const release = movements.find((m) => m.movementType === MovementType.RELEASE);
      expect(release).toBeDefined();
      expect(release!.quantity).toBe(15);
    });

    it('should publish inventory.released event', async () => {
      const pid = nextProductId();
      await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 30 } as any,
        userId,
      );

      await inventoryService.reserveStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 10 }],
          reference_id: '66666666-6666-6666-6666-666666666666',
        } as any,
        userId,
      );
      jest.clearAllMocks();

      await inventoryService.releaseStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 10 }],
          reference_id: '66666666-6666-6666-6666-666666666666',
        } as any,
        userId,
      );

      expect(mockKafka.publishEvent).toHaveBeenCalledWith(
        'daltaners.inventory.released',
        'released',
        expect.objectContaining({
          referenceId: '66666666-6666-6666-6666-666666666666',
        }),
        '66666666-6666-6666-6666-666666666666',
      );
    });

    it('should fail when releasing more than reserved', async () => {
      const pid = nextProductId();
      await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 50 } as any,
        userId,
      );

      await inventoryService.reserveStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 5 }],
        } as any,
        userId,
      );

      await expect(
        inventoryService.releaseStock(
          {
            items: [{ product_id: pid, store_location_id: locationId, quantity: 10 }],
            reference_id: '77777777-7777-7777-7777-777777777777',
          } as any,
          userId,
        ),
      ).rejects.toThrow('Cannot release');
    });
  });

  describe('reserve then release full cycle', () => {
    it('should restore stock to original level after reserve + release', async () => {
      const pid = nextProductId();
      const stock = await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 100 } as any,
        userId,
      );

      const originalQuantity = stock.quantity;

      // Reserve
      await inventoryService.reserveStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 25 }],
          reference_id: '88888888-8888-8888-8888-888888888888',
        } as any,
        userId,
      );

      // Verify reserved
      let dbStock = await dataSource.getRepository(StockEntity).findOne({
        where: { id: stock.id },
      });
      expect(dbStock!.reservedQuantity).toBe(25);
      expect(dbStock!.quantity).toBe(100);

      // Release (simulating order cancel)
      await inventoryService.releaseStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 25 }],
          reference_id: '88888888-8888-8888-8888-888888888888',
        } as any,
        userId,
      );

      // Verify fully restored
      dbStock = await dataSource.getRepository(StockEntity).findOne({
        where: { id: stock.id },
      });
      expect(dbStock!.quantity).toBe(originalQuantity);
      expect(dbStock!.reservedQuantity).toBe(0);
      expect(dbStock!.quantity - dbStock!.reservedQuantity).toBe(originalQuantity);
    });
  });

  describe('adjustStock', () => {
    it('should increase stock quantity', async () => {
      const pid = nextProductId();
      const stock = await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 20 } as any,
        userId,
      );

      const adjusted = await inventoryService.adjustStock(
        {
          product_id: pid,
          store_location_id: locationId,
          quantity: 30,
          notes: 'Restock',
        } as any,
        userId,
      );

      expect(adjusted.quantity).toBe(50);

      // Verify movement
      const movements = await dataSource.getRepository(StockMovementEntity).find({
        where: { stockId: stock.id },
      });
      const inMovement = movements.find((m) => m.movementType === MovementType.IN);
      expect(inMovement).toBeDefined();
      expect(inMovement!.quantity).toBe(30);
    });

    it('should decrease stock quantity', async () => {
      const pid = nextProductId();
      await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 40 } as any,
        userId,
      );

      const adjusted = await inventoryService.adjustStock(
        {
          product_id: pid,
          store_location_id: locationId,
          quantity: -10,
          notes: 'Damaged goods',
        } as any,
        userId,
      );

      expect(adjusted.quantity).toBe(30);
    });

    it('should reject reducing below zero', async () => {
      const pid = nextProductId();
      await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 5 } as any,
        userId,
      );

      await expect(
        inventoryService.adjustStock(
          {
            product_id: pid,
            store_location_id: locationId,
            quantity: -10,
          } as any,
          userId,
        ),
      ).rejects.toThrow('Insufficient');
    });

    it('should reject zero adjustment', async () => {
      const pid = nextProductId();
      await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 10 } as any,
        userId,
      );

      await expect(
        inventoryService.adjustStock(
          { product_id: pid, store_location_id: locationId, quantity: 0 } as any,
          userId,
        ),
      ).rejects.toThrow('cannot be zero');
    });
  });

  describe('getStock', () => {
    it('should retrieve stock with available quantity', async () => {
      const pid = nextProductId();
      await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 60 } as any,
        userId,
      );

      await inventoryService.reserveStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 10 }],
        } as any,
        userId,
      );

      const result = await inventoryService.getStock(pid, locationId);

      expect(result.stock.quantity).toBe(60);
      expect(result.stock.reservedQuantity).toBe(10);
      expect(result.availableQuantity).toBe(50);
    });

    it('should throw for non-existent stock', async () => {
      await expect(
        inventoryService.getStock(
          '99999999-9999-9999-9999-999999999999',
          locationId,
        ),
      ).rejects.toThrow('not found');
    });
  });

  describe('getMovements', () => {
    it('should return movement history for a stock entry', async () => {
      const pid = nextProductId();
      const stock = await inventoryService.createStock(
        { product_id: pid, store_location_id: locationId, quantity: 50 } as any,
        userId,
      );

      await inventoryService.adjustStock(
        { product_id: pid, store_location_id: locationId, quantity: 10 } as any,
        userId,
      );

      await inventoryService.reserveStock(
        {
          items: [{ product_id: pid, store_location_id: locationId, quantity: 5 }],
        } as any,
        userId,
      );

      const result = await inventoryService.getMovements(stock.id);

      expect(result.items.length).toBe(2); // adjust + reserve (createStock doesn't create movement)
      expect(result.total).toBe(2);
    });
  });
});
