import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ZoneRepository } from './zone.repository';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { DeliveryZoneEntity } from './entities/zone.entity';

export interface DeliveryFeeResult {
  zone_id: string;
  zone_name: string;
  distance_km: number;
  base_fee: number;
  distance_fee: number;
  surge_multiplier: number;
  total_fee: number;
  currency: string;
}

@Injectable()
export class ZoneService {
  private readonly logger = new Logger(ZoneService.name);

  constructor(private readonly zoneRepository: ZoneRepository) {}

  async createZone(dto: CreateZoneDto): Promise<DeliveryZoneEntity> {
    this.logger.log(`Creating zone: ${dto.name} in ${dto.city}`);
    return this.zoneRepository.createZone(dto);
  }

  async findZoneById(id: string): Promise<DeliveryZoneEntity> {
    const zone = await this.zoneRepository.findZoneById(id);
    if (!zone) {
      throw new NotFoundException(`Zone with id "${id}" not found`);
    }
    return zone;
  }

  async findAllZones(): Promise<DeliveryZoneEntity[]> {
    return this.zoneRepository.findAllZones();
  }

  async updateZone(id: string, dto: UpdateZoneDto): Promise<DeliveryZoneEntity> {
    const existing = await this.zoneRepository.findZoneById(id);
    if (!existing) {
      throw new NotFoundException(`Zone with id "${id}" not found`);
    }
    const updated = await this.zoneRepository.updateZone(id, dto);
    if (!updated) {
      throw new NotFoundException(`Zone with id "${id}" not found after update`);
    }
    this.logger.log(`Updated zone: ${id}`);
    return updated;
  }

  async lookupZone(latitude: number, longitude: number): Promise<DeliveryZoneEntity> {
    const zone = await this.zoneRepository.lookupZone(latitude, longitude);
    if (!zone) {
      throw new NotFoundException(
        `No active delivery zone found for coordinates (${latitude}, ${longitude})`,
      );
    }
    return zone;
  }

  async calculateDeliveryFee(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<DeliveryFeeResult> {
    const zone = await this.zoneRepository.lookupZone(destLat, destLng);
    if (!zone) {
      throw new NotFoundException(
        `No active delivery zone found for destination coordinates (${destLat}, ${destLng})`,
      );
    }

    const distanceKm = this.calculateDistanceKm(originLat, originLng, destLat, destLng);

    const maxRadius = Number(zone.max_delivery_radius_km);
    if (distanceKm > maxRadius) {
      throw new BadRequestException(
        `Delivery distance ${distanceKm.toFixed(2)} km exceeds maximum radius of ${maxRadius} km for zone "${zone.name}"`,
      );
    }

    const baseFee = Number(zone.base_delivery_fee);
    const perKmFee = Number(zone.per_km_fee);
    const surgeMultiplier = Number(zone.surge_multiplier);

    const distanceFee = distanceKm * perKmFee;
    const totalFee = (baseFee + distanceFee) * surgeMultiplier;

    return {
      zone_id: zone.id,
      zone_name: zone.name,
      distance_km: Math.round(distanceKm * 100) / 100,
      base_fee: baseFee,
      distance_fee: Math.round(distanceFee * 100) / 100,
      surge_multiplier: surgeMultiplier,
      total_fee: Math.round(totalFee * 100) / 100,
      currency: 'PHP',
    };
  }

  async incrementCapacity(zoneId: string): Promise<void> {
    const zone = await this.zoneRepository.findZoneById(zoneId);
    if (!zone) {
      throw new NotFoundException(`Zone with id "${zoneId}" not found`);
    }
    if (zone.capacity_limit && zone.current_capacity >= zone.capacity_limit) {
      throw new BadRequestException(`Zone "${zone.name}" has reached its capacity limit`);
    }
    await this.zoneRepository.incrementCapacity(zoneId);
  }

  async decrementCapacity(zoneId: string): Promise<void> {
    const zone = await this.zoneRepository.findZoneById(zoneId);
    if (!zone) {
      throw new NotFoundException(`Zone with id "${zoneId}" not found`);
    }
    await this.zoneRepository.decrementCapacity(zoneId);
  }

  async getAvailableCities(): Promise<{ city: string; province: string; region: string }[]> {
    return this.zoneRepository.findDistinctCities();
  }

  async findZonesByCity(city: string): Promise<DeliveryZoneEntity[]> {
    return this.zoneRepository.findZonesByCity(city);
  }

  private calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
