import { useState, useEffect } from 'react';
import { useMyStore, useUpdateStore, type OperatingHours } from '@/hooks/useStore';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultHours: OperatingHours[] = DAYS.map((day) => ({
  day,
  open: '08:00',
  close: '21:00',
  isClosed: false,
}));

export function StoreSettingsPage() {
  const { data: store, isLoading, isError } = useMyStore();
  const updateMutation = useUpdateStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>(defaultHours);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (store) {
      setName(store.name);
      setDescription(store.description || '');
      setPhone(store.phone || '');
      setEmail(store.email || '');
      setAddress(store.address || '');
      setDeliveryRadius(String(store.deliveryRadius || ''));
      setMinimumOrder(String(store.minimumOrder || ''));
      if (store.operatingHours?.length) {
        setOperatingHours(store.operatingHours);
      }
    }
  }, [store]);

  if (isLoading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  if (isError || !store) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500">
        <p className="text-sm">Failed to load store settings.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        storeId: store.id,
        updateData: {
          name,
          description,
          phone,
          email,
          address,
          deliveryRadius: parseFloat(deliveryRadius) || 0,
          minimumOrder: parseFloat(minimumOrder) || 0,
          operatingHours,
        },
      },
      {
        onSuccess: () => {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 5000);
        },
      },
    );
  };

  const updateHour = (index: number, field: keyof OperatingHours, value: string | boolean) => {
    setOperatingHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your store profile and operating hours</p>
      </div>

      {showSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Store settings updated successfully!
        </div>
      )}

      {updateMutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          Failed to update settings. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
          <div className="space-y-4">
            <Input
              label="Store Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your store name"
              required
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell customers about your store"
              rows={3}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 XXX XXX XXXX"
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store@example.com"
              />
            </div>
            <Textarea
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full store address"
              rows={2}
            />
          </div>
        </Card>

        {/* Delivery Settings */}
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Delivery Settings</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Delivery Radius (km)"
              type="number"
              step="0.1"
              value={deliveryRadius}
              onChange={(e) => setDeliveryRadius(e.target.value)}
              placeholder="5.0"
            />
            <Input
              label="Minimum Order (PHP)"
              type="number"
              step="0.01"
              value={minimumOrder}
              onChange={(e) => setMinimumOrder(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </Card>

        {/* Operating Hours */}
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Operating Hours</h3>
          <div className="space-y-3">
            {operatingHours.map((hour, index) => (
              <div
                key={hour.day}
                className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="w-28">
                  <span className="text-sm font-medium text-gray-700">{hour.day}</span>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!hour.isClosed}
                    onChange={(e) => updateHour(index, 'isClosed', !e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">Open</span>
                </label>
                {!hour.isClosed && (
                  <>
                    <input
                      type="time"
                      value={hour.open}
                      onChange={(e) => updateHour(index, 'open', e.target.value)}
                      className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-500">to</span>
                    <input
                      type="time"
                      value={hour.close}
                      onChange={(e) => updateHour(index, 'close', e.target.value)}
                      className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </>
                )}
                {hour.isClosed && (
                  <span className="text-sm italic text-gray-400">Closed</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" isLoading={updateMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
