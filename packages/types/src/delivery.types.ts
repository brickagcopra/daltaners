import { DeliveryStatus, DeliveryPersonnelStatus, VehicleType } from './enums';

export interface DeliveryPersonnel {
  id: string;
  user_id: string;
  vehicle_type: VehicleType;
  vehicle_plate: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: DeliveryPersonnelStatus;
  is_online: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  current_zone_id: string | null;
  max_concurrent_orders: number;
  current_order_count: number;
  rating_average: number;
  total_deliveries: number;
  created_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  personnel_id: string;
  status: DeliveryStatus;
  pickup_location: Record<string, unknown>;
  dropoff_location: Record<string, unknown>;
  estimated_pickup_at: string | null;
  actual_pickup_at: string | null;
  estimated_delivery_at: string | null;
  actual_delivery_at: string | null;
  distance_km: number | null;
  delivery_fee: number;
  tip_amount: number;
  proof_of_delivery: { photo_url?: string; signature_url?: string; otp_verified?: boolean } | null;
  cod_amount: number;
  cod_collected: boolean;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface GpsLocation {
  delivery_id: string;
  personnel_id: string;
  recorded_at: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  battery_level: number;
}
