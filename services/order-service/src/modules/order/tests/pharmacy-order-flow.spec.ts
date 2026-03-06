import {
  validateMinimumOrder,
  validateDeliveryType,
  validatePrescription,
  getServiceTypeRules,
  calculateEstimatedDelivery,
} from '../service-type-rules';

describe('Pharmacy Order Flow', () => {
  const pharmacyRules = getServiceTypeRules('pharmacy');

  describe('Service type rules', () => {
    it('should return pharmacy-specific rules', () => {
      expect(pharmacyRules.service_type).toBe('pharmacy');
      expect(pharmacyRules.minimum_order_amount).toBe(0);
      expect(pharmacyRules.default_prep_time_minutes).toBe(30);
      expect(pharmacyRules.requires_prescription_check).toBe(true);
    });

    it('should only allow standard and express delivery', () => {
      expect(pharmacyRules.allowed_delivery_types).toEqual(['standard', 'express']);
    });
  });

  describe('Minimum order validation', () => {
    it('should pass with ₱0 minimum (no minimum for pharmacy)', () => {
      expect(() => validateMinimumOrder(pharmacyRules, 0)).not.toThrow();
    });

    it('should pass with any positive subtotal', () => {
      expect(() => validateMinimumOrder(pharmacyRules, 50)).not.toThrow();
    });

    it('should pass with large subtotal', () => {
      expect(() => validateMinimumOrder(pharmacyRules, 5000)).not.toThrow();
    });
  });

  describe('Delivery type validation', () => {
    it('should allow standard delivery for pharmacy', () => {
      expect(() => validateDeliveryType(pharmacyRules, 'standard')).not.toThrow();
    });

    it('should allow express delivery for pharmacy', () => {
      expect(() => validateDeliveryType(pharmacyRules, 'express')).not.toThrow();
    });

    it('should reject instant delivery for pharmacy', () => {
      expect(() => validateDeliveryType(pharmacyRules, 'instant')).toThrow(
        /not available for pharmacy orders/,
      );
    });

    it('should reject scheduled delivery for pharmacy', () => {
      expect(() => validateDeliveryType(pharmacyRules, 'scheduled')).toThrow(
        /not available for pharmacy orders/,
      );
    });
  });

  describe('Prescription validation', () => {
    it('should pass when no Rx items and no prescription', () => {
      expect(() => validatePrescription(pharmacyRules, false)).not.toThrow();
    });

    it('should reject when Rx items present but no prescription provided', () => {
      expect(() => validatePrescription(pharmacyRules, true)).toThrow(
        /Prescription upload is required/,
      );
    });

    it('should pass when Rx items present and prescription provided', () => {
      expect(() =>
        validatePrescription(pharmacyRules, true, 'prescription-uuid-123'),
      ).not.toThrow();
    });

    it('should pass when no Rx items even without prescription', () => {
      expect(() => validatePrescription(pharmacyRules, false, undefined)).not.toThrow();
    });
  });

  describe('Estimated delivery calculation', () => {
    it('should calculate estimated delivery with 30min prep + 30min delivery = 60min', () => {
      const result = calculateEstimatedDelivery(pharmacyRules);
      const now = new Date();
      const expectedMs = 60 * 60 * 1000; // 30 prep + 30 delivery
      const minExpected = now.getTime() + expectedMs - 5000;
      const maxExpected = now.getTime() + expectedMs + 5000;
      expect(result.getTime()).toBeGreaterThanOrEqual(minExpected);
      expect(result.getTime()).toBeLessThanOrEqual(maxExpected);
    });
  });

  describe('Full pharmacy order flow', () => {
    it('should validate OTC-only pharmacy order (no Rx)', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => {
        validateDeliveryType(rules, 'standard');
        validateMinimumOrder(rules, 50);
        validatePrescription(rules, false);
      }).not.toThrow();
    });

    it('should validate pharmacy order with verified prescription', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => {
        validateDeliveryType(rules, 'express');
        validateMinimumOrder(rules, 200);
        validatePrescription(rules, true, 'verified-prescription-uuid');
      }).not.toThrow();
    });

    it('should reject Rx order without prescription upload', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => {
        validateDeliveryType(rules, 'standard');
        validateMinimumOrder(rules, 200);
        validatePrescription(rules, true);
      }).toThrow(/Prescription upload is required/);
    });

    it('should reject pharmacy order with instant delivery', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => {
        validateDeliveryType(rules, 'instant');
      }).toThrow(/not available for pharmacy orders/);
    });

    it('should reject pharmacy order with scheduled delivery', () => {
      const rules = getServiceTypeRules('pharmacy');
      expect(() => {
        validateDeliveryType(rules, 'scheduled');
      }).toThrow(/not available for pharmacy orders/);
    });
  });
});
