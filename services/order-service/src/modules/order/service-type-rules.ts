import { BadRequestException } from '@nestjs/common';

export type ServiceType = 'grocery' | 'food' | 'pharmacy' | 'parcel';
export type DeliveryType = 'standard' | 'express' | 'scheduled' | 'instant';

export interface ServiceTypeRules {
  service_type: ServiceType;
  minimum_order_amount: number;
  allowed_delivery_types: DeliveryType[];
  default_prep_time_minutes: number;
  requires_prescription_check: boolean;
}

const SERVICE_RULES: Record<ServiceType, ServiceTypeRules> = {
  grocery: {
    service_type: 'grocery',
    minimum_order_amount: 200,
    allowed_delivery_types: ['standard', 'express', 'scheduled', 'instant'],
    default_prep_time_minutes: 20,
    requires_prescription_check: false,
  },
  food: {
    service_type: 'food',
    minimum_order_amount: 150,
    allowed_delivery_types: ['standard', 'express', 'instant'],
    default_prep_time_minutes: 15,
    requires_prescription_check: false,
  },
  pharmacy: {
    service_type: 'pharmacy',
    minimum_order_amount: 0,
    allowed_delivery_types: ['standard', 'express'],
    default_prep_time_minutes: 30,
    requires_prescription_check: true,
  },
  parcel: {
    service_type: 'parcel',
    minimum_order_amount: 100,
    allowed_delivery_types: ['standard', 'scheduled'],
    default_prep_time_minutes: 15,
    requires_prescription_check: false,
  },
};

export function getServiceTypeRules(serviceType: string): ServiceTypeRules {
  const rules = SERVICE_RULES[serviceType as ServiceType];
  if (!rules) {
    throw new BadRequestException(`Unknown service type: ${serviceType}`);
  }
  return rules;
}

export function validateMinimumOrder(rules: ServiceTypeRules, subtotal: number): void {
  if (subtotal < rules.minimum_order_amount) {
    throw new BadRequestException(
      `Minimum order amount for ${rules.service_type} is ₱${rules.minimum_order_amount}. Current subtotal: ₱${subtotal.toFixed(2)}`,
    );
  }
}

export function validateDeliveryType(rules: ServiceTypeRules, deliveryType: string): void {
  if (!rules.allowed_delivery_types.includes(deliveryType as DeliveryType)) {
    throw new BadRequestException(
      `Delivery type '${deliveryType}' is not available for ${rules.service_type} orders. Allowed types: ${rules.allowed_delivery_types.join(', ')}`,
    );
  }
}

export function validatePrescription(
  rules: ServiceTypeRules,
  hasRxItems: boolean,
  prescriptionUploadId?: string,
): void {
  if (rules.requires_prescription_check && hasRxItems && !prescriptionUploadId) {
    throw new BadRequestException(
      'Prescription upload is required for pharmacy orders containing prescription items. Please upload a valid prescription before placing this order.',
    );
  }
}

export function calculateEstimatedDelivery(
  rules: ServiceTypeRules,
  deliveryTimeMinutes: number = 30,
): Date {
  const now = new Date();
  const totalMinutes = rules.default_prep_time_minutes + deliveryTimeMinutes;
  return new Date(now.getTime() + totalMinutes * 60 * 1000);
}
