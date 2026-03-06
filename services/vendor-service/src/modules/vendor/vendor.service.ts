import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { VendorRepository } from './vendor.repository';
import { KafkaProducerService } from './kafka-producer.service';
import { VENDOR_EVENTS } from './events/vendor.events';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateStoreLocationDto } from './dto/create-store-location.dto';
import { UpdateStoreLocationDto } from './dto/update-store-location.dto';
import { SetOperatingHoursDto } from './dto/set-operating-hours.dto';
import { CreateStoreStaffDto } from './dto/create-store-staff.dto';
import { UpdateStoreStaffDto } from './dto/update-store-staff.dto';
import { AdminVendorQueryDto, AdminVendorActionDto, AdminVendorUpdateDto } from './dto/admin-vendor-query.dto';
import { Store } from './entities/store.entity';
import { StoreLocation } from './entities/store-location.entity';
import { OperatingHours } from './entities/operating-hours.entity';
import { StoreStaff } from './entities/store-staff.entity';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(
    private readonly vendorRepository: VendorRepository,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ─── Slug Generation ──────────────────────────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    let slug = this.generateSlug(name);
    const existing = await this.vendorRepository.findStoreBySlug(slug);
    if (existing) {
      slug = `${slug}-${uuidv4().substring(0, 8)}`;
    }
    return slug;
  }

  // ─── Store Methods ────────────────────────────────────────────────────────────

  async createStore(ownerId: string, dto: CreateStoreDto): Promise<Store> {
    const slug = await this.generateUniqueSlug(dto.name);
    const store = await this.vendorRepository.createStore(ownerId, dto, slug);

    // Publish STORE_CREATED event
    try {
      await this.kafkaProducer.publish(VENDOR_EVENTS.STORE_CREATED, {
        key: store.id,
        value: JSON.stringify({
          specversion: '1.0',
          id: uuidv4(),
          source: 'daltaners/vendor-service',
          type: 'com.daltaners.vendors.store-created',
          datacontenttype: 'application/json',
          time: new Date().toISOString(),
          data: {
            store_id: store.id,
            owner_id: store.owner_id,
            name: store.name,
            slug: store.slug,
            category: store.category,
            status: store.status,
          },
        }),
      });
    } catch (error) {
      this.logger.error(`Failed to publish STORE_CREATED event for store ${store.id}`, (error as Error).stack);
    }

    this.logger.log(`Store created: ${store.id} (${store.name}) by owner ${ownerId}`);
    return store;
  }

  async findStoreById(id: string): Promise<Store> {
    const store = await this.vendorRepository.findStoreById(id);
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }
    return store;
  }

  async findStoreBySlug(slug: string): Promise<Store> {
    const store = await this.vendorRepository.findStoreBySlug(slug);
    if (!store) {
      throw new NotFoundException(`Store with slug '${slug}' not found`);
    }
    return store;
  }

  async findMyStore(userId: string): Promise<Store> {
    const store = await this.vendorRepository.findStoreForUser(userId);
    if (!store) {
      throw new NotFoundException('No store associated with this account');
    }
    return store;
  }

  async findStoresByOwner(ownerId: string): Promise<Store[]> {
    return this.vendorRepository.findStoresByOwner(ownerId);
  }

  async updateStore(storeId: string, ownerId: string, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.vendorRepository.findStoreById(storeId);
    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }
    if (store.owner_id !== ownerId) {
      throw new ForbiddenException('You do not own this store');
    }

    // If name is being updated, regenerate slug
    if (dto.name && dto.name !== store.name) {
      const newSlug = await this.generateUniqueSlug(dto.name);
      // We handle slug update separately since UpdateStoreDto doesn't include slug
      await this.vendorRepository.updateStore(storeId, { ...dto });
      // Update slug via raw approach through the store repo
      const updatedStore = await this.vendorRepository.findStoreById(storeId);
      if (!updatedStore) {
        throw new NotFoundException(`Store with ID ${storeId} not found after update`);
      }

      // Publish STORE_UPDATED event
      const updatedFields = Object.keys(dto).filter(
        (key) => dto[key as keyof UpdateStoreDto] !== undefined,
      );
      await this.publishStoreUpdatedEvent(storeId, updatedFields);

      return updatedStore;
    }

    const updatedStore = await this.vendorRepository.updateStore(storeId, dto);
    if (!updatedStore) {
      throw new NotFoundException(`Store with ID ${storeId} not found after update`);
    }

    // Publish STORE_UPDATED event
    const updatedFields = Object.keys(dto).filter(
      (key) => dto[key as keyof UpdateStoreDto] !== undefined,
    );
    if (updatedFields.length > 0) {
      await this.publishStoreUpdatedEvent(storeId, updatedFields);
    }

    this.logger.log(`Store updated: ${storeId}, fields: ${updatedFields.join(', ')}`);
    return updatedStore;
  }

  private async publishStoreUpdatedEvent(storeId: string, updatedFields: string[]): Promise<void> {
    try {
      await this.kafkaProducer.publish(VENDOR_EVENTS.STORE_UPDATED, {
        key: storeId,
        value: JSON.stringify({
          specversion: '1.0',
          id: uuidv4(),
          source: 'daltaners/vendor-service',
          type: 'com.daltaners.vendors.store-updated',
          datacontenttype: 'application/json',
          time: new Date().toISOString(),
          data: {
            store_id: storeId,
            updated_fields: updatedFields,
          },
        }),
      });
    } catch (error) {
      this.logger.error(`Failed to publish STORE_UPDATED event for store ${storeId}`, (error as Error).stack);
    }
  }

  // ─── Store Ownership Verification ─────────────────────────────────────────────

  async verifyStoreOwnership(storeId: string, ownerId: string): Promise<void> {
    const isOwner = await this.vendorRepository.storeExistsForOwner(ownerId, storeId);
    if (!isOwner) {
      throw new ForbiddenException('You do not own this store');
    }
  }

  // ─── Location Methods ─────────────────────────────────────────────────────────

  async createLocation(storeId: string, ownerId: string, dto: CreateStoreLocationDto): Promise<StoreLocation> {
    await this.verifyStoreOwnership(storeId, ownerId);
    const location = await this.vendorRepository.createLocation(storeId, dto);

    this.logger.log(`Location created: ${location.id} for store ${storeId}`);
    return location;
  }

  async findLocationsByStoreId(storeId: string): Promise<StoreLocation[]> {
    // Verify store exists
    await this.findStoreById(storeId);
    return this.vendorRepository.findLocationsByStoreId(storeId);
  }

  async updateLocation(locationId: string, ownerId: string, dto: UpdateStoreLocationDto): Promise<StoreLocation> {
    const location = await this.vendorRepository.findLocationById(locationId);
    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    await this.verifyStoreOwnership(location.store_id, ownerId);

    const updatedLocation = await this.vendorRepository.updateLocation(locationId, dto);
    if (!updatedLocation) {
      throw new NotFoundException(`Location with ID ${locationId} not found after update`);
    }

    this.logger.log(`Location updated: ${locationId}`);
    return updatedLocation;
  }

  async deleteLocation(locationId: string, ownerId: string): Promise<void> {
    const location = await this.vendorRepository.findLocationById(locationId);
    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    await this.verifyStoreOwnership(location.store_id, ownerId);
    await this.vendorRepository.deleteLocation(locationId);

    this.logger.log(`Location deleted: ${locationId}`);
  }

  // ─── Operating Hours Methods ──────────────────────────────────────────────────

  async setOperatingHours(locationId: string, ownerId: string, dto: SetOperatingHoursDto): Promise<OperatingHours[]> {
    const location = await this.vendorRepository.findLocationById(locationId);
    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    await this.verifyStoreOwnership(location.store_id, ownerId);

    const hours = await this.vendorRepository.setOperatingHours(locationId, dto.hours);
    this.logger.log(`Operating hours set for location ${locationId}: ${dto.hours.length} entries`);
    return hours;
  }

  async getOperatingHours(locationId: string): Promise<OperatingHours[]> {
    const location = await this.vendorRepository.findLocationById(locationId);
    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    return this.vendorRepository.findOperatingHoursByLocationId(locationId);
  }

  // ─── Nearby Stores ────────────────────────────────────────────────────────────

  async findNearbyStores(latitude: number, longitude: number, radiusKm: number) {
    return this.vendorRepository.findNearbyStores(latitude, longitude, radiusKm);
  }

  // ─── Staff Methods ────────────────────────────────────────────────────────────

  async addStaff(storeId: string, ownerId: string, dto: CreateStoreStaffDto): Promise<StoreStaff> {
    await this.verifyStoreOwnership(storeId, ownerId);

    // Check if user is already staff
    const alreadyStaff = await this.vendorRepository.staffExistsForStore(storeId, dto.user_id);
    if (alreadyStaff) {
      throw new ConflictException('User is already a staff member of this store');
    }

    const staff = await this.vendorRepository.createStaff(storeId, dto);
    this.logger.log(`Staff added: ${staff.id} (user ${dto.user_id}) to store ${storeId}`);
    return staff;
  }

  async findStaffByStoreId(storeId: string, ownerId: string): Promise<StoreStaff[]> {
    await this.verifyStoreOwnership(storeId, ownerId);
    return this.vendorRepository.findStaffByStoreId(storeId);
  }

  async updateStaff(staffId: string, ownerId: string, dto: UpdateStoreStaffDto): Promise<StoreStaff> {
    const staff = await this.vendorRepository.findStaffById(staffId);
    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${staffId} not found`);
    }

    await this.verifyStoreOwnership(staff.store_id, ownerId);

    const updatedStaff = await this.vendorRepository.updateStaff(staffId, dto);
    if (!updatedStaff) {
      throw new NotFoundException(`Staff member with ID ${staffId} not found after update`);
    }

    this.logger.log(`Staff updated: ${staffId}`);
    return updatedStaff;
  }

  async removeStaff(staffId: string, ownerId: string): Promise<void> {
    const staff = await this.vendorRepository.findStaffById(staffId);
    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${staffId} not found`);
    }

    await this.verifyStoreOwnership(staff.store_id, ownerId);
    await this.vendorRepository.removeStaff(staffId);

    this.logger.log(`Staff removed: ${staffId}`);
  }

  // ─── Admin Methods ──────────────────────────────────────────────────────────

  async adminListStores(query: AdminVendorQueryDto) {
    const result = await this.vendorRepository.findAllStoresAdmin(query);
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async adminGetStore(id: string) {
    const store = await this.vendorRepository.findStoreById(id);
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }
    return {
      success: true,
      data: store,
      timestamp: new Date().toISOString(),
    };
  }

  async adminGetStats() {
    const stats = await this.vendorRepository.getVendorStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  async adminApproveStore(id: string, dto: AdminVendorActionDto) {
    const store = await this.vendorRepository.findStoreById(id);
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    const updateData: Partial<Store> = { status: 'active' as any };
    if (dto.commission_rate !== undefined) {
      updateData.commission_rate = dto.commission_rate;
    }

    const updated = await this.vendorRepository.updateStoreStatus(id, 'active', {
      approved_at: new Date().toISOString(),
      approval_reason: dto.reason || 'Approved by admin',
    });

    if (dto.commission_rate !== undefined && updated) {
      await this.vendorRepository.adminUpdateStore(id, { commission_rate: dto.commission_rate });
    }

    // Publish event
    try {
      await this.kafkaProducer.publish(VENDOR_EVENTS.STORE_UPDATED, {
        key: id,
        value: JSON.stringify({
          specversion: '1.0',
          id: uuidv4(),
          source: 'daltaners/vendor-service',
          type: 'com.daltaners.vendors.store-approved',
          datacontenttype: 'application/json',
          time: new Date().toISOString(),
          data: { store_id: id, status: 'active' },
        }),
      });
    } catch (error) {
      this.logger.error(`Failed to publish store-approved event for ${id}`, (error as Error).stack);
    }

    this.logger.log(`Store approved by admin: ${id}`);
    const finalStore = await this.vendorRepository.findStoreById(id);
    return {
      success: true,
      data: finalStore,
      timestamp: new Date().toISOString(),
    };
  }

  async adminSuspendStore(id: string, dto: AdminVendorActionDto) {
    const store = await this.vendorRepository.findStoreById(id);
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    await this.vendorRepository.updateStoreStatus(id, 'suspended', {
      suspended_at: new Date().toISOString(),
      suspension_reason: dto.reason || 'Suspended by admin',
    });

    // Publish event
    try {
      await this.kafkaProducer.publish(VENDOR_EVENTS.STORE_UPDATED, {
        key: id,
        value: JSON.stringify({
          specversion: '1.0',
          id: uuidv4(),
          source: 'daltaners/vendor-service',
          type: 'com.daltaners.vendors.store-suspended',
          datacontenttype: 'application/json',
          time: new Date().toISOString(),
          data: { store_id: id, status: 'suspended', reason: dto.reason },
        }),
      });
    } catch (error) {
      this.logger.error(`Failed to publish store-suspended event for ${id}`, (error as Error).stack);
    }

    this.logger.log(`Store suspended by admin: ${id}, reason: ${dto.reason || 'N/A'}`);
    const updatedStore = await this.vendorRepository.findStoreById(id);
    return {
      success: true,
      data: updatedStore,
      timestamp: new Date().toISOString(),
    };
  }

  async adminReactivateStore(id: string) {
    const store = await this.vendorRepository.findStoreById(id);
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    await this.vendorRepository.updateStoreStatus(id, 'active', {
      reactivated_at: new Date().toISOString(),
    });

    this.logger.log(`Store reactivated by admin: ${id}`);
    const updatedStore = await this.vendorRepository.findStoreById(id);
    return {
      success: true,
      data: updatedStore,
      timestamp: new Date().toISOString(),
    };
  }

  async adminUpdateStore(id: string, dto: AdminVendorUpdateDto) {
    const store = await this.vendorRepository.findStoreById(id);
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    const updateData: Partial<Store> = {};
    if (dto.commission_rate !== undefined) updateData.commission_rate = dto.commission_rate;
    if (dto.subscription_tier !== undefined) updateData.subscription_tier = dto.subscription_tier as any;
    if (dto.is_featured !== undefined) updateData.is_featured = dto.is_featured;

    if (Object.keys(updateData).length > 0) {
      await this.vendorRepository.adminUpdateStore(id, updateData);
    }

    this.logger.log(`Store admin-updated: ${id}, fields: ${Object.keys(updateData).join(', ')}`);
    const updatedStore = await this.vendorRepository.findStoreById(id);
    return {
      success: true,
      data: updatedStore,
      timestamp: new Date().toISOString(),
    };
  }
}
