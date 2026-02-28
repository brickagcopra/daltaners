import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from '../notification.service';
import { NotificationRepository } from '../notification.repository';
import { PushNotificationService } from '../channels/push.service';
import { EmailService } from '../channels/email.service';
import { SmsService } from '../channels/sms.service';
import { RedisService } from '../redis.service';
import { NotificationPreferenceEntity } from '../entities/notification-preference.entity';

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: jest.Mocked<NotificationRepository>;
  let pushService: jest.Mocked<PushNotificationService>;
  let emailService: jest.Mocked<EmailService>;
  let smsService: jest.Mocked<SmsService>;
  let redisService: jest.Mocked<RedisService>;

  const userId = 'user-uuid-1';

  const mockPrefs: Partial<NotificationPreferenceEntity> = {
    user_id: userId,
    push_enabled: true,
    email_enabled: true,
    sms_enabled: true,
    order_updates: true,
    promotions: true,
    delivery_updates: true,
    updated_at: new Date(),
  };

  const mockNotification = {
    notification_id: 'notif-uuid-1',
    user_id: userId,
    channel: 'push',
    title: 'Order Update',
    body: 'Your order has been confirmed',
    data: null,
    status: 'sent',
    sent_at: new Date(),
    read_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NotificationRepository,
          useValue: {
            logNotification: jest.fn(),
            getNotifications: jest.fn(),
            markAsRead: jest.fn(),
            getPreferences: jest.fn(),
            getOrCreatePreferences: jest.fn(),
            updatePreferences: jest.fn(),
            getUnreadCount: jest.fn(),
          },
        },
        {
          provide: PushNotificationService,
          useValue: { send: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: { send: jest.fn() },
        },
        {
          provide: SmsService,
          useValue: { send: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    repository = module.get(NotificationRepository);
    pushService = module.get(PushNotificationService);
    emailService = module.get(EmailService);
    smsService = module.get(SmsService);
    redisService = module.get(RedisService);
  });

  // ============================================================
  // Send Notification
  // ============================================================
  describe('sendNotification', () => {
    it('should send push notification successfully', async () => {
      repository.getPreferences.mockResolvedValue(mockPrefs as NotificationPreferenceEntity);
      pushService.send.mockResolvedValue(true);
      repository.logNotification.mockResolvedValue('notif-uuid-1');

      const result = await service.sendNotification(userId, 'push', 'Title', 'Body');

      expect(result.notificationId).toBe('notif-uuid-1');
      expect(result.delivered).toBe(true);
      expect(pushService.send).toHaveBeenCalledWith(userId, 'Title', 'Body', undefined);
    });

    it('should send email notification successfully', async () => {
      repository.getPreferences.mockResolvedValue(mockPrefs as NotificationPreferenceEntity);
      emailService.send.mockResolvedValue(true);
      repository.logNotification.mockResolvedValue('notif-uuid-2');

      const result = await service.sendNotification(userId, 'email', 'Title', 'Body');

      expect(result.delivered).toBe(true);
      expect(emailService.send).toHaveBeenCalledWith(userId, 'Title', 'Body');
    });

    it('should send SMS notification successfully', async () => {
      repository.getPreferences.mockResolvedValue(mockPrefs as NotificationPreferenceEntity);
      smsService.send.mockResolvedValue(true);
      repository.logNotification.mockResolvedValue('notif-uuid-3');

      const result = await service.sendNotification(userId, 'sms', 'Title', 'Body');

      expect(result.delivered).toBe(true);
      expect(smsService.send).toHaveBeenCalledWith(userId, 'Body');
    });

    it('should skip push when push_enabled is false', async () => {
      repository.getPreferences.mockResolvedValue({
        ...mockPrefs,
        push_enabled: false,
      } as NotificationPreferenceEntity);

      const result = await service.sendNotification(userId, 'push', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(pushService.send).not.toHaveBeenCalled();
    });

    it('should skip email when email_enabled is false', async () => {
      repository.getPreferences.mockResolvedValue({
        ...mockPrefs,
        email_enabled: false,
      } as NotificationPreferenceEntity);

      const result = await service.sendNotification(userId, 'email', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('should skip sms when sms_enabled is false', async () => {
      repository.getPreferences.mockResolvedValue({
        ...mockPrefs,
        sms_enabled: false,
      } as NotificationPreferenceEntity);

      const result = await service.sendNotification(userId, 'sms', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(smsService.send).not.toHaveBeenCalled();
    });

    it('should proceed when no preferences exist', async () => {
      repository.getPreferences.mockResolvedValue(null);
      pushService.send.mockResolvedValue(true);
      repository.logNotification.mockResolvedValue('notif-uuid-4');

      const result = await service.sendNotification(userId, 'push', 'Title', 'Body');

      expect(result.delivered).toBe(true);
    });

    it('should log notification even when delivery fails', async () => {
      repository.getPreferences.mockResolvedValue(null);
      pushService.send.mockRejectedValue(new Error('FCM error'));
      repository.logNotification.mockResolvedValue('notif-uuid-5');

      const result = await service.sendNotification(userId, 'push', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(repository.logNotification).toHaveBeenCalledWith(
        userId, 'push', 'Title', 'Body', null, 'failed',
      );
    });

    it('should invalidate unread count cache after sending', async () => {
      repository.getPreferences.mockResolvedValue(null);
      pushService.send.mockResolvedValue(true);
      repository.logNotification.mockResolvedValue('notif-uuid-6');

      await service.sendNotification(userId, 'push', 'Title', 'Body');

      expect(redisService.del).toHaveBeenCalledWith(`notification:unread:${userId}`);
    });
  });

  // ============================================================
  // Get Notifications
  // ============================================================
  describe('getNotifications', () => {
    it('should return notifications with unread count', async () => {
      repository.getNotifications.mockResolvedValue([mockNotification as any]);
      redisService.get.mockResolvedValue('5');

      const result = await service.getNotifications(userId, 20);

      expect(result.notifications).toHaveLength(1);
      expect(result.unreadCount).toBe(5);
    });

    it('should fetch unread count from Cassandra when not cached', async () => {
      repository.getNotifications.mockResolvedValue([]);
      redisService.get.mockResolvedValue(null);
      repository.getUnreadCount.mockResolvedValue(3);

      const result = await service.getNotifications(userId);

      expect(result.unreadCount).toBe(3);
      expect(redisService.set).toHaveBeenCalledWith(
        `notification:unread:${userId}`,
        '3',
        300,
      );
    });
  });

  // ============================================================
  // Mark As Read
  // ============================================================
  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      repository.markAsRead.mockResolvedValue(true);

      const result = await service.markAsRead(userId, 'notif-uuid-1');

      expect(result.success).toBe(true);
      expect(redisService.del).toHaveBeenCalledWith(`notification:unread:${userId}`);
    });

    it('should throw NotFoundException when notification not found', async () => {
      repository.markAsRead.mockResolvedValue(false);

      await expect(
        service.markAsRead(userId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // Preferences
  // ============================================================
  describe('getPreferences', () => {
    it('should return or create preferences', async () => {
      repository.getOrCreatePreferences.mockResolvedValue(mockPrefs as NotificationPreferenceEntity);

      const result = await service.getPreferences(userId);
      expect(result).toEqual(mockPrefs);
    });
  });

  describe('updatePreferences', () => {
    it('should update and cache preferences', async () => {
      const updated = { ...mockPrefs, push_enabled: false };
      repository.updatePreferences.mockResolvedValue(updated as NotificationPreferenceEntity);

      const result = await service.updatePreferences(userId, { push_enabled: false });

      expect(result.push_enabled).toBe(false);
      expect(redisService.set).toHaveBeenCalledWith(
        `notification:prefs:${userId}`,
        JSON.stringify(updated),
        3600,
      );
    });
  });

  // ============================================================
  // Broadcast
  // ============================================================
  describe('broadcastToRole', () => {
    it('should queue broadcast for specific role', async () => {
      const result = await service.broadcastToRole('customer', 'Sale!', '50% off today', 'push');

      expect(result.queued).toBe(true);
      expect(result.targetRole).toBe('customer');
    });

    it('should queue broadcast for all roles when role is undefined', async () => {
      const result = await service.broadcastToRole(undefined, 'System', 'Maintenance', 'email');

      expect(result.queued).toBe(true);
      expect(result.targetRole).toBeNull();
    });
  });
});
