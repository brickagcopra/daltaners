import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ZoneResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  province: string;

  @ApiProperty()
  region: string;

  @ApiPropertyOptional()
  boundary: unknown;

  @ApiProperty()
  base_delivery_fee: number;

  @ApiProperty()
  per_km_fee: number;

  @ApiProperty()
  surge_multiplier: number;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  max_delivery_radius_km: number;

  @ApiPropertyOptional()
  capacity_limit: number;

  @ApiProperty()
  current_capacity: number;

  @ApiPropertyOptional()
  metadata: Record<string, unknown>;

  @ApiProperty()
  created_at: Date;
}

export class DeliveryFeeResponseDto {
  @ApiProperty()
  zone_id: string;

  @ApiProperty()
  zone_name: string;

  @ApiProperty()
  distance_km: number;

  @ApiProperty()
  base_fee: number;

  @ApiProperty()
  distance_fee: number;

  @ApiProperty()
  surge_multiplier: number;

  @ApiProperty()
  total_fee: number;

  @ApiProperty()
  currency: string;
}
