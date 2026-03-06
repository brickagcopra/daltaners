import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
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

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private readonly configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'loyalty-service-producer',
      brokers: (this.configService.get('KAFKA_BROKERS', 'localhost:9092')).split(','),
    });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      idempotent: true,
    });
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
    await this.producer.disconnect();
  }

  async publish<T>(topic: string, eventType: string, data: T, key?: string): Promise<void> {
    const event: DaltanersEvent<T> = {
      specversion: '1.0',
      id: uuidv4(),
      source: 'daltaners/loyalty-service',
      type: `com.daltaners.loyalty.${eventType}`,
      datacontenttype: 'application/json',
      time: new Date().toISOString(),
      data,
    };

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: key || event.id,
          value: JSON.stringify(event),
          headers: {
            'event-type': eventType,
            'content-type': 'application/json',
          },
        },
      ],
      acks: -1,
    };

    try {
      await this.producer.send(record);
      this.logger.log(`Published event ${eventType} to ${topic} [id=${event.id}]`);
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${eventType} to ${topic}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
