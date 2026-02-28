export const CATALOG_EVENTS = {
  PRODUCT_CREATED: 'daltaners.catalog.product-created',
  PRODUCT_UPDATED: 'daltaners.catalog.product-updated',
  PRODUCT_DELETED: 'daltaners.catalog.product-deleted',
  CATEGORY_CREATED: 'daltaners.catalog.category-created',
  CATEGORY_UPDATED: 'daltaners.catalog.category-updated',
  CATEGORY_DELETED: 'daltaners.catalog.category-deleted',
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
