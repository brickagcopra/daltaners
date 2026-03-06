import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandEntity, BrandStatus } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandQueryDto, BrandSortBy, SortOrder } from './dto/brand-query.dto';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class BrandRepository {
  private readonly logger = new Logger(BrandRepository.name);

  constructor(
    @InjectRepository(BrandEntity)
    private readonly brandRepo: Repository<BrandEntity>,
  ) {}

  async createBrand(dto: CreateBrandDto, slug: string): Promise<BrandEntity> {
    const brand = this.brandRepo.create({
      ...dto,
      slug,
      status: BrandStatus.PENDING,
    });
    return this.brandRepo.save(brand);
  }

  async findBrandById(id: string): Promise<BrandEntity | null> {
    return this.brandRepo.findOne({ where: { id } });
  }

  async findBrandBySlug(slug: string): Promise<BrandEntity | null> {
    return this.brandRepo.findOne({ where: { slug } });
  }

  async findBrandByName(name: string): Promise<BrandEntity | null> {
    return this.brandRepo.findOne({ where: { name } });
  }

  async brandSlugExists(slug: string): Promise<boolean> {
    const count = await this.brandRepo.count({ where: { slug } });
    return count > 0;
  }

  async findBrands(query: BrandQueryDto): Promise<PaginatedResult<BrandEntity>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const qb = this.brandRepo.createQueryBuilder('brand');

    if (query.search) {
      qb.andWhere('brand.name ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.status) {
      qb.andWhere('brand.status = :status', { status: query.status });
    }

    if (query.is_featured !== undefined) {
      qb.andWhere('brand.is_featured = :is_featured', { is_featured: query.is_featured });
    }

    if (query.country_of_origin) {
      qb.andWhere('brand.country_of_origin = :country', { country: query.country_of_origin });
    }

    const sortBy = query.sort_by || BrandSortBy.NAME;
    const sortOrder = query.sort_order || SortOrder.ASC;
    qb.orderBy(`brand.${sortBy}`, sortOrder);

    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findActiveBrands(): Promise<BrandEntity[]> {
    return this.brandRepo.find({
      where: [
        { status: BrandStatus.ACTIVE },
        { status: BrandStatus.VERIFIED },
      ],
      order: { name: 'ASC' },
    });
  }

  async findFeaturedBrands(): Promise<BrandEntity[]> {
    return this.brandRepo.find({
      where: { is_featured: true, status: BrandStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  async updateBrand(id: string, dto: Partial<BrandEntity>): Promise<BrandEntity | null> {
    await this.brandRepo.update(id, dto as any);
    return this.findBrandById(id);
  }

  async deleteBrand(id: string): Promise<boolean> {
    const result = await this.brandRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async incrementProductCount(id: string): Promise<void> {
    await this.brandRepo.increment({ id }, 'product_count', 1);
  }

  async decrementProductCount(id: string): Promise<void> {
    await this.brandRepo.decrement({ id }, 'product_count', 1);
  }

  async recalculateProductCount(brandId: string): Promise<number> {
    const result = await this.brandRepo.manager.query(
      `SELECT COUNT(*)::int as count FROM catalog.products WHERE brand_id = $1 AND is_active = true`,
      [brandId],
    );
    const count = result[0]?.count || 0;
    await this.brandRepo.update(brandId, { product_count: count });
    return count;
  }

  async getBrandStats(): Promise<{
    total: number;
    pending: number;
    verified: number;
    active: number;
    suspended: number;
    rejected: number;
  }> {
    const result = await this.brandRepo
      .createQueryBuilder('brand')
      .select([
        'COUNT(*)::int as total',
        `COUNT(*) FILTER (WHERE brand.status = 'pending')::int as pending`,
        `COUNT(*) FILTER (WHERE brand.status = 'verified')::int as verified`,
        `COUNT(*) FILTER (WHERE brand.status = 'active')::int as active`,
        `COUNT(*) FILTER (WHERE brand.status = 'suspended')::int as suspended`,
        `COUNT(*) FILTER (WHERE brand.status = 'rejected')::int as rejected`,
      ])
      .getRawOne();

    return {
      total: result.total || 0,
      pending: result.pending || 0,
      verified: result.verified || 0,
      active: result.active || 0,
      suspended: result.suspended || 0,
      rejected: result.rejected || 0,
    };
  }
}
