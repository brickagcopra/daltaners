import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CassandraService } from './cassandra.service';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

export interface NotificationLogEntry {
  user_id: string;
  notification_id: string;
  channel: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  status: string;
  sent_at: Date;
  read_at: Date | null;
}

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(
    @InjectRepository(NotificationPreferenceEntity)
    private readonly preferencesRepo: Repository<NotificationPreferenceEntity>,
    private readonly cassandraService: CassandraService,
  ) {}

  // --- CassandraDB: Notification Log ---

  async logNotification(
    userId: string,
    channel: string,
    title: string,
    body: string,
    data: Record<string, unknown> | null,
    status: string,
  ): Promise<string> {
    const notificationId = uuidv4();
    const sentAt = new Date();

    try {
      await this.cassandraService.execute(
        `INSERT INTO notification_log (user_id, notification_id, channel, title, body, data, status, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          notificationId,
          channel,
          title,
          body,
          data ? JSON.stringify(data) : null,
          status,
          sentAt,
        ],
      );
    } catch (error) {
      this.logger.error(`Failed to log notification for user ${userId}: ${error}`);
    }

    return notificationId;
  }

  async getNotifications(
    userId: string,
    limit: number = 20,
    channel?: string,
    status?: string,
  ): Promise<NotificationLogEntry[]> {
    try {
      let query = 'SELECT * FROM notification_log WHERE user_id = ?';
      const params: unknown[] = [userId];

      // CassandraDB does not support arbitrary WHERE clauses without proper indexes.
      // Filtering by channel/status is done in-memory after fetching by partition key.
      query += ' LIMIT ?';
      // Fetch more if filtering to ensure we have enough results after filtering
      const fetchLimit = (channel || status) ? limit * 3 : limit;
      params.push(fetchLimit);

      const result = await this.cassandraService.execute(query, params);

      if (!result || !result.rows) {
        return [];
      }

      let rows = result.rows.map((row) => ({
        user_id: row['user_id']?.toString(),
        notification_id: row['notification_id']?.toString(),
        channel: row['channel'] as string,
        title: row['title'] as string,
        body: row['body'] as string,
        data: row['data'] ? JSON.parse(row['data'] as string) : null,
        status: row['status'] as string,
        sent_at: row['sent_at'] as Date,
        read_at: row['read_at'] as Date | null,
      }));

      // Apply in-memory filters
      if (channel) {
        rows = rows.filter((r) => r.channel === channel);
      }
      if (status) {
        if (status === 'read') {
          rows = rows.filter((r) => r.status === 'read');
        } else if (status === 'unread') {
          rows = rows.filter((r) => r.status !== 'read');
        }
      }

      return rows.slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to fetch notifications for user ${userId}: ${error}`);
      return [];
    }
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      // First retrieve the notification to get the sent_at for the clustering key
      const findResult = await this.cassandraService.execute(
        `SELECT sent_at FROM notification_log WHERE user_id = ? AND notification_id = ? ALLOW FILTERING`,
        [userId, notificationId],
      );

      if (!findResult || !findResult.rows || findResult.rows.length === 0) {
        return false;
      }

      const sentAt = findResult.rows[0]['sent_at'];

      await this.cassandraService.execute(
        `UPDATE notification_log SET status = ?, read_at = ? WHERE user_id = ? AND sent_at = ? AND notification_id = ?`,
        ['read', new Date(), userId, sentAt, notificationId],
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to mark notification ${notificationId} as read for user ${userId}: ${error}`,
      );
      return false;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await this.cassandraService.execute(
        `SELECT notification_id, status FROM notification_log WHERE user_id = ? LIMIT ?`,
        [userId, 100],
      );

      if (!result || !result.rows) {
        return 0;
      }

      return result.rows.filter((row) => row['status'] !== 'read').length;
    } catch (error) {
      this.logger.error(`Failed to get unread count for user ${userId}: ${error}`);
      return 0;
    }
  }

  // --- PostgreSQL: Notification Preferences ---

  async getPreferences(userId: string): Promise<NotificationPreferenceEntity | null> {
    return this.preferencesRepo.findOne({ where: { user_id: userId } });
  }

  async updatePreferences(
    userId: string,
    prefs: UpdatePreferencesDto,
  ): Promise<NotificationPreferenceEntity> {
    let existing = await this.preferencesRepo.findOne({ where: { user_id: userId } });

    if (!existing) {
      // Create default preferences for the user
      existing = this.preferencesRepo.create({
        user_id: userId,
        push_enabled: true,
        email_enabled: true,
        sms_enabled: true,
        order_updates: true,
        promotions: true,
        delivery_updates: true,
      });
    }

    // Apply partial updates
    if (prefs.push_enabled !== undefined) existing.push_enabled = prefs.push_enabled;
    if (prefs.email_enabled !== undefined) existing.email_enabled = prefs.email_enabled;
    if (prefs.sms_enabled !== undefined) existing.sms_enabled = prefs.sms_enabled;
    if (prefs.order_updates !== undefined) existing.order_updates = prefs.order_updates;
    if (prefs.promotions !== undefined) existing.promotions = prefs.promotions;
    if (prefs.delivery_updates !== undefined) existing.delivery_updates = prefs.delivery_updates;

    return this.preferencesRepo.save(existing);
  }

  async getOrCreatePreferences(userId: string): Promise<NotificationPreferenceEntity> {
    let prefs = await this.preferencesRepo.findOne({ where: { user_id: userId } });

    if (!prefs) {
      prefs = this.preferencesRepo.create({
        user_id: userId,
        push_enabled: true,
        email_enabled: true,
        sms_enabled: true,
        order_updates: true,
        promotions: true,
        delivery_updates: true,
      });
      prefs = await this.preferencesRepo.save(prefs);
    }

    return prefs;
  }
}
