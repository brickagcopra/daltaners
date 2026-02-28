import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPersonnelEntity } from './entities/delivery-personnel.entity';
import { DeliveryEntity } from './entities/delivery.entity';

@Injectable()
export class DeliveryRepository {
  private readonly logger = new Logger(DeliveryRepository.name);

  constructor(
    @InjectRepository(DeliveryPersonnelEntity)
    private readonly personnelRepo: Repository<DeliveryPersonnelEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepo: Repository<DeliveryEntity>,
  ) {}

  // --- Delivery Personnel Methods ---

  async createPersonnel(data: Partial<DeliveryPersonnelEntity>): Promise<DeliveryPersonnelEntity> {
    const personnel = this.personnelRepo.create(data);
    return this.personnelRepo.save(personnel);
  }

  async findPersonnelById(id: string): Promise<DeliveryPersonnelEntity | null> {
    return this.personnelRepo.findOne({ where: { id } });
  }

  async findPersonnelByUserId(userId: string): Promise<DeliveryPersonnelEntity | null> {
    return this.personnelRepo.findOne({ where: { user_id: userId } });
  }

  async updatePersonnel(
    id: string,
    data: Partial<DeliveryPersonnelEntity>,
  ): Promise<DeliveryPersonnelEntity | null> {
    await this.personnelRepo.update(id, data as any);
    return this.findPersonnelById(id);
  }

  async toggleOnline(personnelId: string, isOnline: boolean): Promise<DeliveryPersonnelEntity | null> {
    await this.personnelRepo.update(personnelId, { is_online: isOnline });
    return this.findPersonnelById(personnelId);
  }

  async updateLocation(
    personnelId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.personnelRepo.update(personnelId, {
      current_latitude: latitude,
      current_longitude: longitude,
    });
  }

  async findOnlineAvailablePersonnel(personnelIds: string[]): Promise<DeliveryPersonnelEntity[]> {
    if (personnelIds.length === 0) return [];

    return this.personnelRepo
      .createQueryBuilder('p')
      .where('p.id IN (:...ids)', { ids: personnelIds })
      .andWhere('p.status = :status', { status: 'active' })
      .andWhere('p.is_online = :online', { online: true })
      .andWhere('p.current_order_count < p.max_concurrent_orders')
      .orderBy('p.current_order_count', 'ASC')
      .addOrderBy('p.rating_average', 'DESC')
      .getMany();
  }

  async incrementOrderCount(personnelId: string): Promise<void> {
    await this.personnelRepo
      .createQueryBuilder()
      .update(DeliveryPersonnelEntity)
      .set({ current_order_count: () => 'current_order_count + 1' })
      .where('id = :id', { id: personnelId })
      .execute();
  }

  async decrementOrderCount(personnelId: string): Promise<void> {
    await this.personnelRepo
      .createQueryBuilder()
      .update(DeliveryPersonnelEntity)
      .set({ current_order_count: () => 'GREATEST(current_order_count - 1, 0)' })
      .where('id = :id', { id: personnelId })
      .execute();
  }

  async incrementTotalDeliveries(personnelId: string): Promise<void> {
    await this.personnelRepo
      .createQueryBuilder()
      .update(DeliveryPersonnelEntity)
      .set({ total_deliveries: () => 'total_deliveries + 1' })
      .where('id = :id', { id: personnelId })
      .execute();
  }

  // --- Delivery Methods ---

  async createDelivery(data: Partial<DeliveryEntity>): Promise<DeliveryEntity> {
    const delivery = this.deliveryRepo.create(data);
    return this.deliveryRepo.save(delivery);
  }

  async findDeliveryById(id: string): Promise<DeliveryEntity | null> {
    return this.deliveryRepo.findOne({
      where: { id },
      relations: ['personnel'],
    });
  }

  async findDeliveryByOrderId(orderId: string): Promise<DeliveryEntity | null> {
    return this.deliveryRepo.findOne({
      where: { order_id: orderId },
      relations: ['personnel'],
    });
  }

  async findDeliveriesByPersonnelId(
    personnelId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: DeliveryEntity[]; total: number }> {
    const [items, total] = await this.deliveryRepo.findAndCount({
      where: { personnel_id: personnelId },
      relations: ['personnel'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async updateDelivery(
    id: string,
    data: Partial<DeliveryEntity>,
  ): Promise<DeliveryEntity | null> {
    await this.deliveryRepo.update(id, data as any);
    return this.findDeliveryById(id);
  }

  async updateDeliveryStatus(
    id: string,
    status: string,
    additionalData?: Partial<DeliveryEntity>,
  ): Promise<DeliveryEntity | null> {
    const updateData: Partial<DeliveryEntity> = { status, ...additionalData };
    await this.deliveryRepo.update(id, updateData as any);
    return this.findDeliveryById(id);
  }

  async findAllActiveDeliveries(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: DeliveryEntity[]; total: number }> {
    const [items, total] = await this.deliveryRepo.findAndCount({
      where: [
        { status: 'assigned' },
        { status: 'accepted' },
        { status: 'at_store' },
        { status: 'picked_up' },
        { status: 'in_transit' },
        { status: 'arrived' },
      ],
      relations: ['personnel'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async findActiveDeliveriesByPersonnelId(personnelId: string): Promise<DeliveryEntity[]> {
    return this.deliveryRepo.find({
      where: [
        { personnel_id: personnelId, status: 'assigned' },
        { personnel_id: personnelId, status: 'accepted' },
        { personnel_id: personnelId, status: 'at_store' },
        { personnel_id: personnelId, status: 'picked_up' },
        { personnel_id: personnelId, status: 'in_transit' },
        { personnel_id: personnelId, status: 'arrived' },
      ],
      relations: ['personnel'],
      order: { created_at: 'DESC' },
    });
  }
}
