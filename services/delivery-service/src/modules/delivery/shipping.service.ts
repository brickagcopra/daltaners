import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ShippingRepository } from './shipping.repository';
import { RedisService } from '../../config/redis.service';
import { KafkaProducerService } from '../../config/kafka-producer.service';
import { SHIPPING_EVENTS } from './events/shipping.events';
import { ShippingCarrierEntity } from './entities/shipping-carrier.entity';
import { CarrierServiceEntity } from './entities/carrier-service.entity';
import { ShipmentEntity } from './entities/shipment.entity';

// --- Carrier Adapter Interface ---
export interface CarrierAdapter {
  getCode(): string;
  bookShipment(shipment: ShipmentEntity): Promise<CarrierBookingResult>;
  cancelShipment(shipment: ShipmentEntity): Promise<boolean>;
  trackShipment(trackingNumber: string): Promise<CarrierTrackingResult>;
  generateLabel(shipment: ShipmentEntity): Promise<CarrierLabelResult>;
  calculateRate(params: RateCalculationParams): Promise<CarrierRate>;
}

export interface CarrierBookingResult {
  tracking_number: string;
  carrier_reference: string;
  estimated_pickup_at?: Date;
  estimated_delivery_at?: Date;
  carrier_response: Record<string, unknown>;
}

export interface CarrierTrackingResult {
  status: string;
  carrier_status: string;
  location?: string;
  timestamp?: Date;
  events: Array<{ status: string; description: string; timestamp: Date; location?: string }>;
}

export interface CarrierLabelResult {
  label_url: string;
  label_format: string;
}

export interface CarrierRate {
  carrier_code: string;
  carrier_name: string;
  service_code: string;
  service_name: string;
  shipping_fee: number;
  estimated_days_min: number;
  estimated_days_max: number;
  is_cod_supported: boolean;
  is_insurance_available: boolean;
}

export interface RateCalculationParams {
  pickup_address: Record<string, unknown>;
  delivery_address: Record<string, unknown>;
  weight_kg?: number;
  dimensions?: Record<string, unknown>;
  cod_required?: boolean;
}

// --- Generic Carrier Adapter (simulates third-party API calls) ---
class GenericCarrierAdapter implements CarrierAdapter {
  constructor(
    private readonly carrier: ShippingCarrierEntity,
    private readonly logger: Logger,
  ) {}

  getCode(): string {
    return this.carrier.code;
  }

  async bookShipment(shipment: ShipmentEntity): Promise<CarrierBookingResult> {
    this.logger.log(`[${this.carrier.code}] Booking shipment ${shipment.shipment_number}`);

    const trackingNumber = `${this.carrier.code.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = new Date();
    const estimatedPickup = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const estimatedDelivery = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return {
      tracking_number: trackingNumber,
      carrier_reference: `REF-${trackingNumber}`,
      estimated_pickup_at: estimatedPickup,
      estimated_delivery_at: estimatedDelivery,
      carrier_response: {
        success: true,
        message: `Shipment booked with ${this.carrier.name}`,
        booked_at: now.toISOString(),
      },
    };
  }

  async cancelShipment(shipment: ShipmentEntity): Promise<boolean> {
    this.logger.log(`[${this.carrier.code}] Cancelling shipment ${shipment.shipment_number}`);
    return true;
  }

  async trackShipment(trackingNumber: string): Promise<CarrierTrackingResult> {
    this.logger.log(`[${this.carrier.code}] Tracking ${trackingNumber}`);
    return {
      status: 'in_transit',
      carrier_status: 'IN_TRANSIT',
      events: [
        {
          status: 'booked',
          description: 'Shipment booked',
          timestamp: new Date(),
        },
      ],
    };
  }

  async generateLabel(shipment: ShipmentEntity): Promise<CarrierLabelResult> {
    this.logger.log(`[${this.carrier.code}] Generating label for ${shipment.shipment_number}`);
    return {
      label_url: `https://labels.daltaners.ph/${this.carrier.code}/${shipment.tracking_number || shipment.shipment_number}.pdf`,
      label_format: 'pdf',
    };
  }

  async calculateRate(params: RateCalculationParams): Promise<CarrierRate> {
    const weight = params.weight_kg || 1;
    const services = this.carrier.services?.filter((s) => s.is_active) || [];
    const service = services[0];

    const fee = service
      ? Number(service.base_price) + Number(service.per_kg_price) * weight
      : 85 + 15 * weight;

    return {
      carrier_code: this.carrier.code,
      carrier_name: this.carrier.name,
      service_code: service?.code || 'standard',
      service_name: service?.name || 'Standard',
      shipping_fee: Math.round(fee * 100) / 100,
      estimated_days_min: service?.estimated_days_min || 1,
      estimated_days_max: service?.estimated_days_max || 3,
      is_cod_supported: service?.is_cod_supported || false,
      is_insurance_available: service?.is_insurance_available || false,
    };
  }
}

// --- Valid status transitions ---
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['booked', 'cancelled'],
  booked: ['label_generated', 'picked_up', 'cancelled'],
  label_generated: ['picked_up', 'cancelled'],
  picked_up: ['in_transit'],
  in_transit: ['out_for_delivery', 'delivered', 'failed'],
  out_for_delivery: ['delivered', 'failed'],
  delivered: [],
  failed: ['returned_to_sender', 'in_transit'],
  returned_to_sender: [],
  cancelled: [],
};

const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly adapters = new Map<string, CarrierAdapter>();

  constructor(
    private readonly shippingRepo: ShippingRepository,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // --- Carrier Adapter Management ---

  private getOrCreateAdapter(carrier: ShippingCarrierEntity): CarrierAdapter {
    if (this.adapters.has(carrier.code)) {
      return this.adapters.get(carrier.code)!;
    }
    const adapter = new GenericCarrierAdapter(carrier, this.logger);
    this.adapters.set(carrier.code, adapter);
    return adapter;
  }

  registerAdapter(code: string, adapter: CarrierAdapter): void {
    this.adapters.set(code, adapter);
    this.logger.log(`Registered carrier adapter: ${code}`);
  }

  // --- Carrier CRUD ---

  async createCarrier(data: Partial<ShippingCarrierEntity>): Promise<ShippingCarrierEntity> {
    const existing = await this.shippingRepo.findCarrierByCode(data.code!);
    if (existing) {
      throw new ConflictException(`Carrier with code "${data.code}" already exists`);
    }
    const carrier = await this.shippingRepo.createCarrier(data);
    await this.invalidateCarrierCache();
    return carrier;
  }

  async getCarrier(id: string): Promise<ShippingCarrierEntity> {
    const carrier = await this.shippingRepo.findCarrierById(id);
    if (!carrier) throw new NotFoundException('Carrier not found');
    return carrier;
  }

  async listCarriers(query: {
    search?: string;
    type?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: ShippingCarrierEntity[]; total: number }> {
    return this.shippingRepo.findAllCarriers(query);
  }

  async getActiveCarriers(): Promise<ShippingCarrierEntity[]> {
    const cacheKey = 'shipping:carriers:active';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const carriers = await this.shippingRepo.findActiveCarriers();
    await this.redisService.set(cacheKey, JSON.stringify(carriers), CACHE_TTL);
    return carriers;
  }

  async updateCarrier(
    id: string,
    data: Partial<ShippingCarrierEntity>,
  ): Promise<ShippingCarrierEntity> {
    const existing = await this.getCarrier(id);
    if (!existing) throw new NotFoundException('Carrier not found');

    const updated = await this.shippingRepo.updateCarrier(id, data);
    if (!updated) throw new NotFoundException('Carrier not found');

    this.adapters.delete(existing.code);
    await this.invalidateCarrierCache();
    return updated;
  }

  async deleteCarrier(id: string): Promise<void> {
    const carrier = await this.getCarrier(id);
    await this.shippingRepo.deleteCarrier(id);
    this.adapters.delete(carrier.code);
    await this.invalidateCarrierCache();
  }

  // --- Carrier Service CRUD ---

  async createCarrierService(data: Partial<CarrierServiceEntity>): Promise<CarrierServiceEntity> {
    await this.getCarrier(data.carrier_id!);
    const service = await this.shippingRepo.createCarrierService(data);
    await this.invalidateCarrierCache();
    return service;
  }

  async getCarrierService(id: string): Promise<CarrierServiceEntity> {
    const service = await this.shippingRepo.findCarrierServiceById(id);
    if (!service) throw new NotFoundException('Carrier service not found');
    return service;
  }

  async listCarrierServices(carrierId: string): Promise<CarrierServiceEntity[]> {
    return this.shippingRepo.findServicesByCarrierId(carrierId);
  }

  async updateCarrierService(
    id: string,
    data: Partial<CarrierServiceEntity>,
  ): Promise<CarrierServiceEntity> {
    const updated = await this.shippingRepo.updateCarrierService(id, data);
    if (!updated) throw new NotFoundException('Carrier service not found');
    await this.invalidateCarrierCache();
    return updated;
  }

  async deleteCarrierService(id: string): Promise<void> {
    await this.getCarrierService(id);
    await this.shippingRepo.deleteCarrierService(id);
    await this.invalidateCarrierCache();
  }

  // --- Shipping Rates ---

  async getShippingRates(params: RateCalculationParams): Promise<CarrierRate[]> {
    const carriers = await this.getActiveCarriers();
    const rates: CarrierRate[] = [];

    for (const carrier of carriers) {
      try {
        const adapter = this.getOrCreateAdapter(carrier);
        const activeServices = carrier.services?.filter((s) => s.is_active) || [];

        if (params.cod_required) {
          const hasCod = activeServices.some((s) => s.is_cod_supported);
          if (!hasCod) continue;
        }

        const rate = await adapter.calculateRate(params);

        // Generate rates for each active service
        for (const service of activeServices) {
          if (params.cod_required && !service.is_cod_supported) continue;

          const weight = params.weight_kg || 1;
          if (weight > Number(service.max_weight_kg)) continue;

          const fee = Number(service.base_price) + Number(service.per_kg_price) * weight;
          rates.push({
            carrier_code: carrier.code,
            carrier_name: carrier.name,
            service_code: service.code,
            service_name: service.name,
            shipping_fee: Math.round(fee * 100) / 100,
            estimated_days_min: service.estimated_days_min,
            estimated_days_max: service.estimated_days_max,
            is_cod_supported: service.is_cod_supported,
            is_insurance_available: service.is_insurance_available,
          });
        }

        // If no individual services, use the adapter rate
        if (activeServices.length === 0) {
          rates.push(rate);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get rate from carrier ${carrier.code}: ${(error as Error).message}`,
        );
      }
    }

    return rates.sort((a, b) => a.shipping_fee - b.shipping_fee);
  }

  // --- Shipment Lifecycle ---

  async createShipment(data: {
    order_id: string;
    carrier_id: string;
    carrier_service_id?: string;
    store_id: string;
    weight_kg?: number;
    dimensions?: Record<string, unknown>;
    package_count?: number;
    pickup_address: Record<string, unknown>;
    delivery_address: Record<string, unknown>;
    shipping_fee?: number;
    insurance_amount?: number;
    cod_amount?: number;
    notes?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ShipmentEntity> {
    // Verify carrier exists
    const carrier = await this.getCarrier(data.carrier_id);
    if (!carrier.is_active) {
      throw new BadRequestException('Carrier is not active');
    }

    // Verify carrier service if provided
    if (data.carrier_service_id) {
      const service = await this.getCarrierService(data.carrier_service_id);
      if (service.carrier_id !== data.carrier_id) {
        throw new BadRequestException('Carrier service does not belong to the specified carrier');
      }
      if (!service.is_active) {
        throw new BadRequestException('Carrier service is not active');
      }
    }

    // Check for duplicate order-shipment
    const existing = await this.shippingRepo.findShipmentByOrderId(data.order_id);
    if (existing && existing.status !== 'cancelled') {
      throw new ConflictException('A shipment already exists for this order');
    }

    const shipmentNumber = await this.shippingRepo.getNextShipmentNumber();

    const shipment = await this.shippingRepo.createShipment({
      ...data,
      shipment_number: shipmentNumber,
      status: 'pending',
    });

    await this.kafkaProducer.publish(
      SHIPPING_EVENTS.TOPIC,
      SHIPPING_EVENTS.SHIPMENT_CREATED,
      {
        id: shipment.id,
        shipment_number: shipment.shipment_number,
        order_id: shipment.order_id,
        carrier_id: shipment.carrier_id,
        store_id: shipment.store_id,
        status: shipment.status,
      },
    );

    return (await this.shippingRepo.findShipmentById(shipment.id))!;
  }

  async bookShipment(shipmentId: string): Promise<ShipmentEntity> {
    const shipment = await this.getShipment(shipmentId);
    this.validateTransition(shipment.status, 'booked');

    const carrier = await this.getCarrier(shipment.carrier_id);
    const adapter = this.getOrCreateAdapter(carrier);

    const result = await adapter.bookShipment(shipment);

    const updated = await this.shippingRepo.updateShipment(shipmentId, {
      status: 'booked',
      tracking_number: result.tracking_number,
      carrier_reference: result.carrier_reference,
      estimated_pickup_at: result.estimated_pickup_at || null,
      estimated_delivery_at: result.estimated_delivery_at || null,
      carrier_response: result.carrier_response,
    });

    await this.kafkaProducer.publish(
      SHIPPING_EVENTS.TOPIC,
      SHIPPING_EVENTS.SHIPMENT_BOOKED,
      {
        id: updated!.id,
        shipment_number: updated!.shipment_number,
        order_id: updated!.order_id,
        tracking_number: result.tracking_number,
        carrier_code: carrier.code,
      },
    );

    return updated!;
  }

  async generateLabel(shipmentId: string): Promise<ShipmentEntity> {
    const shipment = await this.getShipment(shipmentId);
    if (shipment.status !== 'booked') {
      throw new BadRequestException('Shipment must be booked before generating label');
    }

    const carrier = await this.getCarrier(shipment.carrier_id);
    const adapter = this.getOrCreateAdapter(carrier);

    const labelResult = await adapter.generateLabel(shipment);

    const updated = await this.shippingRepo.updateShipment(shipmentId, {
      status: 'label_generated',
      label_url: labelResult.label_url,
      label_format: labelResult.label_format,
    });

    return updated!;
  }

  async updateShipmentStatus(
    shipmentId: string,
    data: {
      status: string;
      tracking_number?: string;
      carrier_reference?: string;
      carrier_status?: string;
      carrier_response?: Record<string, unknown>;
      label_url?: string;
      label_format?: string;
      notes?: string;
    },
  ): Promise<ShipmentEntity> {
    const shipment = await this.getShipment(shipmentId);
    this.validateTransition(shipment.status, data.status);

    const updateData: Partial<ShipmentEntity> = { ...data };

    // Set timestamps based on status
    const now = new Date();
    if (data.status === 'picked_up') {
      updateData.actual_pickup_at = now;
    } else if (data.status === 'delivered') {
      updateData.actual_delivery_at = now;
    }

    const updated = await this.shippingRepo.updateShipment(shipmentId, updateData);

    // Map status to event type
    const eventMap: Record<string, string> = {
      picked_up: SHIPPING_EVENTS.SHIPMENT_PICKED_UP,
      in_transit: SHIPPING_EVENTS.SHIPMENT_IN_TRANSIT,
      delivered: SHIPPING_EVENTS.SHIPMENT_DELIVERED,
      failed: SHIPPING_EVENTS.SHIPMENT_FAILED,
      cancelled: SHIPPING_EVENTS.SHIPMENT_CANCELLED,
    };

    const eventType = eventMap[data.status] || SHIPPING_EVENTS.SHIPMENT_STATUS_UPDATED;

    await this.kafkaProducer.publish(SHIPPING_EVENTS.TOPIC, eventType, {
      id: updated!.id,
      shipment_number: updated!.shipment_number,
      order_id: updated!.order_id,
      store_id: updated!.store_id,
      status: data.status,
      tracking_number: updated!.tracking_number,
      carrier_status: data.carrier_status,
    });

    return updated!;
  }

  async cancelShipment(shipmentId: string, reason?: string): Promise<ShipmentEntity> {
    const shipment = await this.getShipment(shipmentId);
    this.validateTransition(shipment.status, 'cancelled');

    // Attempt carrier cancellation if already booked
    if (shipment.tracking_number) {
      try {
        const carrier = await this.getCarrier(shipment.carrier_id);
        const adapter = this.getOrCreateAdapter(carrier);
        await adapter.cancelShipment(shipment);
      } catch (error) {
        this.logger.warn(
          `Carrier cancellation failed for ${shipment.shipment_number}: ${(error as Error).message}`,
        );
      }
    }

    const updated = await this.shippingRepo.updateShipment(shipmentId, {
      status: 'cancelled',
      notes: reason || shipment.notes,
    });

    await this.kafkaProducer.publish(
      SHIPPING_EVENTS.TOPIC,
      SHIPPING_EVENTS.SHIPMENT_CANCELLED,
      {
        id: updated!.id,
        shipment_number: updated!.shipment_number,
        order_id: updated!.order_id,
        store_id: updated!.store_id,
        reason,
      },
    );

    return updated!;
  }

  async trackShipment(shipmentId: string): Promise<CarrierTrackingResult> {
    const shipment = await this.getShipment(shipmentId);
    if (!shipment.tracking_number) {
      throw new BadRequestException('Shipment has no tracking number');
    }

    const carrier = await this.getCarrier(shipment.carrier_id);
    const adapter = this.getOrCreateAdapter(carrier);

    return adapter.trackShipment(shipment.tracking_number);
  }

  // --- Shipment Queries ---

  async getShipment(id: string): Promise<ShipmentEntity> {
    const shipment = await this.shippingRepo.findShipmentById(id);
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async getShipmentByOrder(orderId: string): Promise<ShipmentEntity | null> {
    return this.shippingRepo.findShipmentByOrderId(orderId);
  }

  async getShipmentByTrackingNumber(trackingNumber: string): Promise<ShipmentEntity> {
    const shipment = await this.shippingRepo.findShipmentByTrackingNumber(trackingNumber);
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async listShipments(query: {
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
    return this.shippingRepo.findShipments(query);
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
    const cacheKey = storeId
      ? `shipping:stats:${storeId}`
      : 'shipping:stats:all';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const stats = await this.shippingRepo.getShipmentStats(storeId);
    await this.redisService.set(cacheKey, JSON.stringify(stats), CACHE_TTL);
    return stats;
  }

  // --- Carrier Webhook ---

  async handleCarrierWebhook(
    carrierCode: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const carrier = await this.shippingRepo.findCarrierByCode(carrierCode);
    if (!carrier) {
      throw new NotFoundException(`Carrier "${carrierCode}" not found`);
    }

    this.logger.log(`Received webhook from carrier: ${carrierCode}`);

    await this.kafkaProducer.publish(
      SHIPPING_EVENTS.TOPIC,
      SHIPPING_EVENTS.CARRIER_WEBHOOK_RECEIVED,
      {
        carrier_code: carrierCode,
        carrier_id: carrier.id,
        payload,
        received_at: new Date().toISOString(),
      },
    );
  }

  // --- Helpers ---

  private validateTransition(currentStatus: string, newStatus: string): void {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${currentStatus}" to "${newStatus}"`,
      );
    }
  }

  private async invalidateCarrierCache(): Promise<void> {
    await this.redisService.del('shipping:carriers:active');
  }
}
