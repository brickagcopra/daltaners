import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrescriptionUploadEntity } from './entities/prescription-upload.entity';

@Injectable()
export class PrescriptionRepository {
  constructor(
    @InjectRepository(PrescriptionUploadEntity)
    private readonly repo: Repository<PrescriptionUploadEntity>,
  ) {}

  async create(data: Partial<PrescriptionUploadEntity>): Promise<PrescriptionUploadEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<PrescriptionUploadEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByCustomer(
    customerId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<{ items: PrescriptionUploadEntity[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: Record<string, unknown> = { customer_id: customerId };
    if (status) {
      where.status = status;
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByStatus(
    status: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: PrescriptionUploadEntity[]; total: number; page: number; limit: number; totalPages: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { status },
      order: { created_at: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findVerifiedById(id: string): Promise<PrescriptionUploadEntity | null> {
    return this.repo.findOne({
      where: { id, status: 'verified' },
    });
  }

  async findByHash(imageHash: string, customerId: string): Promise<PrescriptionUploadEntity | null> {
    return this.repo.findOne({
      where: { image_hash: imageHash, customer_id: customerId },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    additionalFields: Partial<PrescriptionUploadEntity> = {},
  ): Promise<PrescriptionUploadEntity | null> {
    await this.repo.update(id, { status, ...additionalFields });
    return this.findById(id);
  }
}
