import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BrandRepository, PaginatedResult } from './brand.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { BrandEntity, BrandStatus } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandQueryDto } from './dto/brand-query.dto';
import { KAFKA_TOPIC } from './events/catalog.events';

const BRAND_CACHE_PREFIX = 'catalog:brand:';
const BRANDS_LIST_CACHE = 'catalog:brands:active';
const BRAND_CACHE_TTL = 300; // 5 minutes

const BRAND_EVENTS = {
  BRAND_CREATED: 'daltaners.catalog.brand-created',
  BRAND_UPDATED: 'daltaners.catalog.brand-updated',
  BRAND_VERIFIED: 'daltaners.catalog.brand-verified',
  BRAND_REJECTED: 'daltaners.catalog.brand-rejected',
  BRAND_SUSPENDED: 'daltaners.catalog.brand-suspended',
  BRAND_ACTIVATED: 'daltaners.catalog.brand-activated',
  BRAND_DELETED: 'daltaners.catalog.brand-deleted',
} as const;

@Injectable()
export class BrandService {
  private readonly logger = new Logger(BrandService.name);

  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ─── Public Endpoints ───────────────────────────────────────────────

  async getActiveBrands(): Promise<BrandEntity[]> {
    const cached = await this.redisService.get(BRANDS_LIST_CACHE);
    if (cached) {
      return JSON.parse(cached);
    }

    const brands = await this.brandRepository.findActiveBrands();
    await this.redisService.set(BRANDS_LIST_CACHE, JSON.stringify(brands), BRAND_CACHE_TTL);
    return brands;
  }

  async getFeaturedBrands(): Promise<BrandEntity[]> {
    return this.brandRepository.findFeaturedBrands();
  }

  async getBrandByIdOrSlug(idOrSlug: string): Promise<BrandEntity> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let brand: BrandEntity | null;
    if (isUuid) {
      brand = await this.brandRepository.findBrandById(idOrSlug);
    } else {
      brand = await this.brandRepository.findBrandBySlug(idOrSlug);
    }

    if (!brand) {
      throw new NotFoundException(`Brand "${idOrSlug}" not found`);
    }
    return brand;
  }

  // ─── Admin Operations ──────────────────────────────────────────────

  async createBrand(dto: CreateBrandDto, adminId: string): Promise<BrandEntity> {
    const existing = await this.brandRepository.findBrandByName(dto.name);
    if (existing) {
      throw new ConflictException(`Brand "${dto.name}" already exists`);
    }

    const slug = this.generateSlug(dto.name);
    const uniqueSlug = await this.ensureUniqueSlug(slug);

    const brand = await this.brandRepository.createBrand(dto, uniqueSlug);

    await this.invalidateBrandCaches();
    this.publishBrandEvent(BRAND_EVENTS.BRAND_CREATED, brand);
    this.logger.log(`Brand created: ${brand.id} (${brand.name}) by admin ${adminId}`);

    return brand;
  }

  async updateBrand(id: string, dto: UpdateBrandDto, adminId: string): Promise<BrandEntity> {
    const brand = await this.brandRepository.findBrandById(id);
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    const updateData: Partial<BrandEntity> = { ...dto };

    if (dto.name && dto.name !== brand.name) {
      const existing = await this.brandRepository.findBrandByName(dto.name);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Brand "${dto.name}" already exists`);
      }
      const slug = this.generateSlug(dto.name);
      updateData.slug = await this.ensureUniqueSlug(slug, id);
    }

    const updated = await this.brandRepository.updateBrand(id, updateData);
    if (!updated) {
      throw new NotFoundException(`Brand with ID ${id} not found after update`);
    }

    await this.invalidateBrandCaches(id);
    this.publishBrandEvent(BRAND_EVENTS.BRAND_UPDATED, updated);
    this.logger.log(`Brand updated: ${id} by admin ${adminId}`);

    return updated;
  }

  async verifyBrand(id: string, adminId: string): Promise<BrandEntity> {
    const brand = await this.brandRepository.findBrandById(id);
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    if (brand.status !== BrandStatus.PENDING) {
      throw new BadRequestException(`Brand can only be verified from "pending" status, current: "${brand.status}"`);
    }

    const updated = await this.brandRepository.updateBrand(id, {
      status: BrandStatus.VERIFIED,
      verified_at: new Date(),
      verified_by: adminId,
    });

    await this.invalidateBrandCaches(id);
    this.publishBrandEvent(BRAND_EVENTS.BRAND_VERIFIED, updated!);
    this.logger.log(`Brand verified: ${id} by admin ${adminId}`);

    return updated!;
  }

  async activateBrand(id: string, adminId: string): Promise<BrandEntity> {
    const brand = await this.brandRepository.findBrandById(id);
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    if (brand.status !== BrandStatus.VERIFIED && brand.status !== BrandStatus.SUSPENDED) {
      throw new BadRequestException(
        `Brand can only be activated from "verified" or "suspended" status, current: "${brand.status}"`,
      );
    }

    const updated = await this.brandRepository.updateBrand(id, {
      status: BrandStatus.ACTIVE,
    });

    await this.invalidateBrandCaches(id);
    this.publishBrandEvent(BRAND_EVENTS.BRAND_ACTIVATED, updated!);
    this.logger.log(`Brand activated: ${id} by admin ${adminId}`);

    return updated!;
  }

  async rejectBrand(id: string, adminId: string): Promise<BrandEntity> {
    const brand = await this.brandRepository.findBrandById(id);
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    if (brand.status !== BrandStatus.PENDING) {
      throw new BadRequestException(`Brand can only be rejected from "pending" status, current: "${brand.status}"`);
    }

    const updated = await this.brandRepository.updateBrand(id, {
      status: BrandStatus.REJECTED,
    });

    await this.invalidateBrandCaches(id);
    this.publishBrandEvent(BRAND_EVENTS.BRAND_REJECTED, updated!);
    this.logger.log(`Brand rejected: ${id} by admin ${adminId}`);

    return updated!;
  }

  async suspendBrand(id: string, adminId: string): Promise<BrandEntity> {
    const brand = await this.brandRepository.findBrandById(id);
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    if (brand.status !== BrandStatus.ACTIVE && brand.status !== BrandStatus.VERIFIED) {
      throw new BadRequestException(
        `Brand can only be suspended from "active" or "verified" status, current: "${brand.status}"`,
      );
    }

    const updated = await this.brandRepository.updateBrand(id, {
      status: BrandStatus.SUSPENDED,
    });

    await this.invalidateBrandCaches(id);
    this.publishBrandEvent(BRAND_EVENTS.BRAND_SUSPENDED, updated!);
    this.logger.log(`Brand suspended: ${id} by admin ${adminId}`);

    return updated!;
  }

  async deleteBrand(id: string, adminId: string): Promise<void> {
    const brand = await this.brandRepository.findBrandById(id);
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    if (brand.product_count > 0) {
      throw new BadRequestException(
        `Cannot delete brand "${brand.name}" — it has ${brand.product_count} linked products. Remove product associations first.`,
      );
    }

    await this.brandRepository.deleteBrand(id);
    await this.invalidateBrandCaches(id);
    this.publishBrandEvent(BRAND_EVENTS.BRAND_DELETED, brand);
    this.logger.log(`Brand deleted: ${id} (${brand.name}) by admin ${adminId}`);
  }

  async getBrands(query: BrandQueryDto): Promise<PaginatedResult<BrandEntity>> {
    return this.brandRepository.findBrands(query);
  }

  async getBrandStats() {
    return this.brandRepository.getBrandStats();
  }

  async recalculateProductCount(brandId: string): Promise<number> {
    const brand = await this.brandRepository.findBrandById(brandId);
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${brandId} not found`);
    }
    return this.brandRepository.recalculateProductCount(brandId);
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const existing = await this.brandRepository.findBrandBySlug(slug);
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
  }

  private async invalidateBrandCaches(brandId?: string): Promise<void> {
    await this.redisService.del(BRANDS_LIST_CACHE);
    if (brandId) {
      await this.redisService.del(`${BRAND_CACHE_PREFIX}${brandId}`);
    }
  }

  private publishBrandEvent(eventType: string, brand: BrandEntity): void {
    this.kafkaProducer
      .publish(KAFKA_TOPIC, eventType, {
        brand_id: brand.id,
        name: brand.name,
        slug: brand.slug,
        status: brand.status,
        is_featured: brand.is_featured,
        product_count: brand.product_count,
      })
      .catch((err) => {
        this.logger.error(`Failed to publish brand event: ${eventType}`, err.stack);
      });
  }
}
