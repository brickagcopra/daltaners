import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryZoneEntity } from './entities/zone.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZoneRepository {
  private readonly logger = new Logger(ZoneRepository.name);

  constructor(
    @InjectRepository(DeliveryZoneEntity)
    private readonly repository: Repository<DeliveryZoneEntity>,
  ) {}

  async createZone(dto: CreateZoneDto): Promise<DeliveryZoneEntity> {
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();

    try {
      let boundaryValue: string | null = null;
      if (dto.boundary) {
        boundaryValue = JSON.stringify(dto.boundary);
      }

      const result = await queryRunner.query(
        `INSERT INTO zones.delivery_zones
          (name, city, province, region, boundary, base_delivery_fee, per_km_fee, surge_multiplier, max_delivery_radius_km, capacity_limit, metadata)
        VALUES
          ($1, $2, $3, $4, ${boundaryValue ? 'ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)' : 'NULL'}, $${boundaryValue ? 6 : 5}, $${boundaryValue ? 7 : 6}, $${boundaryValue ? 8 : 7}, $${boundaryValue ? 9 : 8}, $${boundaryValue ? 10 : 9}, $${boundaryValue ? 11 : 10})
        RETURNING *`,
        boundaryValue
          ? [
              dto.name,
              dto.city,
              dto.province,
              dto.region,
              boundaryValue,
              dto.base_delivery_fee,
              dto.per_km_fee,
              dto.surge_multiplier ?? 1.00,
              dto.max_delivery_radius_km ?? 10.0,
              dto.capacity_limit ?? null,
              JSON.stringify(dto.metadata ?? {}),
            ]
          : [
              dto.name,
              dto.city,
              dto.province,
              dto.region,
              dto.base_delivery_fee,
              dto.per_km_fee,
              dto.surge_multiplier ?? 1.00,
              dto.max_delivery_radius_km ?? 10.0,
              dto.capacity_limit ?? null,
              JSON.stringify(dto.metadata ?? {}),
            ],
      );

      return result[0];
    } finally {
      await queryRunner.release();
    }
  }

  async findZoneById(id: string): Promise<DeliveryZoneEntity | null> {
    const result = await this.repository.manager.query(
      `SELECT id, name, city, province, region,
        ST_AsGeoJSON(boundary)::jsonb AS boundary,
        base_delivery_fee, per_km_fee, surge_multiplier,
        is_active, max_delivery_radius_km, capacity_limit,
        current_capacity, metadata, created_at
      FROM zones.delivery_zones
      WHERE id = $1`,
      [id],
    );

    return result.length > 0 ? result[0] : null;
  }

  async findAllZones(): Promise<DeliveryZoneEntity[]> {
    const result = await this.repository.manager.query(
      `SELECT id, name, city, province, region,
        ST_AsGeoJSON(boundary)::jsonb AS boundary,
        base_delivery_fee, per_km_fee, surge_multiplier,
        is_active, max_delivery_radius_km, capacity_limit,
        current_capacity, metadata, created_at
      FROM zones.delivery_zones
      WHERE is_active = true
      ORDER BY name ASC`,
    );

    return result;
  }

  async updateZone(id: string, dto: UpdateZoneDto): Promise<DeliveryZoneEntity | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(dto.name);
    }
    if (dto.city !== undefined) {
      setClauses.push(`city = $${paramIndex++}`);
      params.push(dto.city);
    }
    if (dto.province !== undefined) {
      setClauses.push(`province = $${paramIndex++}`);
      params.push(dto.province);
    }
    if (dto.region !== undefined) {
      setClauses.push(`region = $${paramIndex++}`);
      params.push(dto.region);
    }
    if (dto.boundary !== undefined) {
      setClauses.push(`boundary = ST_SetSRID(ST_GeomFromGeoJSON($${paramIndex++}), 4326)`);
      params.push(JSON.stringify(dto.boundary));
    }
    if (dto.base_delivery_fee !== undefined) {
      setClauses.push(`base_delivery_fee = $${paramIndex++}`);
      params.push(dto.base_delivery_fee);
    }
    if (dto.per_km_fee !== undefined) {
      setClauses.push(`per_km_fee = $${paramIndex++}`);
      params.push(dto.per_km_fee);
    }
    if (dto.surge_multiplier !== undefined) {
      setClauses.push(`surge_multiplier = $${paramIndex++}`);
      params.push(dto.surge_multiplier);
    }
    if (dto.is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      params.push(dto.is_active);
    }
    if (dto.max_delivery_radius_km !== undefined) {
      setClauses.push(`max_delivery_radius_km = $${paramIndex++}`);
      params.push(dto.max_delivery_radius_km);
    }
    if (dto.capacity_limit !== undefined) {
      setClauses.push(`capacity_limit = $${paramIndex++}`);
      params.push(dto.capacity_limit);
    }
    if (dto.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(dto.metadata));
    }

    if (setClauses.length === 0) {
      return this.findZoneById(id);
    }

    params.push(id);
    const idParamIndex = paramIndex;

    const result = await this.repository.manager.query(
      `UPDATE zones.delivery_zones
      SET ${setClauses.join(', ')}
      WHERE id = $${idParamIndex}
      RETURNING id`,
      params,
    );

    if (result.length === 0) return null;
    return this.findZoneById(id);
  }

  async lookupZone(latitude: number, longitude: number): Promise<DeliveryZoneEntity | null> {
    const result = await this.repository.manager.query(
      `SELECT id, name, city, province, region,
        ST_AsGeoJSON(boundary)::jsonb AS boundary,
        base_delivery_fee, per_km_fee, surge_multiplier,
        is_active, max_delivery_radius_km, capacity_limit,
        current_capacity, metadata, created_at
      FROM zones.delivery_zones
      WHERE is_active = true
        AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 1`,
      [longitude, latitude],
    );

    return result.length > 0 ? result[0] : null;
  }

  async incrementCapacity(zoneId: string): Promise<void> {
    await this.repository.manager.query(
      `UPDATE zones.delivery_zones
      SET current_capacity = current_capacity + 1
      WHERE id = $1`,
      [zoneId],
    );
  }

  async decrementCapacity(zoneId: string): Promise<void> {
    await this.repository.manager.query(
      `UPDATE zones.delivery_zones
      SET current_capacity = GREATEST(current_capacity - 1, 0)
      WHERE id = $1`,
      [zoneId],
    );
  }

  async countZones(): Promise<number> {
    const result = await this.repository.manager.query(
      `SELECT COUNT(*)::int AS count FROM zones.delivery_zones`,
    );
    return result[0]?.count ?? 0;
  }

  async seedZone(
    name: string,
    city: string,
    province: string,
    region: string,
    baseFee: number,
    perKmFee: number,
    centerLng: number,
    centerLat: number,
    radiusKm: number,
  ): Promise<void> {
    await this.repository.manager.query(
      `INSERT INTO zones.delivery_zones
        (name, city, province, region, boundary, base_delivery_fee, per_km_fee, surge_multiplier, max_delivery_radius_km)
      VALUES
        ($1, $2, $3, $4,
         ST_Buffer(
           ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
           $7
         )::geometry,
         $8, $9, 1.00, $10)`,
      [name, city, province, region, centerLng, centerLat, radiusKm * 1000, baseFee, perKmFee, radiusKm],
    );
  }
}
