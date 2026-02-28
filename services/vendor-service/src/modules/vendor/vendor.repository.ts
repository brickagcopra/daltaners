import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Store } from './entities/store.entity';
import { StoreLocation } from './entities/store-location.entity';
import { OperatingHours } from './entities/operating-hours.entity';
import { StoreStaff } from './entities/store-staff.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateStoreLocationDto } from './dto/create-store-location.dto';
import { UpdateStoreLocationDto } from './dto/update-store-location.dto';
import { OperatingHourEntryDto } from './dto/set-operating-hours.dto';
import { CreateStoreStaffDto } from './dto/create-store-staff.dto';
import { UpdateStoreStaffDto } from './dto/update-store-staff.dto';

@Injectable()
export class VendorRepository {
  private readonly logger = new Logger(VendorRepository.name);

  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(StoreLocation)
    private readonly locationRepo: Repository<StoreLocation>,
    @InjectRepository(OperatingHours)
    private readonly hoursRepo: Repository<OperatingHours>,
    @InjectRepository(StoreStaff)
    private readonly staffRepo: Repository<StoreStaff>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Store Methods ────────────────────────────────────────────────────────────

  async createStore(ownerId: string, dto: CreateStoreDto, slug: string): Promise<Store> {
    const store = this.storeRepo.create({
      owner_id: ownerId,
      name: dto.name,
      slug,
      description: dto.description || null,
      category: dto.category,
      contact_phone: dto.contact_phone,
      contact_email: dto.contact_email,
      minimum_order_value: dto.minimum_order_value ?? 0,
    });
    return this.storeRepo.save(store);
  }

  async findStoreById(id: string): Promise<Store | null> {
    return this.storeRepo.findOne({
      where: { id },
      relations: ['locations', 'staff'],
    });
  }

  async findStoreBySlug(slug: string): Promise<Store | null> {
    return this.storeRepo.findOne({
      where: { slug },
      relations: ['locations'],
    });
  }

  async findStoresByOwner(ownerId: string): Promise<Store[]> {
    return this.storeRepo.find({
      where: { owner_id: ownerId },
      select: [
        'id',
        'name',
        'slug',
        'description',
        'logo_url',
        'category',
        'status',
        'rating_average',
        'rating_count',
        'total_orders',
        'is_featured',
        'created_at',
        'updated_at',
      ],
      order: { created_at: 'DESC' },
    });
  }

  async updateStore(id: string, dto: UpdateStoreDto): Promise<Store | null> {
    const updateData: Partial<Store> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description ?? null;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.contact_phone !== undefined) updateData.contact_phone = dto.contact_phone;
    if (dto.contact_email !== undefined) updateData.contact_email = dto.contact_email;
    if (dto.minimum_order_value !== undefined) updateData.minimum_order_value = dto.minimum_order_value;
    if (dto.logo_url !== undefined) updateData.logo_url = dto.logo_url;
    if (dto.banner_url !== undefined) updateData.banner_url = dto.banner_url;
    if (dto.dti_registration !== undefined) updateData.dti_registration = dto.dti_registration;
    if (dto.bir_tin !== undefined) updateData.bir_tin = dto.bir_tin;
    if (dto.business_permit_url !== undefined) updateData.business_permit_url = dto.business_permit_url;
    if (dto.preparation_time_minutes !== undefined) updateData.preparation_time_minutes = dto.preparation_time_minutes;

    if (Object.keys(updateData).length === 0) {
      return this.findStoreById(id);
    }

    await this.storeRepo.update(id, updateData as any);
    return this.findStoreById(id);
  }

  async storeExistsForOwner(ownerId: string, storeId: string): Promise<boolean> {
    const count = await this.storeRepo.count({
      where: { id: storeId, owner_id: ownerId },
    });
    return count > 0;
  }

  // ─── Location Methods ─────────────────────────────────────────────────────────

  async createLocation(storeId: string, dto: CreateStoreLocationDto): Promise<StoreLocation> {
    const location = this.locationRepo.create({
      store_id: storeId,
      branch_name: dto.branch_name,
      address_line1: dto.address_line1,
      address_line2: dto.address_line2 || null,
      city: dto.city,
      province: dto.province,
      latitude: dto.latitude,
      longitude: dto.longitude,
      delivery_radius_km: dto.delivery_radius_km ?? 5.0,
      is_primary: dto.is_primary ?? false,
    });
    return this.locationRepo.save(location);
  }

  async findLocationsByStoreId(storeId: string): Promise<StoreLocation[]> {
    return this.locationRepo.find({
      where: { store_id: storeId },
      relations: ['operating_hours'],
      order: { is_primary: 'DESC' },
    });
  }

  async findLocationById(id: string): Promise<StoreLocation | null> {
    return this.locationRepo.findOne({
      where: { id },
      relations: ['operating_hours'],
    });
  }

  async updateLocation(id: string, dto: UpdateStoreLocationDto): Promise<StoreLocation | null> {
    const updateData: Partial<StoreLocation> = {};

    if (dto.branch_name !== undefined) updateData.branch_name = dto.branch_name;
    if (dto.address_line1 !== undefined) updateData.address_line1 = dto.address_line1;
    if (dto.address_line2 !== undefined) updateData.address_line2 = dto.address_line2 ?? null;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.province !== undefined) updateData.province = dto.province;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.delivery_radius_km !== undefined) updateData.delivery_radius_km = dto.delivery_radius_km;
    if (dto.is_primary !== undefined) updateData.is_primary = dto.is_primary;

    if (Object.keys(updateData).length === 0) {
      return this.findLocationById(id);
    }

    await this.locationRepo.update(id, updateData as any);
    return this.findLocationById(id);
  }

  async deleteLocation(id: string): Promise<void> {
    await this.locationRepo.delete(id);
  }

  async locationBelongsToStore(locationId: string, storeId: string): Promise<boolean> {
    const count = await this.locationRepo.count({
      where: { id: locationId, store_id: storeId },
    });
    return count > 0;
  }

  // ─── Operating Hours Methods ──────────────────────────────────────────────────

  async setOperatingHours(locationId: string, hours: OperatingHourEntryDto[]): Promise<OperatingHours[]> {
    return this.dataSource.transaction(async (manager) => {
      // Delete existing hours for this location
      await manager.delete(OperatingHours, { store_location_id: locationId });

      // Insert new hours
      const entities = hours.map((entry) =>
        manager.create(OperatingHours, {
          store_location_id: locationId,
          day_of_week: entry.day_of_week,
          open_time: entry.is_closed ? null : (entry.open_time ?? null),
          close_time: entry.is_closed ? null : (entry.close_time ?? null),
          is_closed: entry.is_closed,
        }),
      );

      return manager.save(OperatingHours, entities);
    });
  }

  async findOperatingHoursByLocationId(locationId: string): Promise<OperatingHours[]> {
    return this.hoursRepo.find({
      where: { store_location_id: locationId },
      order: { day_of_week: 'ASC' },
    });
  }

  // ─── Nearby Stores (PostGIS) ──────────────────────────────────────────────────

  async findNearbyStores(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<Array<StoreLocation & { distance_meters: number; store: Store }>> {
    const radiusMeters = radiusKm * 1000;

    const query = `
      SELECT
        sl.id,
        sl.store_id,
        sl.branch_name,
        sl.address_line1,
        sl.address_line2,
        sl.city,
        sl.province,
        sl.latitude,
        sl.longitude,
        sl.delivery_radius_km,
        sl.is_primary,
        ST_Distance(
          ST_MakePoint(sl.longitude, sl.latitude)::geography,
          ST_MakePoint($1, $2)::geography
        ) AS distance_meters,
        s.id AS "store_id_ref",
        s.name AS "store_name",
        s.slug AS "store_slug",
        s.description AS "store_description",
        s.logo_url AS "store_logo_url",
        s.category AS "store_category",
        s.status AS "store_status",
        s.rating_average AS "store_rating_average",
        s.rating_count AS "store_rating_count",
        s.preparation_time_minutes AS "store_preparation_time_minutes",
        s.minimum_order_value AS "store_minimum_order_value",
        s.is_featured AS "store_is_featured"
      FROM vendors.store_locations sl
      INNER JOIN vendors.stores s ON s.id = sl.store_id
      WHERE s.status = 'active'
        AND ST_DWithin(
          ST_MakePoint(sl.longitude, sl.latitude)::geography,
          ST_MakePoint($1, $2)::geography,
          $3
        )
      ORDER BY distance_meters ASC
    `;

    const results = await this.dataSource.query(query, [longitude, latitude, radiusMeters]);

    return results.map((row: Record<string, unknown>) => ({
      id: row.id,
      store_id: row.store_id,
      branch_name: row.branch_name,
      address_line1: row.address_line1,
      address_line2: row.address_line2,
      city: row.city,
      province: row.province,
      latitude: parseFloat(row.latitude as string),
      longitude: parseFloat(row.longitude as string),
      delivery_radius_km: parseFloat(row.delivery_radius_km as string),
      is_primary: row.is_primary,
      distance_meters: Math.round(parseFloat(row.distance_meters as string)),
      store: {
        id: row.store_id_ref,
        name: row.store_name,
        slug: row.store_slug,
        description: row.store_description,
        logo_url: row.store_logo_url,
        category: row.store_category,
        status: row.store_status,
        rating_average: parseFloat(row.store_rating_average as string),
        rating_count: parseInt(row.store_rating_count as string, 10),
        preparation_time_minutes: parseInt(row.store_preparation_time_minutes as string, 10),
        minimum_order_value: parseFloat(row.store_minimum_order_value as string),
        is_featured: row.store_is_featured,
      },
    }));
  }

  // ─── Staff Methods ────────────────────────────────────────────────────────────

  async createStaff(storeId: string, dto: CreateStoreStaffDto): Promise<StoreStaff> {
    const staff = this.staffRepo.create({
      store_id: storeId,
      user_id: dto.user_id,
      role: dto.role,
      permissions: dto.permissions || null,
    });
    return this.staffRepo.save(staff);
  }

  async findStaffByStoreId(storeId: string): Promise<StoreStaff[]> {
    return this.staffRepo.find({
      where: { store_id: storeId },
      order: { role: 'ASC' },
    });
  }

  async findStaffById(id: string): Promise<StoreStaff | null> {
    return this.staffRepo.findOne({ where: { id } });
  }

  async updateStaff(id: string, dto: UpdateStoreStaffDto): Promise<StoreStaff | null> {
    const updateData: Partial<StoreStaff> = {};

    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.permissions !== undefined) updateData.permissions = dto.permissions;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    if (Object.keys(updateData).length === 0) {
      return this.findStaffById(id);
    }

    await this.staffRepo.update(id, updateData as any);
    return this.findStaffById(id);
  }

  async removeStaff(id: string): Promise<void> {
    await this.staffRepo.delete(id);
  }

  async staffExistsForStore(storeId: string, userId: string): Promise<boolean> {
    const count = await this.staffRepo.count({
      where: { store_id: storeId, user_id: userId },
    });
    return count > 0;
  }
}
