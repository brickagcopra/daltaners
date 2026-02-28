export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>[];
    statusCode: number;
  };
  timestamp: string;
}

export interface PaginationMeta {
  page?: number;
  limit: number;
  total: number;
  totalPages?: number;
  cursor?: string;
  hasMore?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
