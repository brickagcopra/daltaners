import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockEntity } from './entities/stock.entity';
import { StockMovementEntity, MovementType } from './entities/stock-movement.entity';
import { StockQueryDto } from './dto/stock-query.dto';

export interface CreateStockParams {
  productId: string;
  variantId?: string | null;
  storeLocationId: string;
  quantity: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  batchNumber?: string | null;
  expiryDate?: Date | null;
}

export interface CreateMovementParams {
  stockId: string;
  movementType: MovementType;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  performedBy?: string | null;
}

@Injectable()
export class InventoryRepository {
  private readonly logger = new Logger(InventoryRepository.name);

  constructor(
    @InjectRepository(StockEntity)
    private readonly stockRepo: Repository<StockEntity>,
    @InjectRepository(StockMovementEntity)
    private readonly movementRepo: Repository<StockMovementEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createStock(params: CreateStockParams): Promise<StockEntity> {
    const stock = this.stockRepo.create({
      productId: params.productId,
      variantId: params.variantId || null,
      storeLocationId: params.storeLocationId,
      quantity: params.quantity,
      reorderPoint: params.reorderPoint ?? 10,
      reorderQuantity: params.reorderQuantity ?? 50,
      batchNumber: params.batchNumber || null,
      expiryDate: params.expiryDate || null,
      lastRestockedAt: params.quantity > 0 ? new Date() : null,
    });
    return this.stockRepo.save(stock);
  }

  async findStockById(id: string): Promise<StockEntity | null> {
    return this.stockRepo.findOne({ where: { id } });
  }

  async findStockByProductAndLocation(
    productId: string,
    storeLocationId: string,
    variantId?: string | null,
  ): Promise<StockEntity | null> {
    const where: Record<string, unknown> = {
      productId,
      storeLocationId,
    };
    if (variantId) {
      where.variantId = variantId;
    }
    return this.stockRepo.findOne({ where });
  }

  async findStocksByLocation(
    query: StockQueryDto,
  ): Promise<{ items: StockEntity[]; total: number }> {
    const qb = this.stockRepo.createQueryBuilder('stock');

    if (query.store_location_id) {
      qb.andWhere('stock.store_location_id = :storeLocationId', {
        storeLocationId: query.store_location_id,
      });
    }

    if (query.product_id) {
      qb.andWhere('stock.product_id = :productId', {
        productId: query.product_id,
      });
    }

    if (query.low_stock_only) {
      qb.andWhere('(stock.quantity - stock.reserved_quantity) <= stock.reorder_point');
    }

    if (query.cursor) {
      qb.andWhere('stock.id > :cursor', { cursor: query.cursor });
    }

    qb.orderBy('stock.id', 'ASC');

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findLowStock(
    storeLocationId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: StockEntity[]; total: number }> {
    const qb = this.stockRepo.createQueryBuilder('stock');
    qb.where('(stock.quantity - stock.reserved_quantity) <= stock.reorder_point');

    if (storeLocationId) {
      qb.andWhere('stock.store_location_id = :storeLocationId', { storeLocationId });
    }

    qb.orderBy('stock.quantity', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async createMovement(params: CreateMovementParams): Promise<StockMovementEntity> {
    const movement = this.movementRepo.create({
      stockId: params.stockId,
      movementType: params.movementType,
      quantity: params.quantity,
      referenceType: params.referenceType || null,
      referenceId: params.referenceId || null,
      notes: params.notes || null,
      performedBy: params.performedBy || null,
    });
    return this.movementRepo.save(movement);
  }

  async findMovementsByStockId(
    stockId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: StockMovementEntity[]; total: number }> {
    const [items, total] = await this.movementRepo.findAndCount({
      where: { stockId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async adjustStock(
    productId: string,
    storeLocationId: string,
    quantity: number,
    performedBy: string,
    variantId?: string | null,
    notes?: string | null,
    referenceType?: string | null,
    referenceId?: string | null,
  ): Promise<StockEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const where: Record<string, unknown> = { productId, storeLocationId };
      if (variantId) {
        where.variantId = variantId;
      }

      const stock = await queryRunner.manager.findOne(StockEntity, {
        where,
        lock: { mode: 'pessimistic_write' },
      });

      if (!stock) {
        throw new Error(
          `Stock record not found for product ${productId} at location ${storeLocationId}`,
        );
      }

      const newQuantity = stock.quantity + quantity;
      if (newQuantity < 0) {
        throw new Error(
          `Insufficient stock. Current: ${stock.quantity}, Adjustment: ${quantity}`,
        );
      }

      stock.quantity = newQuantity;
      if (quantity > 0) {
        stock.lastRestockedAt = new Date();
      }

      await queryRunner.manager.save(StockEntity, stock);

      const movementType = quantity > 0 ? MovementType.IN : quantity < 0 ? MovementType.OUT : MovementType.ADJUSTMENT;

      const movement = queryRunner.manager.create(StockMovementEntity, {
        stockId: stock.id,
        movementType,
        quantity: Math.abs(quantity),
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        notes: notes || null,
        performedBy,
      });

      await queryRunner.manager.save(StockMovementEntity, movement);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Stock adjusted for product ${productId} at ${storeLocationId}: ${quantity > 0 ? '+' : ''}${quantity}. New total: ${stock.quantity}`,
      );

      return stock;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reserveStock(
    productId: string,
    storeLocationId: string,
    quantity: number,
    performedBy: string,
    variantId?: string | null,
    referenceType?: string | null,
    referenceId?: string | null,
  ): Promise<StockEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const where: Record<string, unknown> = { productId, storeLocationId };
      if (variantId) {
        where.variantId = variantId;
      }

      const stock = await queryRunner.manager.findOne(StockEntity, {
        where,
        lock: { mode: 'pessimistic_write' },
      });

      if (!stock) {
        throw new Error(
          `Stock record not found for product ${productId} at location ${storeLocationId}`,
        );
      }

      const available = stock.quantity - stock.reservedQuantity;
      if (available < quantity) {
        throw new Error(
          `Insufficient stock for reservation. Available: ${available}, Requested: ${quantity}`,
        );
      }

      stock.reservedQuantity += quantity;
      await queryRunner.manager.save(StockEntity, stock);

      const movement = queryRunner.manager.create(StockMovementEntity, {
        stockId: stock.id,
        movementType: MovementType.RESERVATION,
        quantity,
        referenceType: referenceType || 'order',
        referenceId: referenceId || null,
        notes: `Reserved ${quantity} units`,
        performedBy,
      });

      await queryRunner.manager.save(StockMovementEntity, movement);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Stock reserved for product ${productId} at ${storeLocationId}: ${quantity} units`,
      );

      return stock;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async releaseStock(
    productId: string,
    storeLocationId: string,
    quantity: number,
    performedBy: string,
    variantId?: string | null,
    referenceType?: string | null,
    referenceId?: string | null,
  ): Promise<StockEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const where: Record<string, unknown> = { productId, storeLocationId };
      if (variantId) {
        where.variantId = variantId;
      }

      const stock = await queryRunner.manager.findOne(StockEntity, {
        where,
        lock: { mode: 'pessimistic_write' },
      });

      if (!stock) {
        throw new Error(
          `Stock record not found for product ${productId} at location ${storeLocationId}`,
        );
      }

      if (stock.reservedQuantity < quantity) {
        throw new Error(
          `Cannot release more than reserved. Reserved: ${stock.reservedQuantity}, Releasing: ${quantity}`,
        );
      }

      stock.reservedQuantity -= quantity;
      await queryRunner.manager.save(StockEntity, stock);

      const movement = queryRunner.manager.create(StockMovementEntity, {
        stockId: stock.id,
        movementType: MovementType.RELEASE,
        quantity,
        referenceType: referenceType || 'order_cancelled',
        referenceId: referenceId || null,
        notes: `Released ${quantity} reserved units`,
        performedBy,
      });

      await queryRunner.manager.save(StockMovementEntity, movement);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Stock released for product ${productId} at ${storeLocationId}: ${quantity} units`,
      );

      return stock;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
