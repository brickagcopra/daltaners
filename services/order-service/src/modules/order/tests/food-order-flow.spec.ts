import {
  validateMinimumOrder,
  validateDeliveryType,
  validatePrescription,
  getServiceTypeRules,
  calculateEstimatedDelivery,
} from '../service-type-rules';

describe('Food Order Flow', () => {
  const foodRules = getServiceTypeRules('food');

  describe('Service type rules', () => {
    it('should return food-specific rules', () => {
      expect(foodRules.service_type).toBe('food');
      expect(foodRules.minimum_order_amount).toBe(150);
      expect(foodRules.default_prep_time_minutes).toBe(15);
      expect(foodRules.requires_prescription_check).toBe(false);
    });

    it('should allow standard, express, and instant delivery for food', () => {
      expect(foodRules.allowed_delivery_types).toEqual(['standard', 'express', 'instant']);
    });
  });

  describe('Minimum order validation', () => {
    it('should pass when subtotal meets minimum (₱150)', () => {
      expect(() => validateMinimumOrder(foodRules, 150)).not.toThrow();
    });

    it('should pass when subtotal exceeds minimum', () => {
      expect(() => validateMinimumOrder(foodRules, 500)).not.toThrow();
    });

    it('should reject when subtotal is below ₱150', () => {
      expect(() => validateMinimumOrder(foodRules, 100)).toThrow(
        /Minimum order amount for food is ₱150/,
      );
    });

    it('should reject when subtotal is zero', () => {
      expect(() => validateMinimumOrder(foodRules, 0)).toThrow(
        /Minimum order amount for food is ₱150/,
      );
    });
  });

  describe('Delivery type validation', () => {
    it('should allow standard delivery for food', () => {
      expect(() => validateDeliveryType(foodRules, 'standard')).not.toThrow();
    });

    it('should allow express delivery for food', () => {
      expect(() => validateDeliveryType(foodRules, 'express')).not.toThrow();
    });

    it('should allow instant delivery for food', () => {
      expect(() => validateDeliveryType(foodRules, 'instant')).not.toThrow();
    });

    it('should reject scheduled delivery for food', () => {
      expect(() => validateDeliveryType(foodRules, 'scheduled')).toThrow(
        /not available for food orders/,
      );
    });
  });

  describe('Prescription validation', () => {
    it('should not require prescription for food orders', () => {
      expect(() => validatePrescription(foodRules, false)).not.toThrow();
    });

    it('should not require prescription even with has_rx_items flag', () => {
      expect(() => validatePrescription(foodRules, true)).not.toThrow();
    });
  });

  describe('Estimated delivery calculation', () => {
    it('should calculate estimated delivery with 15min prep + 30min delivery = 45min', () => {
      const result = calculateEstimatedDelivery(foodRules);
      const now = new Date();
      const expectedMs = 45 * 60 * 1000; // 15 prep + 30 delivery
      const minExpected = now.getTime() + expectedMs - 5000;
      const maxExpected = now.getTime() + expectedMs + 5000;
      expect(result.getTime()).toBeGreaterThanOrEqual(minExpected);
      expect(result.getTime()).toBeLessThanOrEqual(maxExpected);
    });

    it('should use custom delivery time when provided', () => {
      const result = calculateEstimatedDelivery(foodRules, 10);
      const now = new Date();
      const expectedMs = 25 * 60 * 1000; // 15 prep + 10 delivery
      const minExpected = now.getTime() + expectedMs - 5000;
      const maxExpected = now.getTime() + expectedMs + 5000;
      expect(result.getTime()).toBeGreaterThanOrEqual(minExpected);
      expect(result.getTime()).toBeLessThanOrEqual(maxExpected);
    });
  });

  describe('Full food order flow validation', () => {
    it('should validate complete food order with standard delivery', () => {
      const rules = getServiceTypeRules('food');
      expect(() => {
        validateDeliveryType(rules, 'standard');
        validateMinimumOrder(rules, 200);
        validatePrescription(rules, false);
      }).not.toThrow();
    });

    it('should validate complete food order with instant delivery', () => {
      const rules = getServiceTypeRules('food');
      expect(() => {
        validateDeliveryType(rules, 'instant');
        validateMinimumOrder(rules, 150);
        validatePrescription(rules, false);
      }).not.toThrow();
    });

    it('should reject food order below minimum with valid delivery type', () => {
      const rules = getServiceTypeRules('food');
      expect(() => {
        validateDeliveryType(rules, 'express');
        validateMinimumOrder(rules, 100);
      }).toThrow(/Minimum order amount for food is ₱150/);
    });

    it('should reject food order with scheduled delivery even if above minimum', () => {
      const rules = getServiceTypeRules('food');
      expect(() => {
        validateDeliveryType(rules, 'scheduled');
      }).toThrow(/not available for food orders/);
    });
  });
});
