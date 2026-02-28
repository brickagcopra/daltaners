export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR_OWNER = 'vendor_owner',
  VENDOR_STAFF = 'vendor_staff',
  DELIVERY = 'delivery',
  ADMIN = 'admin',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
  REFUNDED = 'refunded',
}

export enum OrderType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
}

export enum ServiceType {
  GROCERY = 'grocery',
  FOOD = 'food',
  PHARMACY = 'pharmacy',
  PARCEL = 'parcel',
}

export enum DeliveryType {
  STANDARD = 'standard',
  EXPRESS = 'express',
  SCHEDULED = 'scheduled',
  INSTANT = 'instant',
}

export enum PaymentMethod {
  CARD = 'card',
  GCASH = 'gcash',
  MAYA = 'maya',
  GRABPAY = 'grabpay',
  COD = 'cod',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum TransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  PAYOUT = 'payout',
  TOP_UP = 'top_up',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

export enum DeliveryStatus {
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  AT_STORE = 'at_store',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  ARRIVED = 'arrived',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum DeliveryPersonnelStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export enum VehicleType {
  BICYCLE = 'bicycle',
  MOTORCYCLE = 'motorcycle',
  CAR = 'car',
  VAN = 'van',
  WALKING = 'walking',
}

export enum StoreCategory {
  GROCERY = 'grocery',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
  ELECTRONICS = 'electronics',
  FASHION = 'fashion',
  GENERAL = 'general',
  SPECIALTY = 'specialty',
}

export enum StoreStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export enum SubscriptionTier {
  FREE = 'free',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export enum UnitType {
  PIECE = 'piece',
  KG = 'kg',
  G = 'g',
  LITER = 'liter',
  ML = 'ml',
  PACK = 'pack',
  DOZEN = 'dozen',
  BOX = 'box',
  BUNDLE = 'bundle',
}

export enum StockMovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
  RESERVATION = 'reservation',
  RELEASE = 'release',
  RETURN = 'return',
}

export enum SubstitutionPolicy {
  ACCEPT_SIMILAR = 'accept_similar',
  SPECIFIC_ONLY = 'specific_only',
  REFUND_ONLY = 'refund_only',
}

export enum OrderItemStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SUBSTITUTED = 'substituted',
  UNAVAILABLE = 'unavailable',
  CANCELLED = 'cancelled',
}

export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum StaffRole {
  MANAGER = 'manager',
  STAFF = 'staff',
  CASHIER = 'cashier',
}

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum NotificationChannel {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export enum NotificationStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}
