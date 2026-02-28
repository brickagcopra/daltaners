import { GeoPolygon } from './common.types';

export interface DeliveryZone {
  id: string;
  name: string;
  city: string;
  province: string;
  region: string;
  boundary: GeoPolygon;
  base_delivery_fee: number;
  per_km_fee: number;
  surge_multiplier: number;
  is_active: boolean;
  max_delivery_radius_km: number;
  capacity_limit: number;
  current_capacity: number;
  metadata: Record<string, unknown>;
  created_at: string;
}
