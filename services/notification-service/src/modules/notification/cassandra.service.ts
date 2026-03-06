import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CassandraService implements OnModuleInit, OnModuleDestroy {
  private client: Client;
  private readonly logger = new Logger(CassandraService.name);
  private connected = false;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      contactPoints: [this.configService.get('CASSANDRA_HOST', 'localhost')],
      localDataCenter: this.configService.get('CASSANDRA_DATACENTER', 'dc1'),
      keyspace: this.configService.get('CASSANDRA_KEYSPACE', 'daltaners_tracking'),
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.connected = true;
      this.logger.log('Connected to CassandraDB');
      await this.ensureTable();
    } catch (error) {
      this.logger.warn('CassandraDB connection failed - notifications will not be persisted');
    }
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.client.shutdown();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async execute(query: string, params?: unknown[]) {
    if (!this.connected) {
      this.logger.warn('CassandraDB not connected - skipping query');
      return null;
    }
    return this.client.execute(query, params, { prepare: true });
  }

  getClient(): Client {
    return this.client;
  }

  private async ensureTable(): Promise<void> {
    try {
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS notification_log (
          user_id uuid,
          notification_id uuid,
          channel text,
          title text,
          body text,
          data text,
          status text,
          sent_at timestamp,
          read_at timestamp,
          PRIMARY KEY ((user_id), sent_at, notification_id)
        ) WITH CLUSTERING ORDER BY (sent_at DESC, notification_id ASC)
          AND default_time_to_live = 7776000
          AND compaction = { 'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': 7, 'compaction_window_unit': 'DAYS' }
      `);
      this.logger.log('CassandraDB notification_log table verified');
    } catch (error) {
      this.logger.warn('Failed to create/verify notification_log table');
    }
  }
}
