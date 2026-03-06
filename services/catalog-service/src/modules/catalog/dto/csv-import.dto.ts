export interface CsvRowError {
  row: number;
  field: string;
  message: string;
}

export interface CsvImportResult {
  total_rows: number;
  successful: number;
  failed: number;
  errors: CsvRowError[];
}

export const CSV_EXPECTED_HEADERS = [
  'name',
  'description',
  'category_id',
  'base_price',
  'sale_price',
  'sku',
  'barcode',
  'brand',
  'unit_type',
  'unit_value',
  'cost_price',
  'weight_grams',
  'is_perishable',
  'shelf_life_days',
  'dietary_tags',
  'allergens',
] as const;

export const CSV_TEMPLATE_HEADER = CSV_EXPECTED_HEADERS.join(',');
export const CSV_TEMPLATE_EXAMPLE =
  'Pancit Canton Original,Instant noodle stir-fry,<category-uuid>,12.50,,SKU-001,4800000000001,Lucky Me,pack,1,8.00,65,false,,noodles;instant,wheat;egg';

export const MAX_CSV_ROWS = 500;
export const MAX_CSV_FILE_SIZE = 5 * 1024 * 1024; // 5MB
