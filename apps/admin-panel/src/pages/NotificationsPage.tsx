import { useState } from 'react';
import { useNotificationHistory, useBroadcastNotification, type Notification } from '@/hooks/useNotifications';
import { BroadcastForm } from '@/components/notifications/BroadcastForm';
import { Pagination } from '@/components/common/Pagination';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/common/DataTable';

const channelLabel: Record<string, string> = {
  push: 'Push',
  email: 'Email',
  sms: 'SMS',
  in_app: 'In-App',
};

const roleLabel: Record<string, string> = {
  all: 'All Users',
  customer: 'Customers',
  vendor_owner: 'Vendors',
  delivery: 'Riders',
};

const statusVariant: Record<string, 'success' | 'destructive' | 'warning'> = {
  sent: 'success',
  failed: 'destructive',
  partial: 'warning',
};

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotificationHistory(page, 20);
  const broadcastMutation = useBroadcastNotification();

  const [showSuccess, setShowSuccess] = useState(false);

  const handleBroadcast = (payload: {
    title: string;
    body: string;
    channel: 'push' | 'email' | 'sms' | 'in_app';
    targetRole: 'all' | 'customer' | 'vendor_owner' | 'delivery';
  }) => {
    broadcastMutation.mutate(payload, {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      },
    });
  };

  const columns: Column<Notification>[] = [
    {
      key: 'title',
      header: 'Notification',
      render: (n) => (
        <div>
          <p className="text-sm font-medium text-foreground">{n.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{n.body}</p>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      render: (n) => (
        <Badge variant="info">{channelLabel[n.channel] || n.channel}</Badge>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      render: (n) => (
        <span className="text-sm text-foreground">{roleLabel[n.targetRole] || n.targetRole}</span>
      ),
    },
    {
      key: 'recipients',
      header: 'Recipients',
      render: (n) => (
        <span className="text-sm text-foreground">{n.recipientCount.toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (n) => (
        <Badge variant={statusVariant[n.status] || 'muted'}>
          {n.status.charAt(0).toUpperCase() + n.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'sentAt',
      header: 'Sent At',
      render: (n) => (
        <span className="text-sm text-muted-foreground">
          {new Date(n.sentAt).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">Broadcast notifications and view history</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Broadcast Form */}
        <div className="lg:col-span-1 space-y-3">
          {showSuccess && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              Notification sent successfully!
            </div>
          )}

          {broadcastMutation.isError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              Failed to send notification. Please try again.
            </div>
          )}

          <BroadcastForm
            onSubmit={handleBroadcast}
            isLoading={broadcastMutation.isPending}
          />
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">History</h2>
            </div>
            <DataTable
              columns={columns}
              data={Array.isArray(data?.data) ? data.data : []}
              isLoading={isLoading}
              keyExtractor={(n) => n.id}
              emptyTitle="No notifications sent"
              emptyDescription="Broadcast notifications will appear here."
            />
            {data?.meta && (
              <Pagination
                page={data.meta.page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                limit={data.meta.limit}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
