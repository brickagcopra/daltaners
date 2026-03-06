import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InventoryRepository } from './inventory.repository';
import { StockCacheService } from './stock-cache.service';
import { KafkaProducerService, KAFKA_TOPICS } from './kafka-producer.service';
import { StockEntity } from './entities/stock.entity';
import { StockMovementEntity } from './entities/stock-movement.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { ReleaseStockDto } from './dto/release-stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { AdminStockQueryDto, AdminMovementsQueryDto } from './dto/admin-stock-query.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly repository: InventoryRepository,
    private readonly stockCache: StockCacheService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async createStock(dto: CreateStockDto, performedBy: string): Promise<StockEntity> {
    const existing = await this.repository.findStockByProductAndLocation(
      dto.product_id,
      dto.store_location_id,
      dto.variant_id,
    );

    if (existing) {
      throw new ConflictException(
        `Stock entry already exists for product ${dto.product_id} at location ${dto.store_location_id}`,
      );
    }

    const stock = await this.repository.createStock({
      productId: dto.product_id,
      variantId: dto.variant_id || null,
      storeLocationId: dto.store_location_id,
      quantity: dto.quantity,
      reorderPoint: dto.reorder_point,
      reorderQuantity: dto.reorder_quantity,
      batchNumber: dto.batch_number || null,
      expiryDate: dto.expiry_date ? new Date(dto.expiry_date) : null,
    });

    await this.stockCache.setStockLevel(
      dto.product_id,
      dto.store_location_id,
      stock.quantity - stock.reservedQuantity,
    );

    this.logger.log(
      `Stock entry created for product ${dto.product_id} at ${dto.store_location_id} with quantity ${dto.quantity}`,
    );

    if (stock.quantity - stock.reservedQuantity <= stock.reorderPoint) {
      await this.publishLowStockEvent(stock);
    }

    return stock;
  }

  async getStock(productId: string, locationId: string): Promise<{
    stock: StockEntity;
    availableQuantity: number;
  }> {
    const cachedLevel = await this.stockCache.getStockLevel(productId, locationId);

    if (cachedLevel !== null) {
      const stock = await this.repository.findStockByProductAndLocation(productId, locationId);
      if (!stock) {
        await this.stockCache.invalidate(productId, locationId);
        throw new NotFoundException(
          `Stock not found for product ${productId} at location ${locationId}`,
        );
      }
      return {
        stock,
        availableQuantity: cachedLevel,
      };
    }

    const stock = await this.repository.findStockByProductAndLocation(productId, locationId);
    if (!stock) {
      throw new NotFoundException(
        `Stock not found for product ${productId} at location ${locationId}`,
      );
    }

    const availableQuantity = stock.quantity - stock.reservedQuantity;
    await this.stockCache.setStockLevel(productId, locationId, availableQuantity);

    return {
      stock,
      availableQuantity,
    };
  }

  async listStock(
    query: StockQueryDto,
  ): Promise<{ items: StockEntity[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.repository.findStocksByLocation(query);
    return {
      items,
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }

  async adjustStock(dto: AdjustStockDto, performedBy: string): Promise<StockEntity> {
    if (dto.quantity === 0) {
      throw new BadRequestException('Adjustment quantity cannot be zero');
    }

    try {
      const stock = await this.repository.adjustStock(
        dto.product_id,
        dto.store_location_id,
        dto.quantity,
        performedBy,
        dto.variant_id,
        dto.notes,
        dto.reference_type,
        dto.reference_id,
      );

      const availableQuantity = stock.quantity - stock.reservedQuantity;
      await this.stockCache.setStockLevel(
        dto.product_id,
        dto.store_location_id,
        availableQuantity,
      );

      await this.kafkaProducer.publishEvent(
        KAFKA_TOPICS.INVENTORY_ADJUSTED,
        'adjusted',
        {
          productId: dto.product_id,
          variantId: dto.variant_id || null,
          storeLocationId: dto.store_location_id,
          adjustmentQuantity: dto.quantity,
          newQuantity: stock.quantity,
          availableQuantity,
          performedBy,
        },
        dto.product_id,
      );

      // Publish out_of_stock if quantity dropped to 0
      if (availableQuantity <= 0) {
        await this.publishOutOfStockEvent(stock);
      } else if (availableQuantity <= stock.reorderPoint) {
        await this.publishLowStockEvent(stock);
      }

      // Publish restocked if quantity was added (positive adjustment)
      if (dto.quantity > 0) {
        await this.publishRestockedEvent(stock);
      }

      return stock;
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        throw new NotFoundException((error as Error).message);
      }
      if ((error as Error).message.includes('Insufficient')) {
        throw new BadRequestException((error as Error).message);
      }
      throw error;
    }
  }

  async reserveStock(dto: ReserveStockDto, performedBy: string): Promise<{
    reserved: boolean;
    items: Array<{
      productId: string;
      storeLocationId: string;
      quantity: number;
      availableAfter: number;
    }>;
  }> {
    const reservedItems: Array<{
      productId: string;
      storeLocationId: string;
      variantId: string | null;
      quantity: number;
      availableAfter: number;
    }> = [];

    const rollbackItems: Array<{
      productId: string;
      storeLocationId: string;
      variantId: string | null;
      quantity: number;
    }> = [];

    try {
      for (const item of dto.items) {
        const cacheReserved = await this.stockCache.atomicReserve(
          item.product_id,
          item.store_location_id,
          item.quantity,
        );

        try {
          const stock = await this.repository.reserveStock(
            item.product_id,
            item.store_location_id,
            item.quantity,
            performedBy,
            item.variant_id,
            'order',
            dto.reference_id,
          );

          const availableAfter = stock.quantity - stock.reservedQuantity;

          if (!cacheReserved) {
            await this.stockCache.setStockLevel(
              item.product_id,
              item.store_location_id,
              availableAfter,
            );
          }

          reservedItems.push({
            productId: item.product_id,
            storeLocationId: item.store_location_id,
            variantId: item.variant_id || null,
            quantity: item.quantity,
            availableAfter,
          });

          rollbackItems.push({
            productId: item.product_id,
            storeLocationId: item.store_location_id,
            variantId: item.variant_id || null,
            quantity: item.quantity,
          });

          if (availableAfter <= stock.reorderPoint) {
            await this.publishLowStockEvent(stock);
          }
        } catch (error) {
          if (cacheReserved) {
            await this.stockCache.atomicRelease(
              item.product_id,
              item.store_location_id,
              item.quantity,
            );
          }
          throw error;
        }
      }

      await this.kafkaProducer.publishEvent(
        KAFKA_TOPICS.INVENTORY_RESERVED,
        'reserved',
        {
          items: reservedItems,
          referenceId: dto.reference_id || null,
          performedBy,
        },
        dto.reference_id || reservedItems[0]?.productId,
      );

      return {
        reserved: true,
        items: reservedItems.map((item) => ({
          productId: item.productId,
          storeLocationId: item.storeLocationId,
          quantity: item.quantity,
          availableAfter: item.availableAfter,
        })),
      };
    } catch (error) {
      this.logger.error(`Reservation failed, rolling back ${rollbackItems.length} items: ${(error as Error).message}`);

      for (const rollbackItem of rollbackItems) {
        try {
          await this.repository.releaseStock(
            rollbackItem.productId,
            rollbackItem.storeLocationId,
            rollbackItem.quantity,
            performedBy,
            rollbackItem.variantId,
            'reservation_rollback',
            dto.reference_id,
          );

          await this.stockCache.atomicRelease(
            rollbackItem.productId,
            rollbackItem.storeLocationId,
            rollbackItem.quantity,
          );
        } catch (rollbackError) {
          this.logger.error(
            `Failed to rollback reservation for product ${rollbackItem.productId}: ${(rollbackError as Error).message}`,
          );
        }
      }

      if ((error as Error).message.includes('not found')) {
        throw new NotFoundException((error as Error).message);
      }
      if ((error as Error).message.includes('Insufficient')) {
        throw new BadRequestException((error as Error).message);
      }
      throw error;
    }
  }

  async releaseStock(dto: ReleaseStockDto, performedBy: string): Promise<{
    released: boolean;
    items: Array<{
      productId: string;
      storeLocationId: string;
      quantity: number;
      availableAfter: number;
    }>;
  }> {
    const releasedItems: Array<{
      productId: string;
      storeLocationId: string;
      quantity: number;
      availableAfter: number;
    }> = [];

    try {
      for (const item of dto.items) {
        const stock = await this.repository.releaseStock(
          item.product_id,
          item.store_location_id,
          item.quantity,
          performedBy,
          item.variant_id,
          'order_cancelled',
          dto.reference_id,
        );

        const availableAfter = stock.quantity - stock.reservedQuantity;

        await this.stockCache.atomicRelease(
          item.product_id,
          item.store_location_id,
          item.quantity,
        );

        await this.stockCache.setStockLevel(
          item.product_id,
          item.store_location_id,
          availableAfter,
        );

        releasedItems.push({
          productId: item.product_id,
          storeLocationId: item.store_location_id,
          quantity: item.quantity,
          availableAfter,
        });
      }

      await this.kafkaProducer.publishEvent(
        KAFKA_TOPICS.INVENTORY_RELEASED,
        'released',
        {
          items: releasedItems,
          referenceId: dto.reference_id,
          performedBy,
        },
        dto.reference_id,
      );

      return {
        released: true,
        items: releasedItems,
      };
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        throw new NotFoundException((error as Error).message);
      }
      if ((error as Error).message.includes('Cannot release')) {
        throw new BadRequestException((error as Error).message);
      }
      throw error;
    }
  }

  async getLowStockItems(
    storeLocationId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: StockEntity[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.repository.findLowStock(storeLocationId, page, limit);
    return { items, total, page, limit };
  }

  async getMovements(
    stockId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: StockMovementEntity[]; total: number; page: number; limit: number }> {
    const stock = await this.repository.findStockById(stockId);
    if (!stock) {
      throw new NotFoundException(`Stock record not found: ${stockId}`);
    }

    const { items, total } = await this.repository.findMovementsByStockId(stockId, page, limit);
    return { items, total, page, limit };
  }

  // ── Admin Methods ──────────────────────────────────────────────

  async adminListStock(query: AdminStockQueryDto) {
    const { items, total } = await this.repository.findAllStockAdmin(query);
    return {
      success: true,
      data: items,
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (query.limit ?? 20)),
      },
    };
  }

  async adminGetStats() {
    const stats = await this.repository.getInventoryStats();
    return {
      success: true,
      data: stats,
    };
  }

  async adminListMovements(query: AdminMovementsQueryDto) {
    const { items, total } = await this.repository.findMovementsAdmin(query);
    return {
      success: true,
      data: items,
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (query.limit ?? 20)),
      },
    };
  }

  private async publishOutOfStockEvent(stock: StockEntity): Promise<void> {
    try {
      await this.kafkaProducer.publishEvent(
        KAFKA_TOPICS.INVENTORY_OUT_OF_STOCK,
        'out_of_stock',
        {
          stockId: stock.id,
          productId: stock.productId,
          variantId: stock.variantId,
          storeLocationId: stock.storeLocationId,
          currentQuantity: stock.quantity,
          reservedQuantity: stock.reservedQuantity,
        },
        stock.productId,
      );

      this.logger.warn(
        `Out of stock: product ${stock.productId} at ${stock.storeLocationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish out_of_stock event for product ${stock.productId}: ${(error as Error).message}`,
      );
    }
  }

  private async publishRestockedEvent(stock: StockEntity): Promise<void> {
    try {
      await this.kafkaProducer.publishEvent(
        KAFKA_TOPICS.INVENTORY_RESTOCKED,
        'restocked',
        {
          stockId: stock.id,
          productId: stock.productId,
          variantId: stock.variantId,
          storeLocationId: stock.storeLocationId,
          newQuantity: stock.quantity,
          availableQuantity: stock.quantity - stock.reservedQuantity,
        },
        stock.productId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish restocked event for product ${stock.productId}: ${(error as Error).message}`,
      );
    }
  }

  private async publishLowStockEvent(stock: StockEntity): Promise<void> {
    try {
      await this.kafkaProducer.publishEvent(
        KAFKA_TOPICS.INVENTORY_LOW,
        'low',
        {
          stockId: stock.id,
          productId: stock.productId,
          variantId: stock.variantId,
          storeLocationId: stock.storeLocationId,
          currentQuantity: stock.quantity,
          reservedQuantity: stock.reservedQuantity,
          availableQuantity: stock.quantity - stock.reservedQuantity,
          reorderPoint: stock.reorderPoint,
          reorderQuantity: stock.reorderQuantity,
        },
        stock.productId,
      );

      this.logger.warn(
        `Low stock alert: product ${stock.productId} at ${stock.storeLocationId}. ` +
        `Available: ${stock.quantity - stock.reservedQuantity}, Reorder point: ${stock.reorderPoint}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish low stock event for product ${stock.productId}: ${(error as Error).message}`,
      );
    }
  }
}
