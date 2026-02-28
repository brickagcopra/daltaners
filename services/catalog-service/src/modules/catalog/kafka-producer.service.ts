import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { DaltanersEvent } from './events/catalog.events';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor(private readonly configService: ConfigService) {
    const kafka = new Kafka({
      clientId: 'catalog-service',
      brokers: (this.configService.get<string>('KAFKA_BROKERS', 'localhost:9092')).split(','),
      logLevel: logLevel.WARN,
      retry: {
        initialRetryTime: 1000,
        retries: 3,
      },
    });

    this.producer = kafka.producer({
      allowAutoTopicCreation: false,
      idempotent: true,
      maxInFlightRequests: 5,
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
    await this.producer.disconnect();
  }

  async publish<T>(topic: string, eventType: string, data: T): Promise<void> {
    const event: DaltanersEvent<T> = {
      specversion: '1.0',
      id: uuidv4(),
      source: 'daltaners/catalog-service',
      type: `com.daltaners.catalog.${eventType}`,
      datacontenttype: 'application/json',
      time: new Date().toISOString(),
      data,
    };

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.id,
            value: JSON.stringify(event),
            headers: {
              'event-type': eventType,
              'content-type': 'application/json',
            },
          },
        ],
        acks: -1,
      });
      this.logger.log(`Published event ${eventType} to ${topic} [id=${event.id}]`);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${(error as Error).message}`);
      throw error;
    }
  }
}
