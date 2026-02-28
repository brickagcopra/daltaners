import { NotificationChannel, NotificationStatus } from './enums';

export interface NotificationLog {
  user_id: string;
  sent_at: string;
  notification_id: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: NotificationStatus;
}

export interface SendNotificationRequest {
  user_id: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}
