import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Notification {
  id: string;
  title: string;
  body: string;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  targetRole: 'all' | 'customer' | 'vendor_owner' | 'delivery';
  sentBy: string;
  sentAt: string;
  recipientCount: number;
  status: 'sent' | 'failed' | 'partial';
}

interface BroadcastPayload {
  title: string;
  body: string;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  targetRole: 'all' | 'customer' | 'vendor_owner' | 'delivery';
}

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface BroadcastResponse {
  success: boolean;
  data: {
    notificationId: string;
    recipientCount: number;
  };
}

export function useNotificationHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['admin', 'notifications', { page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));

      const response = await api.get<NotificationsResponse>(
        `/admin/notifications?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useBroadcastNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BroadcastPayload) => {
      const response = await api.post<BroadcastResponse>(
        '/admin/notifications/broadcast',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });
}
