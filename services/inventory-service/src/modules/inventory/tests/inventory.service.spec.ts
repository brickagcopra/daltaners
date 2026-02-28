import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InventoryService } from '../inventory.service';
import { InventoryRepository } from '../inventory.repository';
import { StockCacheService } from '../stock-cache.service';
import { KafkaProducerService, KAFKA_TOPICS } from '../kafka-producer.service';
import { StockEntity } from '../entities/stock.entity';
import { StockMovementEntity, MovementType } from '../entities/stock-movement.entity';

describe('InventoryService', () => {
  let service: InventoryService;
  let repository: jest.Mocked<InventoryRepository>;
  let stockCache: jest.Mocked<StockCacheService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockStock: Partial<StockEntity> = {
    id: 'stock-uuid-1',
    productId: 'product-uuid-1',
    variantId: null,
    storeLocationId: 'location-uuid-1',
    quantity: 100,
    reservedQuantity: 10,
    reorderPoint: 10,
    reorderQuantity: 50,
    batchNumber: null,
    expiryDate: null,
    lastRestockedAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMovement: Partial<StockMovementEntity> = {
    id: 'movement-uuid-1',
    stockId: 'stock-uuid-1',
    movementType: MovementType.IN,
    quantity: 50,
    referenceType: 'manual',
    referenceId: null,
    notes: 'Restocking',
    performedBy: 'user-uuid-1',
    createdAt: new Date(),
  };

  const performedBy = 'user-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: {
            createStock: jest.fn(),
            findStockById: jest.fn(),
            findStockByProductAndLocation: jest.fn(),
            findStocksByLocation: jest.fn(),
            findLowStock: jest.fn(),
            createMovement: jest.fn(),
            findMovementsByStockId: jest.fn(),
            adjustStock: jest.fn(),
            reserveStock: jest.fn(),
            releaseStock: jest.fn(),
          },
        },
        {
          provide: StockCacheService,
          useValue: {
            getStockLevel: jest.fn(),
            setStockLevel: jest.fn(),
            invalidate: jest.fn(),
            atomicReserve: jest.fn(),
            atomicRelease: jest.fn(),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            publish: jest.fn(),
            publishEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    repository = module.get(InventoryRepository);
    stockCache = module.get(StockCacheService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  // ============================================================
  // Create Stock
  // ============================================================
  describe('createStock', () => {
    const createDto = {
      product_id: 'product-uuid-1',
      store_location_id: 'location-uuid-1',
      quantity: 100,
      reorder_point: 10,
      reorder_quantity: 50,
    };

    it('should create stock entry successfully', async () => {
      repository.findStockByProductAndLocation.mockResolvedValue(null);
      repository.createStock.mockResolvedValue(mockStock as StockEntity);

      const result = await service.createStock(createDto, performedBy);

      expect(result).toEqual(mockStock);
      expect(stockCache.setStockLevel).toHaveBeenCalledWith(
        'product-uuid-1',
        'location-uuid-1',
        90, // 100 - 10
      );
    });

    it('should throw ConflictException if stock already exists', async () => {
      repository.findStockByProductAndLocation.mockResolvedValue(mockStock as StockEntity);

      await expect(service.createStock(createDto, performedBy)).rejects.toThrow(ConflictException);
    });

    it('should publish low stock event if quantity below reorder point', async () => {
      const lowStock = { ...mockStock, quantity: 5, reservedQuantity: 0, reorderPoint: 10 };
      repository.findStockByProductAndLocation.mockResolvedValue(null);
      repository.createStock.mockResolvedValue(lowStock as StockEntity);

      await service.createStock(createDto, performedBy);

      expect(kafkaProducer.publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.INVENTORY_LOW,
        'low',
        expect.objectContaining({ productId: 'product-uuid-1' }),
        'product-uuid-1',
      );
    });

    it('should not publish low stock event if quantity above reorder point', async () => {
      repository.findStockByProductAndLocation.mockResolvedValue(null);
      repository.createStock.mockResolvedValue(mockStock as StockEntity);

      await service.createStock(createDto, performedBy);

      expect(kafkaProducer.publishEvent).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Get Stock
  // ============================================================
  describe('getStock', () => {
    it('should return stock with cached level (cache hit)', async () => {
      stockCache.getStockLevel.mockResolvedValue(90);
      repository.findStockByProductAndLocation.mockResolvedValue(mockStock as StockEntity);

      const result = await service.getStock('product-uuid-1', 'location-uuid-1');

      expect(result.availableQuantity).toBe(90);
      expect(result.stock).toEqual(mockStock);
      expect(stockCache.setStockLevel).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache on cache miss', async () => {
      stockCache.getStockLevel.mockResolvedValue(null);
      repository.findStockByProductAndLocation.mockResolvedValue(mockStock as StockEntity);

      const result = await service.getStock('product-uuid-1', 'location-uuid-1');

      expect(result.availableQuantity).toBe(90);
      expect(stockCache.setStockLevel).toHaveBeenCalledWith('product-uuid-1', 'location-uuid-1', 90);
    });

    it('should throw NotFoundException and invalidate cache when stock not found (cache hit)', async () => {
      stockCache.getStockLevel.mockResolvedValue(90);
      repository.findStockByProductAndLocation.mockResolvedValue(null);

      await expect(service.getStock('product-uuid-1', 'location-uuid-1')).rejects.toThrow(NotFoundException);
      expect(stockCache.invalidate).toHaveBeenCalledWith('product-uuid-1', 'location-uuid-1');
    });

    it('should throw NotFoundException when stock not found (cache miss)', async () => {
      stockCache.getStockLevel.mockResolvedValue(null);
      repository.findStockByProductAndLocation.mockResolvedValue(null);

      await expect(service.getStock('product-uuid-1', 'location-uuid-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // List Stock
  // ============================================================
  describe('listStock', () => {
    it('should return paginated stock items', async () => {
      repository.findStocksByLocation.mockResolvedValue({
        items: [mockStock as StockEntity],
        total: 1,
      });

      const result = await service.listStock({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should use default pagination when not provided', async () => {
      repository.findStocksByLocation.mockResolvedValue({ items: [], total: 0 });

      const result = await service.listStock({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ============================================================
  // Adjust Stock
  // ============================================================
  describe('adjustStock', () => {
    const adjustDto = {
      product_id: 'product-uuid-1',
      store_location_id: 'location-uuid-1',
      quantity: 20,
      notes: 'Restocking',
    };

    it('should adjust stock and update cache', async () => {
      const adjusted = { ...mockStock, quantity: 120 };
      repository.adjustStock.mockResolvedValue(adjusted as StockEntity);

      const result = await service.adjustStock(adjustDto, performedBy);

      expect(result.quantity).toBe(120);
      expect(stockCache.setStockLevel).toHaveBeenCalledWith(
        'product-uuid-1',
        'location-uuid-1',
        110, // 120 - 10
      );
      expect(kafkaProducer.publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.INVENTORY_ADJUSTED,
        'adjusted',
        expect.objectContaining({ adjustmentQuantity: 20 }),
        'product-uuid-1',
      );
    });

    it('should throw BadRequestException when quantity is zero', async () => {
      await expect(
        service.adjustStock({ ...adjustDto, quantity: 0 }, performedBy),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when stock not found', async () => {
      repository.adjustStock.mockRejectedValue(new Error('Stock not found'));

      await expect(service.adjustStock(adjustDto, performedBy)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on insufficient stock for negative adjustment', async () => {
      repository.adjustStock.mockRejectedValue(new Error('Insufficient stock'));

      await expect(
        service.adjustStock({ ...adjustDto, quantity: -200 }, performedBy),
      ).rejects.toThrow(BadRequestException);
    });

    it('should publish low stock event when stock falls below reorder point', async () => {
      const lowStock = { ...mockStock, quantity: 15, reservedQuantity: 8, reorderPoint: 10 };
      repository.adjustStock.mockResolvedValue(lowStock as StockEntity);

      await service.adjustStock(adjustDto, performedBy);

      expect(kafkaProducer.publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.INVENTORY_LOW,
        'low',
        expect.objectContaining({ productId: 'product-uuid-1' }),
        'product-uuid-1',
      );
    });
  });

  // ============================================================
  // Reserve Stock
  // ============================================================
  describe('reserveStock', () => {
    const reserveDto = {
      items: [
        { product_id: 'product-uuid-1', store_location_id: 'location-uuid-1', quantity: 5 },
      ],
      reference_id: 'order-uuid-1',
    };

    it('should reserve stock atomically with cache', async () => {
      const reserved = { ...mockStock, reservedQuantity: 15 };
      stockCache.atomicReserve.mockResolvedValue(true);
      repository.reserveStock.mockResolvedValue(reserved as StockEntity);

      const result = await service.reserveStock(reserveDto, performedBy);

      expect(result.reserved).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].availableAfter).toBe(85); // 100 - 15
      expect(kafkaProducer.publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.INVENTORY_RESERVED,
        'reserved',
        expect.objectContaining({ referenceId: 'order-uuid-1' }),
        'order-uuid-1',
      );
    });

    it('should set cache level when atomic reserve fails', async () => {
      const reserved = { ...mockStock, reservedQuantity: 15 };
      stockCache.atomicReserve.mockResolvedValue(false);
      repository.reserveStock.mockResolvedValue(reserved as StockEntity);

      await service.reserveStock(reserveDto, performedBy);

      expect(stockCache.setStockLevel).toHaveBeenCalledWith(
        'product-uuid-1',
        'location-uuid-1',
        85,
      );
    });

    it('should rollback cache on DB failure', async () => {
      stockCache.atomicReserve.mockResolvedValue(true);
      repository.reserveStock.mockRejectedValue(new Error('Insufficient stock available'));

      await expect(
        service.reserveStock(reserveDto, performedBy),
      ).rejects.toThrow(BadRequestException);

      expect(stockCache.atomicRelease).toHaveBeenCalledWith(
        'product-uuid-1',
        'location-uuid-1',
        5,
      );
    });

    it('should rollback previously reserved items on failure', async () => {
      const multiItemDto = {
        items: [
          { product_id: 'product-1', store_location_id: 'loc-1', quantity: 3 },
          { product_id: 'product-2', store_location_id: 'loc-1', quantity: 5 },
        ],
        reference_id: 'order-uuid-1',
      };

      const stock1 = { ...mockStock, productId: 'product-1' };
      stockCache.atomicReserve
        .mockResolvedValueOnce(true)  // first item succeeds
        .mockResolvedValueOnce(true); // second item succeeds in cache
      repository.reserveStock
        .mockResolvedValueOnce(stock1 as StockEntity) // first item succeeds
        .mockRejectedValueOnce(new Error('Insufficient stock available')); // second item fails

      await expect(
        service.reserveStock(multiItemDto, performedBy),
      ).rejects.toThrow(BadRequestException);

      // First item should be rolled back in DB
      expect(repository.releaseStock).toHaveBeenCalledWith(
        'product-1', 'loc-1', 3, performedBy, null, 'reservation_rollback', 'order-uuid-1',
      );
    });

    it('should publish low stock event when reservation triggers low stock', async () => {
      const nearLow = { ...mockStock, quantity: 15, reservedQuantity: 12, reorderPoint: 10 };
      stockCache.atomicReserve.mockResolvedValue(true);
      repository.reserveStock.mockResolvedValue(nearLow as StockEntity);

      await service.reserveStock(reserveDto, performedBy);

      expect(kafkaProducer.publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.INVENTORY_LOW,
        'low',
        expect.any(Object),
        expect.any(String),
      );
    });
  });

  // ============================================================
  // Release Stock
  // ============================================================
  describe('releaseStock', () => {
    const releaseDto = {
      items: [
        { product_id: 'product-uuid-1', store_location_id: 'location-uuid-1', quantity: 5 },
      ],
      reference_id: 'order-uuid-1',
    };

    it('should release reserved stock and update cache', async () => {
      const released = { ...mockStock, reservedQuantity: 5 };
      repository.releaseStock.mockResolvedValue(released as StockEntity);

      const result = await service.releaseStock(releaseDto, performedBy);

      expect(result.released).toBe(true);
      expect(result.items[0].availableAfter).toBe(95); // 100 - 5
      expect(stockCache.atomicRelease).toHaveBeenCalledWith('product-uuid-1', 'location-uuid-1', 5);
      expect(stockCache.setStockLevel).toHaveBeenCalledWith('product-uuid-1', 'location-uuid-1', 95);
      expect(kafkaProducer.publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.INVENTORY_RELEASED,
        'released',
        expect.objectContaining({ referenceId: 'order-uuid-1' }),
        'order-uuid-1',
      );
    });

    it('should throw NotFoundException when stock not found', async () => {
      repository.releaseStock.mockRejectedValue(new Error('Stock not found'));

      await expect(service.releaseStock(releaseDto, performedBy)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when releasing more than reserved', async () => {
      repository.releaseStock.mockRejectedValue(new Error('Cannot release more than reserved'));

      await expect(service.releaseStock(releaseDto, performedBy)).rejects.toThrow(BadRequestException);
    });

    it('should handle multiple items in release', async () => {
      const multiDto = {
        items: [
          { product_id: 'p1', store_location_id: 'l1', quantity: 3 },
          { product_id: 'p2', store_location_id: 'l1', quantity: 2 },
        ],
        reference_id: 'order-uuid-1',
      };

      const stock1 = { ...mockStock, productId: 'p1', reservedQuantity: 7 };
      const stock2 = { ...mockStock, productId: 'p2', reservedQuantity: 8 };
      repository.releaseStock
        .mockResolvedValueOnce(stock1 as StockEntity)
        .mockResolvedValueOnce(stock2 as StockEntity);

      const result = await service.releaseStock(multiDto, performedBy);

      expect(result.items).toHaveLength(2);
      expect(stockCache.atomicRelease).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // Get Low Stock Items
  // ============================================================
  describe('getLowStockItems', () => {
    it('should return low stock items with pagination', async () => {
      repository.findLowStock.mockResolvedValue({
        items: [mockStock as StockEntity],
        total: 1,
      });

      const result = await service.getLowStockItems('location-uuid-1', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should use defaults for pagination', async () => {
      repository.findLowStock.mockResolvedValue({ items: [], total: 0 });

      const result = await service.getLowStockItems();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ============================================================
  // Get Movements
  // ============================================================
  describe('getMovements', () => {
    it('should return movement history', async () => {
      repository.findStockById.mockResolvedValue(mockStock as StockEntity);
      repository.findMovementsByStockId.mockResolvedValue({
        items: [mockMovement as StockMovementEntity],
        total: 1,
      });

      const result = await service.getMovements('stock-uuid-1');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException when stock not found', async () => {
      repository.findStockById.mockResolvedValue(null);

      await expect(service.getMovements('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
