import { UnitType } from './enums';

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  level: number;
  children?: Category[];
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  unit_type: UnitType;
  unit_value: number | null;
  base_price: number;
  sale_price: number | null;
  cost_price: number | null;
  tax_rate: number;
  is_taxable: boolean;
  weight_grams: number | null;
  dimensions: { length: number; width: number; height: number } | null;
  is_active: boolean;
  is_featured: boolean;
  requires_prescription: boolean;
  is_perishable: boolean;
  shelf_life_days: number | null;
  nutritional_info: Record<string, unknown> | null;
  allergens: string[];
  dietary_tags: string[];
  rating_average: number;
  rating_count: number;
  total_sold: number;
  images: ProductImage[];
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
  attributes: Record<string, string>;
}
