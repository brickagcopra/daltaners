import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: Producer;
  private readonly kafka: Kafka;

  constructor(private readonly configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'daltaners-delivery-service',
      brokers: (this.configService.get('KAFKA_BROKERS', 'localhost:9092')).split(','),
    });
    this.producer = this.kafka.producer();
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

  async publish(topic: string, type: string, data: Record<string, unknown>): Promise<void> {
    const event = {
      specversion: '1.0',
      id: uuidv4(),
      source: 'daltaners/delivery-service',
      type,
      datacontenttype: 'application/json',
      time: new Date().toISOString(),
      data,
    };

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: (data.id as string) || event.id,
          value: JSON.stringify(event),
        },
      ],
      acks: -1,
    };

    try {
      await this.producer.send(record);
      this.logger.log(`Published event ${type} to ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${type} to ${topic}`, (error as Error).stack);
      throw error;
    }
  }
}
