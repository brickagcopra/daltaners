export interface DaltanersEvent<T> {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  datacontenttype: 'application/json';
  time: string;
  data: T;
}

export const EventTypes = {
  // User events
  USER_REGISTERED: 'com.daltaners.users.registered',
  USER_UPDATED: 'com.daltaners.users.updated',
  USER_VERIFIED: 'com.daltaners.users.verified',

  // Store events
  STORE_CREATED: 'com.daltaners.vendors.store_created',
  STORE_UPDATED: 'com.daltaners.vendors.store_updated',
  STORE_APPROVED: 'com.daltaners.vendors.store_approved',

  // Product events
  PRODUCT_CREATED: 'com.daltaners.catalog.product_created',
  PRODUCT_UPDATED: 'com.daltaners.catalog.product_updated',
  PRODUCT_DELETED: 'com.daltaners.catalog.product_deleted',

  // Inventory events
  INVENTORY_LOW: 'com.daltaners.inventory.low',
  INVENTORY_RESERVED: 'com.daltaners.inventory.reserved',
  INVENTORY_RELEASED: 'com.daltaners.inventory.released',
  INVENTORY_ADJUSTED: 'com.daltaners.inventory.adjusted',

  // Order events
  ORDER_PLACED: 'com.daltaners.orders.placed',
  ORDER_CONFIRMED: 'com.daltaners.orders.confirmed',
  ORDER_PREPARING: 'com.daltaners.orders.preparing',
  ORDER_READY: 'com.daltaners.orders.ready',
  ORDER_PICKED_UP: 'com.daltaners.orders.picked_up',
  ORDER_IN_TRANSIT: 'com.daltaners.orders.in_transit',
  ORDER_DELIVERED: 'com.daltaners.orders.delivered',
  ORDER_CANCELLED: 'com.daltaners.orders.cancelled',
  ORDER_STATUS_CHANGED: 'com.daltaners.orders.status_changed',

  // Payment events
  PAYMENT_INITIATED: 'com.daltaners.payments.initiated',
  PAYMENT_COMPLETED: 'com.daltaners.payments.completed',
  PAYMENT_FAILED: 'com.daltaners.payments.failed',
  PAYMENT_REFUNDED: 'com.daltaners.payments.refunded',

  // Delivery events
  DELIVERY_ASSIGNED: 'com.daltaners.delivery.assigned',
  DELIVERY_ACCEPTED: 'com.daltaners.delivery.accepted',
  DELIVERY_PICKED_UP: 'com.daltaners.delivery.picked_up',
  DELIVERY_IN_TRANSIT: 'com.daltaners.delivery.in_transit',
  DELIVERY_COMPLETED: 'com.daltaners.delivery.completed',
  DELIVERY_FAILED: 'com.daltaners.delivery.failed',
  DELIVERY_LOCATION_UPDATE: 'com.daltaners.delivery.location_update',

  // Notification events
  NOTIFICATION_SEND: 'com.daltaners.notifications.send',
} as const;

export const KafkaTopics = {
  ORDERS_EVENTS: 'daltaners.orders.events',
  ORDERS_STATUS: 'daltaners.orders.status',
  PAYMENTS_EVENTS: 'daltaners.payments.events',
  INVENTORY_EVENTS: 'daltaners.inventory.events',
  DELIVERY_TRACKING: 'daltaners.delivery.tracking',
  DELIVERY_ASSIGNMENTS: 'daltaners.delivery.assignments',
  NOTIFICATIONS_OUTBOUND: 'daltaners.notifications.outbound',
  USERS_EVENTS: 'daltaners.users.events',
} as const;
