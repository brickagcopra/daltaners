import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

const broadcastSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be under 100 characters'),
  body: z.string().min(10, 'Body must be at least 10 characters').max(500, 'Body must be under 500 characters'),
  channel: z.enum(['push', 'email', 'sms', 'in_app']),
  targetRole: z.enum(['all', 'customer', 'vendor_owner', 'delivery']),
});

type BroadcastFormData = z.infer<typeof broadcastSchema>;

interface BroadcastFormProps {
  onSubmit: (data: BroadcastFormData) => void;
  isLoading: boolean;
}

const channelOptions = [
  { value: 'push', label: 'Push Notification' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'in_app', label: 'In-App Notification' },
];

const targetOptions = [
  { value: 'all', label: 'All Users' },
  { value: 'customer', label: 'Customers Only' },
  { value: 'vendor_owner', label: 'Vendors Only' },
  { value: 'delivery', label: 'Riders Only' },
];

export function BroadcastForm({ onSubmit, isLoading }: BroadcastFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BroadcastFormData>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      title: '',
      body: '',
      channel: 'push',
      targetRole: 'all',
    },
  });

  const bodyValue = watch('body');

  const processSubmit = (data: BroadcastFormData) => {
    onSubmit(data);
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Broadcast Notification</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
          <Input
            label="Notification Title"
            {...register('title')}
            error={errors.title?.message}
            placeholder="e.g., Weekend Special: Free Delivery!"
          />

          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Message Body
            </label>
            <textarea
              {...register('body')}
              rows={4}
              className="flex w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Write your notification message here..."
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.body?.message ? (
                <p className="text-xs text-destructive">{errors.body.message}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                {bodyValue?.length || 0}/500
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Channel"
              options={channelOptions}
              {...register('channel')}
              error={errors.channel?.message}
            />
            <Select
              label="Target Audience"
              options={targetOptions}
              {...register('targetRole')}
              error={errors.targetRole?.message}
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex gap-2">
              <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-amber-800">
                This will send a notification to all users in the selected target group.
                Please double-check the content before sending.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isLoading}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Notification
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
