import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingCarrierEntity } from './entities/shipping-carrier.entity';
import { CarrierServiceEntity } from './entities/carrier-service.entity';
import { ShipmentEntity } from './entities/shipment.entity';

@Injectable()
export class ShippingRepository {
  private readonly logger = new Logger(ShippingRepository.name);

  constructor(
    @InjectRepository(ShippingCarrierEntity)
    private readonly carrierRepo: Repository<ShippingCarrierEntity>,
    @InjectRepository(CarrierServiceEntity)
    private readonly carrierServiceRepo: Repository<CarrierServiceEntity>,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepo: Repository<ShipmentEntity>,
  ) {}

  // --- Carrier Methods ---

  async createCarrier(data: Partial<ShippingCarrierEntity>): Promise<ShippingCarrierEntity> {
    const carrier = this.carrierRepo.create(data);
    return this.carrierRepo.save(carrier);
  }

  async findCarrierById(id: string): Promise<ShippingCarrierEntity | null> {
    return this.carrierRepo.findOne({
      where: { id },
      relations: ['services'],
    });
  }

  async findCarrierByCode(code: string): Promise<ShippingCarrierEntity | null> {
    return this.carrierRepo.findOne({
      where: { code },
      relations: ['services'],
    });
  }

  async findAllCarriers(query: {
    search?: string;
    type?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: ShippingCarrierEntity[]; total: number }> {
    const { search, type, is_active, page = 1, limit = 20 } = query;

    const qb = this.carrierRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.services', 's')
      .orderBy('c.priority', 'DESC')
      .addOrderBy('c.name', 'ASC');

    if (search) {
      qb.andWhere('(c.name ILIKE :search OR c.code ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (type) {
      qb.andWhere('c.type = :type', { type });
    }
    if (is_active !== undefined) {
      qb.andWhere('c.is_active = :is_active', { is_active });
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findActiveCarriers(): Promise<ShippingCarrierEntity[]> {
    return this.carrierRepo.find({
      where: { is_active: true },
      relations: ['services'],
      order: { priority: 'DESC', name: 'ASC' },
    });
  }

  async updateCarrier(
    id: string,
    data: Partial<ShippingCarrierEntity>,
  ): Promise<ShippingCarrierEntity | null> {
    await this.carrierRepo.update(id, data as any);
    return this.findCarrierById(id);
  }

  async deleteCarrier(id: string): Promise<void> {
    await this.carrierRepo.delete(id);
  }

  // --- Carrier Service Methods ---

  async createCarrierService(data: Partial<CarrierServiceEntity>): Promise<CarrierServiceEntity> {
    const service = this.carrierServiceRepo.create(data);
    return this.carrierServiceRepo.save(service);
  }

  async findCarrierServiceById(id: string): Promise<CarrierServiceEntity | null> {
    return this.carrierServiceRepo.findOne({
      where: { id },
      relations: ['carrier'],
    });
  }

  async findServicesByCarrierId(carrierId: string): Promise<CarrierServiceEntity[]> {
    return this.carrierServiceRepo.find({
      where: { carrier_id: carrierId },
      order: { base_price: 'ASC' },
    });
  }

  async findActiveServicesByCarrierId(carrierId: string): Promise<CarrierServiceEntity[]> {
    return this.carrierServiceRepo.find({
      where: { carrier_id: carrierId, is_active: true },
      order: { base_price: 'ASC' },
    });
  }

  async updateCarrierService(
    id: string,
    data: Partial<CarrierServiceEntity>,
  ): Promise<CarrierServiceEntity | null> {
    await this.carrierServiceRepo.update(id, data as any);
    return this.findCarrierServiceById(id);
  }

  async deleteCarrierService(id: string): Promise<void> {
    await this.carrierServiceRepo.delete(id);
  }

  // --- Shipment Methods ---

  async createShipment(data: Partial<ShipmentEntity>): Promise<ShipmentEntity> {
    const shipment = this.shipmentRepo.create(data);
    return this.shipmentRepo.save(shipment);
  }

  async findShipmentById(id: string): Promise<ShipmentEntity | null> {
    return this.shipmentRepo.findOne({
      where: { id },
      relations: ['carrier', 'carrier_service'],
    });
  }

  async findShipmentByNumber(shipmentNumber: string): Promise<ShipmentEntity | null> {
    return this.shipmentRepo.findOne({
      where: { shipment_number: shipmentNumber },
      relations: ['carrier', 'carrier_service'],
    });
  }

  async findShipmentByOrderId(orderId: string): Promise<ShipmentEntity | null> {
    return this.shipmentRepo.findOne({
      where: { order_id: orderId },
      relations: ['carrier', 'carrier_service'],
    });
  }

  async findShipmentByTrackingNumber(trackingNumber: string): Promise<ShipmentEntity | null> {
    return this.shipmentRepo.findOne({
      where: { tracking_number: trackingNumber },
      relations: ['carrier', 'carrier_service'],
    });
  }

  async findShipments(query: {
    store_id?: string;
    carrier_id?: string;
    order_id?: string;
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<{ items: ShipmentEntity[]; total: number }> {
    const {
      store_id, carrier_id, order_id, status, search,
      date_from, date_to,
      sort_by = 'created_at', sort_order = 'DESC',
      page = 1, limit = 20,
    } = query;

    const qb = this.shipmentRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.carrier', 'c')
      .leftJoinAndSelect('s.carrier_service', 'cs');

    if (store_id) {
      qb.andWhere('s.store_id = :store_id', { store_id });
    }
    if (carrier_id) {
      qb.andWhere('s.carrier_id = :carrier_id', { carrier_id });
    }
    if (order_id) {
      qb.andWhere('s.order_id = :order_id', { order_id });
    }
    if (status) {
      qb.andWhere('s.status = :status', { status });
    }
    if (search) {
      qb.andWhere(
        '(s.shipment_number ILIKE :search OR s.tracking_number ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (date_from) {
      qb.andWhere('s.created_at >= :date_from', { date_from });
    }
    if (date_to) {
      qb.andWhere('s.created_at <= :date_to', { date_to });
    }

    const validSortFields = ['created_at', 'updated_at', 'shipping_fee', 'status'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    qb.orderBy(`s.${sortField}`, sort_order);

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateShipment(
    id: string,
    data: Partial<ShipmentEntity>,
  ): Promise<ShipmentEntity | null> {
    await this.shipmentRepo.update(id, data as any);
    return this.findShipmentById(id);
  }

  async getShipmentStats(storeId?: string): Promise<{
    total: number;
    pending: number;
    booked: number;
    in_transit: number;
    delivered: number;
    failed: number;
    cancelled: number;
  }> {
    const qb = this.shipmentRepo.createQueryBuilder('s');

    if (storeId) {
      qb.andWhere('s.store_id = :store_id', { store_id: storeId });
    }

    const result = await qb
      .select('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE s.status = 'pending')", 'pending')
      .addSelect("COUNT(*) FILTER (WHERE s.status = 'booked')", 'booked')
      .addSelect("COUNT(*) FILTER (WHERE s.status IN ('in_transit', 'out_for_delivery', 'picked_up', 'label_generated'))", 'in_transit')
      .addSelect("COUNT(*) FILTER (WHERE s.status = 'delivered')", 'delivered')
      .addSelect("COUNT(*) FILTER (WHERE s.status IN ('failed', 'returned_to_sender'))", 'failed')
      .addSelect("COUNT(*) FILTER (WHERE s.status = 'cancelled')", 'cancelled')
      .getRawOne();

    return {
      total: parseInt(result.total, 10),
      pending: parseInt(result.pending, 10),
      booked: parseInt(result.booked, 10),
      in_transit: parseInt(result.in_transit, 10),
      delivered: parseInt(result.delivered, 10),
      failed: parseInt(result.failed, 10),
      cancelled: parseInt(result.cancelled, 10),
    };
  }

  async getNextShipmentNumber(): Promise<string> {
    const now = new Date();
    const prefix = `SHP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const result = await this.shipmentRepo
      .createQueryBuilder('s')
      .select('COUNT(*)', 'count')
      .where('s.shipment_number LIKE :prefix', { prefix: `${prefix}%` })
      .getRawOne();

    const seq = parseInt(result.count, 10) + 1;
    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }
}
