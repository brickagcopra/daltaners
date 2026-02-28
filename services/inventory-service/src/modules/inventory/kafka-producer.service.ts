import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, CompressionTypes } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

export interface DaltanersEvent<T> {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  datacontenttype: 'application/json';
  time: string;
  data: T;
}

export const KAFKA_TOPICS = {
  INVENTORY_LOW: 'daltaners.inventory.low',
  INVENTORY_OUT_OF_STOCK: 'daltaners.inventory.out_of_stock',
  INVENTORY_RESTOCKED: 'daltaners.inventory.restocked',
  INVENTORY_RESERVED: 'daltaners.inventory.reserved',
  INVENTORY_RELEASED: 'daltaners.inventory.released',
  INVENTORY_ADJUSTED: 'daltaners.inventory.adjusted',
} as const;

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor() {
    const kafka = new Kafka({
      clientId: 'daltaners-inventory-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = kafka.producer({
      allowAutoTopicCreation: true,
      idempotent: true,
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.logger.error(`Failed to connect Kafka producer: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    } catch (error) {
      this.logger.error(`Failed to disconnect Kafka producer: ${(error as Error).message}`);
    }
  }

  async publish(topic: string, message: { key?: string; value: string }): Promise<void> {
    try {
      await this.producer.send({
        topic,
        compression: CompressionTypes.GZIP,
        messages: [message],
        acks: -1,
      });
      this.logger.debug(`Published message to ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish to ${topic}: ${(error as Error).message}`);
      throw error;
    }
  }

  async publishEvent<T>(topic: string, type: string, data: T, key?: string): Promise<void> {
    const event: DaltanersEvent<T> = {
      specversion: '1.0',
      id: uuidv4(),
      source: 'daltaners/inventory-service',
      type: `com.daltaners.inventory.${type}`,
      datacontenttype: 'application/json',
      time: new Date().toISOString(),
      data,
    };

    await this.publish(topic, {
      key,
      value: JSON.stringify(event),
    });
  }
}
