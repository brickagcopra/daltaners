import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { InventoryRepository } from './inventory.repository';
import { StockCacheService } from './stock-cache.service';
import { KafkaProducerService, KAFKA_TOPICS } from './kafka-producer.service';

interface OrderCancelledEventData {
  orderId: string;
  items: Array<{
    product_id: string;
    variant_id?: string | null;
    store_location_id: string;
    quantity: number;
  }>;
  userId: string;
}

interface OrderEventEnvelope {
  specversion: string;
  id: string;
  source: string;
  type: string;
  datacontenttype: string;
  time: string;
  data: OrderCancelledEventData;
}

@Injectable()
export class InventoryConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;
  private readonly logger = new Logger(InventoryConsumer.name);
  private readonly processedEventIds = new Set<string>();

  constructor(
    private readonly repository: InventoryRepository,
    private readonly stockCache: StockCacheService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {
    const kafka = new Kafka({
      clientId: 'daltaners-inventory-consumer',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.consumer = kafka.consumer({
      groupId: 'daltaners-inventory-service-order-events-group',
    });
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: 'daltaners.orders.events',
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.logger.log('Inventory consumer connected and listening to daltaners.orders.events');
    } catch (error) {
      this.logger.error(`Failed to start inventory consumer: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      this.logger.log('Inventory consumer disconnected');
    } catch (error) {
      this.logger.error(`Failed to disconnect inventory consumer: ${(error as Error).message}`);
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    if (!message.value) {
      this.logger.warn(`Empty message received on ${topic}:${partition}`);
      return;
    }

    let event: OrderEventEnvelope;
    try {
      event = JSON.parse(message.value.toString()) as OrderEventEnvelope;
    } catch (error) {
      this.logger.error(
        `Failed to parse message on ${topic}:${partition}: ${(error as Error).message}`,
      );
      return;
    }

    if (this.processedEventIds.has(event.id)) {
      this.logger.debug(`Duplicate event ${event.id} skipped`);
      return;
    }

    try {
      if (event.type === 'com.daltaners.orders.cancelled') {
        await this.handleOrderCancelled(event);
      } else {
        this.logger.debug(`Ignoring event type: ${event.type}`);
      }

      this.processedEventIds.add(event.id);

      if (this.processedEventIds.size > 10000) {
        const iterator = this.processedEventIds.values();
        for (let i = 0; i < 5000; i++) {
          const result = iterator.next();
          if (result.done) break;
          this.processedEventIds.delete(result.value);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process event ${event.id} (type: ${event.type}): ${(error as Error).message}`,
      );
    }
  }

  private async handleOrderCancelled(event: OrderEventEnvelope): Promise<void> {
    const { data } = event;
    this.logger.log(`Processing order cancelled event for order ${data.orderId}`);

    const releasedItems: Array<{
      productId: string;
      storeLocationId: string;
      quantity: number;
      availableAfter: number;
    }> = [];

    for (const item of data.items) {
      try {
        const stock = await this.repository.releaseStock(
          item.product_id,
          item.store_location_id,
          item.quantity,
          data.userId,
          item.variant_id,
          'order_cancelled',
          data.orderId,
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

        this.logger.log(
          `Released ${item.quantity} units of product ${item.product_id} at ${item.store_location_id} for cancelled order ${data.orderId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to release stock for product ${item.product_id} at ${item.store_location_id} ` +
          `for cancelled order ${data.orderId}: ${(error as Error).message}`,
        );
      }
    }

    if (releasedItems.length > 0) {
      try {
        await this.kafkaProducer.publishEvent(
          KAFKA_TOPICS.INVENTORY_RELEASED,
          'released',
          {
            items: releasedItems,
            referenceId: data.orderId,
            reason: 'order_cancelled',
            performedBy: data.userId,
          },
          data.orderId,
        );
      } catch (error) {
        this.logger.error(
          `Failed to publish inventory released event for order ${data.orderId}: ${(error as Error).message}`,
        );
      }
    }
  }
}
