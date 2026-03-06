export const CATALOG_EVENTS = {
  PRODUCT_CREATED: 'daltaners.catalog.product-created',
  PRODUCT_UPDATED: 'daltaners.catalog.product-updated',
  PRODUCT_DELETED: 'daltaners.catalog.product-deleted',
  CATEGORY_CREATED: 'daltaners.catalog.category-created',
  CATEGORY_UPDATED: 'daltaners.catalog.category-updated',
  CATEGORY_DELETED: 'daltaners.catalog.category-deleted',
} as const;

export const PRICING_EVENTS = {
  RULE_CREATED: 'daltaners.catalog.pricing-rule-created',
  RULE_UPDATED: 'daltaners.catalog.pricing-rule-updated',
  RULE_ACTIVATED: 'daltaners.catalog.pricing-rule-activated',
  RULE_PAUSED: 'daltaners.catalog.pricing-rule-paused',
  RULE_EXPIRED: 'daltaners.catalog.pricing-rule-expired',
  RULE_CANCELLED: 'daltaners.catalog.pricing-rule-cancelled',
  RULE_DELETED: 'daltaners.catalog.pricing-rule-deleted',
  PRICES_APPLIED: 'daltaners.catalog.prices-applied',
  PRICES_REVERTED: 'daltaners.catalog.prices-reverted',
} as const;

export const KAFKA_TOPIC = 'daltaners.catalog.events';

export interface DaltanersEvent<T> {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  datacontenttype: 'application/json';
  time: string;
  data: T;
}

export interface ProductEventData {
  product_id: string;
  store_id: string;
  category_id: string;
  name: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
}
