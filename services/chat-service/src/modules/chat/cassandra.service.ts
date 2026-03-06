import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, types, mapping } from 'cassandra-driver';

@Injectable()
export class CassandraService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CassandraService.name);
  private client: Client;

  constructor(private readonly configService: ConfigService) {
    const contactPoints = (
      this.configService.get('CASSANDRA_CONTACT_POINTS', 'localhost')
    ).split(',');

    this.client = new Client({
      contactPoints,
      localDataCenter: this.configService.get('CASSANDRA_DATA_CENTER', 'dc1'),
      keyspace: 'daltaners_tracking',
      protocolOptions: {
        port: this.configService.get<number>('CASSANDRA_PORT', 9042),
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('CassandraDB connected');
    } catch (error) {
      this.logger.error('Failed to connect to CassandraDB', (error as Error).stack);
    }
  }

  async onModuleDestroy() {
    await this.client.shutdown();
  }

  async execute(query: string, params?: unknown[], options?: { prepare?: boolean }) {
    return this.client.execute(query, params, {
      prepare: options?.prepare !== false,
    });
  }

  getClient(): Client {
    return this.client;
  }

  getTimeUuid(): types.TimeUuid {
    return types.TimeUuid.now();
  }

  static fromTimeUuid(value: string): types.TimeUuid {
    return types.TimeUuid.fromString(value);
  }
}
