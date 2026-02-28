import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationRepository, NotificationLogEntry } from './notification.repository';
import { PushNotificationService } from './channels/push.service';
import { EmailService } from './channels/email.service';
import { SmsService } from './channels/sms.service';
import { RedisService } from './redis.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly pushService: PushNotificationService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly redisService: RedisService,
  ) {}

  async sendNotification(
    userId: string,
    channel: 'push' | 'sms' | 'email',
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<{ notificationId: string; delivered: boolean }> {
    // Check user preferences before sending
    const prefs = await this.notificationRepository.getPreferences(userId);

    if (prefs) {
      // Check channel-level preference
      if (channel === 'push' && !prefs.push_enabled) {
        this.logger.log(`Push notifications disabled for user ${userId}, skipping`);
        return { notificationId: '', delivered: false };
      }
      if (channel === 'email' && !prefs.email_enabled) {
        this.logger.log(`Email notifications disabled for user ${userId}, skipping`);
        return { notificationId: '', delivered: false };
      }
      if (channel === 'sms' && !prefs.sms_enabled) {
        this.logger.log(`SMS notifications disabled for user ${userId}, skipping`);
        return { notificationId: '', delivered: false };
      }
    }

    // Dispatch to appropriate channel
    let delivered = false;
    try {
      switch (channel) {
        case 'push':
          delivered = await this.pushService.send(userId, title, body, data);
          break;
        case 'email':
          // In production, look up user email from user service or cache
          delivered = await this.emailService.send(userId, title, body);
          break;
        case 'sms':
          // In production, look up user phone from user service or cache
          delivered = await this.smsService.send(userId, body);
          break;
      }
    } catch (error) {
      this.logger.error(
        `Failed to send ${channel} notification to user ${userId}: ${error}`,
      );
    }

    // Log to CassandraDB
    const status = delivered ? 'sent' : 'failed';
    const notificationId = await this.notificationRepository.logNotification(
      userId,
      channel,
      title,
      body,
      data || null,
      status,
    );

    // Invalidate unread count cache
    await this.invalidateUnreadCountCache(userId);

    return { notificationId, delivered };
  }

  async getNotifications(
    userId: string,
    limit: number = 20,
    channel?: string,
    status?: string,
  ): Promise<{ notifications: NotificationLogEntry[]; unreadCount: number }> {
    const [notifications, unreadCount] = await Promise.all([
      this.notificationRepository.getNotifications(userId, limit, channel, status),
      this.getUnreadCount(userId),
    ]);

    return { notifications, unreadCount };
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<{ success: boolean }> {
    const result = await this.notificationRepository.markAsRead(userId, notificationId);

    if (!result) {
      throw new NotFoundException('Notification not found');
    }

    // Invalidate unread count cache
    await this.invalidateUnreadCountCache(userId);

    return { success: true };
  }

  async getPreferences(userId: string): Promise<NotificationPreferenceEntity> {
    return this.notificationRepository.getOrCreatePreferences(userId);
  }

  async updatePreferences(
    userId: string,
    prefs: UpdatePreferencesDto,
  ): Promise<NotificationPreferenceEntity> {
    const updated = await this.notificationRepository.updatePreferences(userId, prefs);

    // Cache preferences in Redis for fast lookup during event processing
    await this.redisService.set(
      `notification:prefs:${userId}`,
      JSON.stringify(updated),
      3600, // 1 hour TTL
    );

    return updated;
  }

  async broadcastToRole(
    role: string | undefined,
    title: string,
    body: string,
    channel: 'push' | 'sms' | 'email',
  ): Promise<{ queued: boolean; targetRole: string | null }> {
    // In production, this would:
    // 1. Query user-service for all users with the given role
    // 2. Batch the notifications via Kafka for async processing
    // 3. Return immediately with a job ID for tracking
    this.logger.log(
      `[BROADCAST] Channel: ${channel} | Role: ${role || 'all'} | ${title}: ${body}`,
    );

    // For MVP, we log the broadcast intent. Production would use Kafka producer.
    // Example: publish to daltaners.notifications.broadcast topic
    return {
      queued: true,
      targetRole: role || null,
    };
  }

  private async getUnreadCount(userId: string): Promise<number> {
    // Check Redis cache first
    const cached = await this.redisService.get(`notification:unread:${userId}`);
    if (cached !== null) {
      return parseInt(cached, 10);
    }

    // Fetch from CassandraDB
    const count = await this.notificationRepository.getUnreadCount(userId);

    // Cache with 5 minute TTL
    await this.redisService.set(
      `notification:unread:${userId}`,
      count.toString(),
      300,
    );

    return count;
  }

  private async invalidateUnreadCountCache(userId: string): Promise<void> {
    await this.redisService.del(`notification:unread:${userId}`);
  }
}
