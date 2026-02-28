export const VENDOR_EVENTS = {
  STORE_CREATED: 'daltaners.vendors.store-created',
  STORE_UPDATED: 'daltaners.vendors.store-updated',
  STORE_LOCATION_CREATED: 'daltaners.vendors.store-location-created',
  STORE_LOCATION_UPDATED: 'daltaners.vendors.store-location-updated',
  STAFF_ADDED: 'daltaners.vendors.staff-added',
  STAFF_REMOVED: 'daltaners.vendors.staff-removed',
} as const;

export interface StoreCreatedEvent {
  specversion: '1.0';
  id: string;
  source: 'daltaners/vendor-service';
  type: 'com.daltaners.vendors.store-created';
  datacontenttype: 'application/json';
  time: string;
  data: {
    store_id: string;
    owner_id: string;
    name: string;
    slug: string;
    category: string;
    status: string;
  };
}

export interface StoreUpdatedEvent {
  specversion: '1.0';
  id: string;
  source: 'daltaners/vendor-service';
  type: 'com.daltaners.vendors.store-updated';
  datacontenttype: 'application/json';
  time: string;
  data: {
    store_id: string;
    updated_fields: string[];
  };
}
