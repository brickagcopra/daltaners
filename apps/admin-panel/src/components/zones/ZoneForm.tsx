import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { type Zone } from '@/hooks/useZones';

const zoneSchema = z.object({
  name: z.string().min(2, 'Zone name is required'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  deliveryFee: z.number().min(0, 'Must be 0 or more'),
  minimumOrderAmount: z.number().min(0, 'Must be 0 or more'),
  estimatedDeliveryMinutes: z.number().min(1, 'Must be at least 1 minute'),
  isActive: z.boolean(),
});

type ZoneFormData = z.infer<typeof zoneSchema>;

interface ZoneFormProps {
  zone?: Zone | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ZoneFormData) => void;
  isLoading: boolean;
}

export function ZoneForm({ zone, isOpen, onClose, onSubmit, isLoading }: ZoneFormProps) {
  const isEditing = !!zone;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ZoneFormData>({
    resolver: zodResolver(zoneSchema),
    defaultValues: zone
      ? {
          name: zone.name,
          city: zone.city,
          province: zone.province,
          deliveryFee: zone.deliveryFee / 100,
          minimumOrderAmount: zone.minimumOrderAmount / 100,
          estimatedDeliveryMinutes: zone.estimatedDeliveryMinutes,
          isActive: zone.isActive,
        }
      : {
          name: '',
          city: '',
          province: '',
          deliveryFee: 49,
          minimumOrderAmount: 200,
          estimatedDeliveryMinutes: 30,
          isActive: true,
        },
  });

  const processSubmit = (data: ZoneFormData) => {
    onSubmit({
      ...data,
      deliveryFee: Math.round(data.deliveryFee * 100),
      minimumOrderAmount: Math.round(data.minimumOrderAmount * 100),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Zone' : 'Create Zone'}
      description={isEditing ? `Editing ${zone.name}` : 'Add a new delivery zone'}
    >
      <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
        <Input
          label="Zone Name"
          {...register('name')}
          error={errors.name?.message}
          placeholder="e.g., Metro Manila - North"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="City"
            {...register('city')}
            error={errors.city?.message}
            placeholder="e.g., Quezon City"
          />
          <Input
            label="Province"
            {...register('province')}
            error={errors.province?.message}
            placeholder="e.g., Metro Manila"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Delivery Fee (PHP)"
            type="number"
            step="0.01"
            {...register('deliveryFee', { valueAsNumber: true })}
            error={errors.deliveryFee?.message}
          />
          <Input
            label="Minimum Order (PHP)"
            type="number"
            step="0.01"
            {...register('minimumOrderAmount', { valueAsNumber: true })}
            error={errors.minimumOrderAmount?.message}
          />
        </div>

        <Input
          label="Estimated Delivery (minutes)"
          type="number"
          {...register('estimatedDeliveryMinutes', { valueAsNumber: true })}
          error={errors.estimatedDeliveryMinutes?.message}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            {...register('isActive')}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-foreground">
            Zone is active
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            {isEditing ? 'Update Zone' : 'Create Zone'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
