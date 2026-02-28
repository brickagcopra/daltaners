import { Gender } from './enums';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  locale: string;
  timezone: string;
  preferences: Record<string, unknown>;
  dietary_preferences: string[];
  allergens: string[];
  created_at: string;
  updated_at: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  barangay: string;
  city: string;
  province: string;
  region: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  delivery_instructions: string | null;
  created_at: string;
}
