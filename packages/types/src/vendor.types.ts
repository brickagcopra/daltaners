import { StoreCategory, StoreStatus, SubscriptionTier, StaffRole } from './enums';
import { GeoPolygon } from './common.types';

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  category: StoreCategory;
  status: StoreStatus;
  commission_rate: number;
  subscription_tier: SubscriptionTier;
  contact_phone: string;
  contact_email: string;
  preparation_time_minutes: number;
  minimum_order_value: number;
  rating_average: number;
  rating_count: number;
  total_orders: number;
  is_featured: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StoreLocation {
  id: string;
  store_id: string;
  branch_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  delivery_radius_km: number;
  geofence: GeoPolygon | null;
  is_primary: boolean;
}

export interface OperatingHours {
  id: string;
  store_location_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface StoreStaff {
  id: string;
  store_id: string;
  user_id: string;
  role: StaffRole;
  permissions: Record<string, boolean>;
  is_active: boolean;
}
