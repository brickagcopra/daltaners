import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor() {
    const kafka = new Kafka({
      clientId: 'daltaners-vendor-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', (error as Error).stack);
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    } catch (error) {
      this.logger.error('Failed to disconnect Kafka producer', (error as Error).stack);
    }
  }

  async publish(topic: string, message: { key?: string; value: string }): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [message],
      });
      this.logger.log(`Published message to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish to topic ${topic}`, (error as Error).stack);
      throw error;
    }
  }
}
