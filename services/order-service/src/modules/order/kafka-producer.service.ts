import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private readonly configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'order-service-producer',
      brokers: (this.configService.get('KAFKA_BROKERS', 'localhost:9092')).split(','),
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async publish<T>(topic: string, eventType: string, data: T, key?: string): Promise<void> {
    const event: DaltanersEvent<T> = {
      specversion: '1.0',
      id: uuidv4(),
      source: 'daltaners/order-service',
      type: eventType,
      datacontenttype: 'application/json',
      time: new Date().toISOString(),
      data,
    };

    await this.producer.send({
      topic,
      compression: CompressionTypes.GZIP,
      messages: [
        {
          key: key || event.id,
          value: JSON.stringify(event),
          headers: {
            'event-type': eventType,
            'event-id': event.id,
            'event-source': event.source,
          },
        },
      ],
      acks: -1,
    });

    this.logger.log(`Published event ${eventType} to topic ${topic} with id ${event.id}`);
  }
}
