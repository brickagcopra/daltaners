import { BadRequestException } from '@nestjs/common';
import {
  getServiceTypeRules,
  validateMinimumOrder,
  validateDeliveryType,
  validatePrescription,
  calculateEstimatedDelivery,
  ServiceTypeRules,
} from '../service-type-rules';

describe('ServiceTypeRules', () => {
  describe('getServiceTypeRules', () => {
    it('should return grocery rules', () => {
      const rules = getServiceTypeRules('grocery');
      expect(rules.service_type).toBe('grocery');
      expect(rules.minimum_order_amount).toBe(200);
      expect(rules.allowed_delivery_types).toEqual(['standard', 'express', 'scheduled', 'instant']);
      expect(rules.default_prep_time_minutes).toBe(20);
      expect(rules.requires_prescription_check).toBe(false);
    });

    it('should return food rules', () => {
      const rules = getServiceTypeRules('food');
      expect(rules.service_type).toBe('food');
      expect(rules.minimum_order_amount).toBe(150);
      expect(rules.allowed_delivery_types).toEqual(['standard', 'express', 'instant']);
      expect(rules.default_prep_time_minutes).toBe(15);
      expect(rules.requires_prescription_check).toBe(false);
    });

    it('should return pharmacy rules', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(rules.service_type).toBe('pharmacy');
      expect(rules.minimum_order_amount).toBe(0);
      expect(rules.allowed_delivery_types).toEqual(['standard', 'express']);
      expect(rules.default_prep_time_minutes).toBe(30);
      expect(rules.requires_prescription_check).toBe(true);
    });

    it('should return parcel rules', () => {
      const rules = getServiceTypeRules('parcel');
      expect(rules.service_type).toBe('parcel');
      expect(rules.minimum_order_amount).toBe(100);
      expect(rules.allowed_delivery_types).toEqual(['standard', 'scheduled']);
      expect(rules.default_prep_time_minutes).toBe(15);
      expect(rules.requires_prescription_check).toBe(false);
    });

    it('should throw BadRequestException for unknown service type', () => {
      expect(() => getServiceTypeRules('unknown')).toThrow(BadRequestException);
      expect(() => getServiceTypeRules('unknown')).toThrow('Unknown service type: unknown');
    });
  });

  describe('validateMinimumOrder', () => {
    it('should pass when grocery subtotal meets minimum (₱200)', () => {
      const rules = getServiceTypeRules('grocery');
      expect(() => validateMinimumOrder(rules, 200)).not.toThrow();
      expect(() => validateMinimumOrder(rules, 500)).not.toThrow();
    });

    it('should throw when grocery subtotal is below minimum (₱200)', () => {
      const rules = getServiceTypeRules('grocery');
      expect(() => validateMinimumOrder(rules, 199.99)).toThrow(BadRequestException);
      expect(() => validateMinimumOrder(rules, 0)).toThrow(BadRequestException);
    });

    it('should pass when food subtotal meets minimum (₱150)', () => {
      const rules = getServiceTypeRules('food');
      expect(() => validateMinimumOrder(rules, 150)).not.toThrow();
    });

    it('should throw when food subtotal is below minimum (₱150)', () => {
      const rules = getServiceTypeRules('food');
      expect(() => validateMinimumOrder(rules, 149)).toThrow(BadRequestException);
    });

    it('should always pass for pharmacy orders (₱0 minimum)', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => validateMinimumOrder(rules, 0)).not.toThrow();
      expect(() => validateMinimumOrder(rules, 50)).not.toThrow();
    });

    it('should pass when parcel subtotal meets minimum (₱100)', () => {
      const rules = getServiceTypeRules('parcel');
      expect(() => validateMinimumOrder(rules, 100)).not.toThrow();
    });

    it('should throw when parcel subtotal is below minimum (₱100)', () => {
      const rules = getServiceTypeRules('parcel');
      expect(() => validateMinimumOrder(rules, 99)).toThrow(BadRequestException);
    });
  });

  describe('validateDeliveryType', () => {
    it('should allow all delivery types for grocery', () => {
      const rules = getServiceTypeRules('grocery');
      expect(() => validateDeliveryType(rules, 'standard')).not.toThrow();
      expect(() => validateDeliveryType(rules, 'express')).not.toThrow();
      expect(() => validateDeliveryType(rules, 'scheduled')).not.toThrow();
      expect(() => validateDeliveryType(rules, 'instant')).not.toThrow();
    });

    it('should reject scheduled delivery for food orders', () => {
      const rules = getServiceTypeRules('food');
      expect(() => validateDeliveryType(rules, 'scheduled')).toThrow(BadRequestException);
      expect(() => validateDeliveryType(rules, 'scheduled')).toThrow(
        "Delivery type 'scheduled' is not available for food orders",
      );
    });

    it('should allow standard, express, instant for food orders', () => {
      const rules = getServiceTypeRules('food');
      expect(() => validateDeliveryType(rules, 'standard')).not.toThrow();
      expect(() => validateDeliveryType(rules, 'express')).not.toThrow();
      expect(() => validateDeliveryType(rules, 'instant')).not.toThrow();
    });

    it('should reject instant and scheduled for pharmacy orders', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => validateDeliveryType(rules, 'instant')).toThrow(BadRequestException);
      expect(() => validateDeliveryType(rules, 'scheduled')).toThrow(BadRequestException);
    });

    it('should allow only standard and express for pharmacy orders', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => validateDeliveryType(rules, 'standard')).not.toThrow();
      expect(() => validateDeliveryType(rules, 'express')).not.toThrow();
    });

    it('should reject express and instant for parcel orders', () => {
      const rules = getServiceTypeRules('parcel');
      expect(() => validateDeliveryType(rules, 'express')).toThrow(BadRequestException);
      expect(() => validateDeliveryType(rules, 'instant')).toThrow(BadRequestException);
    });

    it('should allow only standard and scheduled for parcel orders', () => {
      const rules = getServiceTypeRules('parcel');
      expect(() => validateDeliveryType(rules, 'standard')).not.toThrow();
      expect(() => validateDeliveryType(rules, 'scheduled')).not.toThrow();
    });
  });

  describe('validatePrescription', () => {
    it('should throw when pharmacy order has Rx items but no prescription', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => validatePrescription(rules, true, undefined)).toThrow(BadRequestException);
      expect(() => validatePrescription(rules, true, undefined)).toThrow(
        'Prescription upload is required',
      );
    });

    it('should pass when pharmacy order has Rx items with prescription', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => validatePrescription(rules, true, 'prescription-uuid')).not.toThrow();
    });

    it('should pass when pharmacy order has no Rx items', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => validatePrescription(rules, false, undefined)).not.toThrow();
    });

    it('should pass for non-pharmacy service types regardless of Rx flag', () => {
      const groceryRules = getServiceTypeRules('grocery');
      expect(() => validatePrescription(groceryRules, true, undefined)).not.toThrow();

      const foodRules = getServiceTypeRules('food');
      expect(() => validatePrescription(foodRules, true, undefined)).not.toThrow();

      const parcelRules = getServiceTypeRules('parcel');
      expect(() => validatePrescription(parcelRules, true, undefined)).not.toThrow();
    });
  });

  describe('calculateEstimatedDelivery', () => {
    it('should calculate grocery estimated delivery (20min prep + 30min delivery)', () => {
      const rules = getServiceTypeRules('grocery');
      const before = new Date();
      const result = calculateEstimatedDelivery(rules, 30);
      const after = new Date();

      const expectedMinMs = before.getTime() + 50 * 60 * 1000;
      const expectedMaxMs = after.getTime() + 50 * 60 * 1000;

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMinMs);
      expect(result.getTime()).toBeLessThanOrEqual(expectedMaxMs);
    });

    it('should calculate food estimated delivery (15min prep + 30min delivery)', () => {
      const rules = getServiceTypeRules('food');
      const before = new Date();
      const result = calculateEstimatedDelivery(rules, 30);
      const after = new Date();

      const expectedMinMs = before.getTime() + 45 * 60 * 1000;
      const expectedMaxMs = after.getTime() + 45 * 60 * 1000;

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMinMs);
      expect(result.getTime()).toBeLessThanOrEqual(expectedMaxMs);
    });

    it('should calculate pharmacy estimated delivery (30min prep + 30min delivery)', () => {
      const rules = getServiceTypeRules('pharmacy');
      const before = new Date();
      const result = calculateEstimatedDelivery(rules, 30);
      const after = new Date();

      const expectedMinMs = before.getTime() + 60 * 60 * 1000;
      const expectedMaxMs = after.getTime() + 60 * 60 * 1000;

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMinMs);
      expect(result.getTime()).toBeLessThanOrEqual(expectedMaxMs);
    });

    it('should use default 30min delivery time when not specified', () => {
      const rules = getServiceTypeRules('food');
      const before = new Date();
      const result = calculateEstimatedDelivery(rules);
      const after = new Date();

      const expectedMinMs = before.getTime() + 45 * 60 * 1000;
      const expectedMaxMs = after.getTime() + 45 * 60 * 1000;

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMinMs);
      expect(result.getTime()).toBeLessThanOrEqual(expectedMaxMs);
    });
  });
});
