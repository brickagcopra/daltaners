import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZoneRepository } from './zone.repository';

interface MetroManilaZoneSeed {
  name: string;
  city: string;
  province: string;
  region: string;
  base_delivery_fee: number;
  per_km_fee: number;
  center_lng: number;
  center_lat: number;
  radius_km: number;
}

@Injectable()
export class ZoneSeedService implements OnModuleInit {
  private readonly logger = new Logger(ZoneSeedService.name);

  constructor(
    private readonly zoneRepository: ZoneRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv !== 'development') {
      this.logger.log('Skipping seed data — not in development environment');
      return;
    }

    try {
      const count = await this.zoneRepository.countZones();
      if (count > 0) {
        this.logger.log(`Zones table already has ${count} records — skipping seed`);
        return;
      }

      this.logger.log('Seeding Metro Manila delivery zones...');
      await this.seedMetroManilaZones();
      this.logger.log('Metro Manila zones seeded successfully');
    } catch (error) {
      this.logger.error('Failed to seed zones', (error as Error).stack);
    }
  }

  private async seedMetroManilaZones(): Promise<void> {
    const metroManilaZones: MetroManilaZoneSeed[] = [
      {
        name: 'Makati',
        city: 'Makati City',
        province: 'Metro Manila',
        region: 'NCR',
        base_delivery_fee: 49,
        per_km_fee: 10,
        center_lng: 121.0244,
        center_lat: 14.5547,
        radius_km: 5,
      },
      {
        name: 'BGC / Taguig',
        city: 'Taguig City',
        province: 'Metro Manila',
        region: 'NCR',
        base_delivery_fee: 49,
        per_km_fee: 10,
        center_lng: 121.0509,
        center_lat: 14.5176,
        radius_km: 5,
      },
      {
        name: 'Quezon City',
        city: 'Quezon City',
        province: 'Metro Manila',
        region: 'NCR',
        base_delivery_fee: 49,
        per_km_fee: 12,
        center_lng: 121.0437,
        center_lat: 14.6760,
        radius_km: 7,
      },
      {
        name: 'Manila',
        city: 'City of Manila',
        province: 'Metro Manila',
        region: 'NCR',
        base_delivery_fee: 39,
        per_km_fee: 10,
        center_lng: 120.9842,
        center_lat: 14.5995,
        radius_km: 5,
      },
      {
        name: 'Pasig',
        city: 'Pasig City',
        province: 'Metro Manila',
        region: 'NCR',
        base_delivery_fee: 49,
        per_km_fee: 11,
        center_lng: 121.0583,
        center_lat: 14.5764,
        radius_km: 5,
      },
      {
        name: 'Mandaluyong',
        city: 'Mandaluyong City',
        province: 'Metro Manila',
        region: 'NCR',
        base_delivery_fee: 39,
        per_km_fee: 10,
        center_lng: 121.0244,
        center_lat: 14.5794,
        radius_km: 3,
      },
      {
        name: 'San Juan',
        city: 'San Juan City',
        province: 'Metro Manila',
        region: 'NCR',
        base_delivery_fee: 39,
        per_km_fee: 10,
        center_lng: 121.0355,
        center_lat: 14.6019,
        radius_km: 2.5,
      },
      {
        name: 'Paranaque',
        city: 'Paranaque City',
        province: 'Metro Manila',
        region: 'NCR',
        base_delivery_fee: 59,
        per_km_fee: 12,
        center_lng: 121.0174,
        center_lat: 14.4793,
        radius_km: 5,
      },
      {
        name: 'Muntinlupa',
        city: 'Muntinlupa City',
        province: 'Metro Manila',
        region: 'NCR',
        base_delivery_fee: 59,
        per_km_fee: 12,
        center_lng: 121.0432,
        center_lat: 14.4081,
        radius_km: 5,
      },
      {
        name: 'Las Pinas',
        city: 'Las Pinas City',
        province: 'Metro Manila',
        region: 'NCR',
        base_delivery_fee: 59,
        per_km_fee: 12,
        center_lng: 120.9936,
        center_lat: 14.4507,
        radius_km: 4,
      },
    ];

    for (const zone of metroManilaZones) {
      try {
        await this.zoneRepository.seedZone(
          zone.name,
          zone.city,
          zone.province,
          zone.region,
          zone.base_delivery_fee,
          zone.per_km_fee,
          zone.center_lng,
          zone.center_lat,
          zone.radius_km,
        );
        this.logger.log(`Seeded zone: ${zone.name} (${zone.city})`);
      } catch (error) {
        this.logger.error(
          `Failed to seed zone "${zone.name}": ${(error as Error).message}`,
        );
      }
    }
  }
}
