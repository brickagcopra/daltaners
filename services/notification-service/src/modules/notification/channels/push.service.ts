import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { RedisService } from '../redis.service';

@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly enabled: boolean;
  private firebaseApp: admin.app.App | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.enabled =
      this.configService.get('FCM_ENABLED', 'false') === 'true';
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log(
        'FCM disabled - push notifications will be logged but not sent',
      );
      return;
    }

    try {
      const projectId = this.configService.get<string>(
        'FIREBASE_PROJECT_ID',
      );
      const clientEmail = this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );
      const privateKey = this.configService.get<string>(
        'FIREBASE_PRIVATE_KEY',
      );

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.error(
          'FCM_ENABLED=true but Firebase credentials are missing',
        );
        return;
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });

      this.logger.log('Firebase Admin SDK initialized for push notifications');
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to initialize Firebase Admin: ${errMsg}`);
    }
  }

  async send(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.enabled || !this.firebaseApp) {
      this.logger.log(
        `[PUSH] (dev) To: ${userId} | ${title}: ${body}${data ? ` | data keys: ${Object.keys(data).join(',')}` : ''}`,
      );
      return true;
    }

    const tokens = await this.getUserDeviceTokens(userId);
    if (tokens.length === 0) {
      this.logger.debug(
        `[PUSH] No device tokens found for user ${userId}, skipping`,
      );
      return false;
    }

    // Convert data values to strings (FCM requires string values)
    const stringData: Record<string, string> = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        stringData[key] =
          typeof value === 'string' ? value : JSON.stringify(value);
      }
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          channelId: 'daltaners_default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const response =
        await this.firebaseApp.messaging().sendEachForMulticast(message);
      this.logger.log(
        `[PUSH] Sent to ${userId}: ${response.successCount}/${tokens.length} succeeded`,
      );

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        await this.cleanupInvalidTokens(userId, tokens, response.responses);
      }

      return response.successCount > 0;
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[PUSH] Failed to send to user ${userId}: ${errMsg}`,
      );
      return false;
    }
  }

  async sendToMultiple(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const result = await this.send(userId, title, body, data);
        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
        this.logger.warn(`[PUSH] Failed to send to user: ${userId}`);
      }
    }

    return { success, failed };
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.enabled || !this.firebaseApp) {
      this.logger.log(
        `[PUSH] (dev) Topic: ${topic} | ${title}: ${body}`,
      );
      return true;
    }

    const stringData: Record<string, string> = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        stringData[key] =
          typeof value === 'string' ? value : JSON.stringify(value);
      }
    }

    try {
      await this.firebaseApp.messaging().send({
        topic,
        notification: { title, body },
        data: stringData,
      });
      this.logger.log(`[PUSH] Sent to topic ${topic}: ${title}`);
      return true;
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[PUSH] Failed to send to topic ${topic}: ${errMsg}`,
      );
      return false;
    }
  }

  async registerDeviceToken(
    userId: string,
    token: string,
    deviceId: string,
  ): Promise<void> {
    const key = `push:tokens:${userId}`;
    // Store as hash: deviceId -> token
    await this.redisService
      .getClient()
      .hset(key, deviceId, token);
    // Set TTL of 90 days (tokens can expire)
    await this.redisService.expire(key, 7776000);
    this.logger.log(
      `[PUSH] Registered device token for user ${userId}, device ${deviceId}`,
    );
  }

  async removeDeviceToken(
    userId: string,
    deviceId: string,
  ): Promise<void> {
    const key = `push:tokens:${userId}`;
    await this.redisService.getClient().hdel(key, deviceId);
    this.logger.log(
      `[PUSH] Removed device token for user ${userId}, device ${deviceId}`,
    );
  }

  private async getUserDeviceTokens(userId: string): Promise<string[]> {
    const key = `push:tokens:${userId}`;
    const tokenMap = await this.redisService.getClient().hgetall(key);
    return Object.values(tokenMap);
  }

  private async cleanupInvalidTokens(
    userId: string,
    tokens: string[],
    responses: admin.messaging.SendResponse[],
  ): Promise<void> {
    const key = `push:tokens:${userId}`;
    const tokenMap = await this.redisService.getClient().hgetall(key);

    // Build reverse map: token -> deviceId
    const tokenToDevice = new Map<string, string>();
    for (const [deviceId, token] of Object.entries(tokenMap)) {
      tokenToDevice.set(token, deviceId);
    }

    for (let i = 0; i < responses.length; i++) {
      if (responses[i].error) {
        const errorCode = responses[i].error?.code;
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          const deviceId = tokenToDevice.get(tokens[i]);
          if (deviceId) {
            await this.redisService.getClient().hdel(key, deviceId);
            this.logger.log(
              `[PUSH] Cleaned up invalid token for user ${userId}, device ${deviceId}`,
            );
          }
        }
      }
    }
  }
}
