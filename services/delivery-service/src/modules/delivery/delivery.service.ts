import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DeliveryRepository } from './delivery.repository';
import { LocationService } from './location.service';
import { KafkaProducerService } from '../../config/kafka-producer.service';
import { DeliveryGateway } from './delivery.gateway';
import { RegisterRiderDto } from './dto/register-rider.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateDeliveryStatusDto, DeliveryStatus } from './dto/update-delivery-status.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryPersonnelEntity } from './entities/delivery-personnel.entity';
import { DeliveryEntity } from './entities/delivery.entity';

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  assigned: ['accepted', 'rejected', 'cancelled'],
  accepted: ['at_store', 'cancelled'],
  at_store: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'failed'],
  in_transit: ['arrived', 'failed'],
  arrived: ['delivered', 'failed'],
  delivered: [],
  failed: [],
  cancelled: [],
};

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly repository: DeliveryRepository,
    private readonly locationService: LocationService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly deliveryGateway: DeliveryGateway,
  ) {}

  // --- Rider Registration & Management ---

  async registerRider(dto: RegisterRiderDto): Promise<DeliveryPersonnelEntity> {
    const existing = await this.repository.findPersonnelByUserId(dto.user_id);
    if (existing) {
      throw new ConflictException('Rider already registered for this user');
    }

    const personnel = await this.repository.createPersonnel({
      user_id: dto.user_id,
      vehicle_type: dto.vehicle_type,
      vehicle_plate: dto.vehicle_plate || null,
      license_number: dto.license_number || null,
      license_expiry: dto.license_expiry ? new Date(dto.license_expiry) : null,
      status: 'pending',
      is_online: false,
      current_order_count: 0,
      max_concurrent_orders: 2,
      rating_average: 0,
      total_deliveries: 0,
    });

    this.logger.log(`Rider registered: ${personnel.id} for user ${dto.user_id}`);

    await this.kafkaProducer.publish(
      'daltaners.delivery.events',
      'com.daltaners.delivery.rider_registered',
      {
        id: personnel.id,
        user_id: dto.user_id,
        vehicle_type: dto.vehicle_type,
      },
    );

    return personnel;
  }

  async getRiderByUserId(userId: string): Promise<DeliveryPersonnelEntity> {
    const personnel = await this.repository.findPersonnelByUserId(userId);
    if (!personnel) {
      throw new NotFoundException('Rider profile not found');
    }
    return personnel;
  }

  async getRiderById(personnelId: string): Promise<DeliveryPersonnelEntity> {
    const personnel = await this.repository.findPersonnelById(personnelId);
    if (!personnel) {
      throw new NotFoundException('Rider not found');
    }
    return personnel;
  }

  // --- Online/Offline Toggle ---

  async toggleOnline(userId: string, isOnline: boolean): Promise<DeliveryPersonnelEntity> {
    const personnel = await this.getRiderByUserId(userId);

    if (personnel.status !== 'active') {
      throw new BadRequestException('Rider account is not active. Current status: ' + personnel.status);
    }

    const updated = await this.repository.toggleOnline(personnel.id, isOnline);

    await this.locationService.setRiderOnlineStatus(personnel.id, isOnline);

    if (!isOnline) {
      await this.locationService.removeRiderLocation(personnel.id);
    }

    this.logger.log(`Rider ${personnel.id} is now ${isOnline ? 'online' : 'offline'}`);

    await this.kafkaProducer.publish(
      'daltaners.delivery.events',
      'com.daltaners.delivery.rider_status_changed',
      {
        id: personnel.id,
        user_id: userId,
        is_online: isOnline,
      },
    );

    return updated!;
  }

  // --- GPS Location Updates ---

  async updateGpsLocation(userId: string, dto: UpdateLocationDto): Promise<void> {
    const personnel = await this.getRiderByUserId(userId);

    if (!personnel.is_online) {
      throw new BadRequestException('Rider must be online to update location');
    }

    await Promise.all([
      this.locationService.updateRiderLocation(personnel.id, dto.latitude, dto.longitude),
      this.repository.updateLocation(personnel.id, dto.latitude, dto.longitude),
    ]);

    const activeDeliveries = await this.repository.findActiveDeliveriesByPersonnelId(personnel.id);
    for (const delivery of activeDeliveries) {
      this.deliveryGateway.broadcastLocationUpdate(delivery.order_id, {
        lat: dto.latitude,
        lng: dto.longitude,
        heading: dto.heading,
      });
    }

    await this.kafkaProducer.publish(
      'daltaners.delivery.location',
      'com.daltaners.delivery.location_updated',
      {
        id: personnel.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        heading: dto.heading,
        accuracy: dto.accuracy,
        battery_level: dto.battery_level,
      },
    );
  }

  // --- Nearby Riders (Redis GEOSEARCH) ---

  async findNearbyRiders(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<{ personnel_id: string; location: { lat: number; lng: number } | null }[]> {
    const nearbyIds = await this.locationService.findNearbyRiders(latitude, longitude, radiusKm);

    const results: { personnel_id: string; location: { lat: number; lng: number } | null }[] = [];
    for (const personnelId of nearbyIds) {
      const location = await this.locationService.getRiderLocation(personnelId);
      results.push({ personnel_id: personnelId, location });
    }

    return results;
  }

  // --- Rider Assignment ---

  private readonly SEARCH_RADII_KM = [5, 10, 15];
  private readonly AVG_SPEED_KPH = 25; // average rider speed for ETA

  // Vehicle suitability: larger vehicles can handle all order sizes
  private readonly VEHICLE_CAPACITY_ORDER: string[] = ['walking', 'bicycle', 'motorcycle', 'car', 'van'];

  async assignRider(
    orderId: string,
    pickupLat: number,
    pickupLng: number,
    options?: { zoneId?: string; requiredVehicle?: string },
  ): Promise<DeliveryEntity | null> {
    const existingDelivery = await this.repository.findDeliveryByOrderId(orderId);
    if (existingDelivery && !['cancelled', 'failed'].includes(existingDelivery.status)) {
      this.logger.warn(`Delivery already exists for order ${orderId} with status ${existingDelivery.status}`);
      return existingDelivery;
    }

    // Retry with expanding radius
    for (const radius of this.SEARCH_RADII_KM) {
      this.logger.log(`Searching for riders within ${radius}km for order ${orderId}`);

      const nearbyRiderIds = await this.locationService.findNearbyRiders(pickupLat, pickupLng, radius);

      if (nearbyRiderIds.length === 0) {
        continue;
      }

      let availableRiders = await this.repository.findOnlineAvailablePersonnel(nearbyRiderIds);

      if (availableRiders.length === 0) {
        continue;
      }

      // Zone-based filtering: prefer riders in the same zone
      if (options?.zoneId) {
        const zoneRiders = availableRiders.filter(r => r.current_zone_id === options.zoneId);
        if (zoneRiders.length > 0) {
          availableRiders = zoneRiders;
        }
      }

      // Vehicle type suitability check
      if (options?.requiredVehicle) {
        const minIndex = this.VEHICLE_CAPACITY_ORDER.indexOf(options.requiredVehicle);
        if (minIndex >= 0) {
          const suitableRiders = availableRiders.filter(r => {
            const riderIndex = this.VEHICLE_CAPACITY_ORDER.indexOf(r.vehicle_type);
            return riderIndex >= minIndex;
          });
          if (suitableRiders.length > 0) {
            availableRiders = suitableRiders;
          }
        }
      }

      // Score riders: distance weight + rating + availability
      const scoredRiders: { rider: DeliveryPersonnelEntity; score: number; distanceKm: number }[] = [];

      for (const rider of availableRiders) {
        const distanceKm = await this.locationService.getDistanceBetween(
          rider.id,
          pickupLat,
          pickupLng,
        );

        const dist = distanceKm ?? radius;
        // Distance score: closer = higher (max 40 points)
        const distanceScore = Math.max(0, 40 * (1 - dist / radius));
        // Rating score: higher = better (max 30 points)
        const ratingScore = Number(rider.rating_average) * 6; // 0-5 scale → 0-30
        // Availability score: fewer current orders = better (max 30 points)
        const availabilityScore = Math.max(0, 30 * (1 - rider.current_order_count / rider.max_concurrent_orders));

        const totalScore = distanceScore + ratingScore + availabilityScore;

        scoredRiders.push({ rider, score: totalScore, distanceKm: dist });
      }

      // Sort by score descending
      scoredRiders.sort((a, b) => b.score - a.score);

      if (scoredRiders.length === 0) {
        continue;
      }

      const selected = scoredRiders[0];

      // Calculate estimated pickup time
      const estimatedMinutes = Math.ceil((selected.distanceKm / this.AVG_SPEED_KPH) * 60);
      const estimatedPickupAt = new Date();
      estimatedPickupAt.setMinutes(estimatedPickupAt.getMinutes() + estimatedMinutes);

      const delivery = await this.repository.createDelivery({
        order_id: orderId,
        personnel_id: selected.rider.id,
        status: 'assigned',
        pickup_location: { lat: pickupLat, lng: pickupLng },
        estimated_pickup_at: estimatedPickupAt,
        distance_km: selected.distanceKm,
      });

      await this.repository.incrementOrderCount(selected.rider.id);

      this.logger.log(
        `Assigned rider ${selected.rider.id} to order ${orderId} ` +
        `(score: ${selected.score.toFixed(1)}, distance: ${selected.distanceKm.toFixed(1)}km, ` +
        `ETA: ${estimatedMinutes}min)`,
      );

      await this.kafkaProducer.publish(
        'daltaners.delivery.events',
        'com.daltaners.delivery.assigned',
        {
          id: delivery.id,
          order_id: orderId,
          personnel_id: selected.rider.id,
          rider_user_id: selected.rider.user_id,
          estimated_pickup_at: estimatedPickupAt.toISOString(),
          distance_km: selected.distanceKm,
        },
      );

      this.deliveryGateway.broadcastStatusUpdate(orderId, 'assigned');

      return delivery;
    }

    // All radius attempts exhausted — no rider available
    this.logger.warn(`No rider available for order ${orderId} after exhausting all radii`);

    await this.kafkaProducer.publish(
      'daltaners.delivery.events',
      'com.daltaners.delivery.no_rider_available',
      {
        order_id: orderId,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        searched_radii_km: this.SEARCH_RADII_KM,
      },
    );

    return null;
  }

  // --- Create Delivery ---

  async createDelivery(dto: CreateDeliveryDto): Promise<DeliveryEntity> {
    const existing = await this.repository.findDeliveryByOrderId(dto.order_id);
    if (existing && !['cancelled', 'failed'].includes(existing.status)) {
      throw new ConflictException('A delivery already exists for this order');
    }

    const delivery = await this.repository.createDelivery({
      order_id: dto.order_id,
      pickup_location: dto.pickup_location,
      dropoff_location: dto.dropoff_location,
      delivery_fee: dto.delivery_fee,
      cod_amount: dto.cod_amount || 0,
      tip_amount: dto.tip_amount || null,
      status: 'assigned',
    });

    this.logger.log(`Delivery created: ${delivery.id} for order ${dto.order_id}`);

    return delivery;
  }

  // --- Accept / Reject Delivery ---

  async acceptDelivery(deliveryId: string, userId: string): Promise<DeliveryEntity> {
    const delivery = await this.getDeliveryById(deliveryId);
    const personnel = await this.getRiderByUserId(userId);

    if (delivery.personnel_id !== personnel.id) {
      throw new BadRequestException('This delivery is not assigned to you');
    }

    if (delivery.status !== 'assigned') {
      throw new BadRequestException(`Cannot accept delivery with status: ${delivery.status}`);
    }

    const updated = await this.repository.updateDeliveryStatus(deliveryId, 'accepted');

    this.logger.log(`Delivery ${deliveryId} accepted by rider ${personnel.id}`);

    await this.kafkaProducer.publish(
      'daltaners.delivery.events',
      'com.daltaners.delivery.accepted',
      {
        id: deliveryId,
        order_id: delivery.order_id,
        personnel_id: personnel.id,
      },
    );

    this.deliveryGateway.broadcastStatusUpdate(delivery.order_id, 'accepted');

    return updated!;
  }

  async rejectDelivery(deliveryId: string, userId: string): Promise<DeliveryEntity> {
    const delivery = await this.getDeliveryById(deliveryId);
    const personnel = await this.getRiderByUserId(userId);

    if (delivery.personnel_id !== personnel.id) {
      throw new BadRequestException('This delivery is not assigned to you');
    }

    if (delivery.status !== 'assigned') {
      throw new BadRequestException(`Cannot reject delivery with status: ${delivery.status}`);
    }

    const updated = await this.repository.updateDeliveryStatus(deliveryId, 'cancelled', {
      failure_reason: 'Rejected by rider',
    });

    await this.repository.decrementOrderCount(personnel.id);

    this.logger.log(`Delivery ${deliveryId} rejected by rider ${personnel.id}`);

    await this.kafkaProducer.publish(
      'daltaners.delivery.events',
      'com.daltaners.delivery.rejected',
      {
        id: deliveryId,
        order_id: delivery.order_id,
        personnel_id: personnel.id,
      },
    );

    this.deliveryGateway.broadcastStatusUpdate(delivery.order_id, 'cancelled');

    return updated!;
  }

  // --- Update Delivery Status ---

  async updateDeliveryStatus(
    deliveryId: string,
    dto: UpdateDeliveryStatusDto,
  ): Promise<DeliveryEntity> {
    const delivery = await this.getDeliveryById(deliveryId);

    const allowedTransitions = VALID_STATUS_TRANSITIONS[delivery.status];
    if (!allowedTransitions || !allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${delivery.status}' to '${dto.status}'. ` +
        `Allowed transitions: ${(allowedTransitions || []).join(', ')}`,
      );
    }

    if (dto.status === DeliveryStatus.FAILED && !dto.failure_reason) {
      throw new BadRequestException('failure_reason is required when status is failed');
    }

    const additionalData: Partial<DeliveryEntity> = {};

    if (dto.failure_reason) {
      additionalData.failure_reason = dto.failure_reason;
    }

    if (dto.proof_of_delivery) {
      additionalData.proof_of_delivery = dto.proof_of_delivery;
    }

    switch (dto.status) {
      case DeliveryStatus.PICKED_UP:
        additionalData.actual_pickup_at = new Date();
        break;
      case DeliveryStatus.DELIVERED:
        additionalData.actual_delivery_at = new Date();
        if (delivery.personnel_id) {
          await this.repository.decrementOrderCount(delivery.personnel_id);
          await this.repository.incrementTotalDeliveries(delivery.personnel_id);
        }
        break;
      case DeliveryStatus.FAILED:
      case DeliveryStatus.CANCELLED:
        if (delivery.personnel_id) {
          await this.repository.decrementOrderCount(delivery.personnel_id);
        }
        break;
    }

    const updated = await this.repository.updateDeliveryStatus(
      deliveryId,
      dto.status,
      additionalData,
    );

    this.logger.log(`Delivery ${deliveryId} status updated to ${dto.status}`);

    await this.kafkaProducer.publish(
      'daltaners.delivery.events',
      `com.daltaners.delivery.${dto.status}`,
      {
        id: deliveryId,
        order_id: delivery.order_id,
        personnel_id: delivery.personnel_id,
        status: dto.status,
        failure_reason: dto.failure_reason || null,
      },
    );

    this.deliveryGateway.broadcastStatusUpdate(delivery.order_id, dto.status);

    return updated!;
  }

  // --- Reassignment & Admin ---

  async reassignDelivery(
    deliveryId: string,
    personnelId?: string,
    reason?: string,
  ): Promise<DeliveryEntity> {
    const delivery = await this.getDeliveryById(deliveryId);

    const terminalStatuses = ['delivered', 'failed', 'cancelled'];
    if (terminalStatuses.includes(delivery.status)) {
      throw new BadRequestException(`Cannot reassign delivery with status: ${delivery.status}`);
    }

    // Release current rider
    if (delivery.personnel_id) {
      await this.repository.decrementOrderCount(delivery.personnel_id);
    }

    if (personnelId) {
      // Manual assignment to specific rider
      const rider = await this.getRiderById(personnelId);
      if (rider.status !== 'active' || !rider.is_online) {
        throw new BadRequestException('Target rider is not active or online');
      }
      if (rider.current_order_count >= rider.max_concurrent_orders) {
        throw new BadRequestException('Target rider has reached maximum concurrent orders');
      }

      const updated = await this.repository.updateDelivery(deliveryId, {
        personnel_id: rider.id,
        status: 'assigned',
        failure_reason: reason ? `Reassigned: ${reason}` : null,
      });

      await this.repository.incrementOrderCount(rider.id);

      this.logger.log(`Delivery ${deliveryId} reassigned to rider ${rider.id}. Reason: ${reason || 'admin action'}`);

      await this.kafkaProducer.publish(
        'daltaners.delivery.events',
        'com.daltaners.delivery.reassigned',
        {
          id: deliveryId,
          order_id: delivery.order_id,
          personnel_id: rider.id,
          previous_personnel_id: delivery.personnel_id,
          reason: reason || 'admin action',
        },
      );

      this.deliveryGateway.broadcastStatusUpdate(delivery.order_id, 'assigned');

      return updated!;
    } else {
      // Auto-reassignment: clear current rider and try again
      await this.repository.updateDelivery(deliveryId, {
        personnel_id: undefined,
        status: 'cancelled',
        failure_reason: reason ? `Reassignment: ${reason}` : 'Auto-reassignment triggered',
      });

      // Attempt automatic assignment using pickup location
      const pickupLocation = delivery.pickup_location as { lat: number; lng: number } | null;
      if (pickupLocation?.lat && pickupLocation?.lng) {
        const newDelivery = await this.assignRider(
          delivery.order_id,
          pickupLocation.lat,
          pickupLocation.lng,
        );
        if (newDelivery) return newDelivery;
      }

      throw new BadRequestException('No available rider found for reassignment');
    }
  }

  async autoAssignDelivery(deliveryId: string): Promise<DeliveryEntity> {
    const delivery = await this.getDeliveryById(deliveryId);

    const terminalStatuses = ['delivered', 'failed', 'cancelled'];
    if (terminalStatuses.includes(delivery.status)) {
      throw new BadRequestException(`Cannot auto-assign delivery with status: ${delivery.status}`);
    }

    // Release current rider if any
    if (delivery.personnel_id) {
      await this.repository.decrementOrderCount(delivery.personnel_id);
      await this.repository.updateDelivery(deliveryId, {
        personnel_id: undefined,
        status: 'cancelled',
        failure_reason: 'Admin triggered auto-reassignment',
      });
    }

    const pickupLocation = delivery.pickup_location as { lat: number; lng: number } | null;
    if (!pickupLocation?.lat || !pickupLocation?.lng) {
      throw new BadRequestException('Delivery has no pickup location for auto-assignment');
    }

    const newDelivery = await this.assignRider(
      delivery.order_id,
      pickupLocation.lat,
      pickupLocation.lng,
    );

    if (!newDelivery) {
      throw new BadRequestException('No available rider found for auto-assignment');
    }

    return newDelivery;
  }

  async getActiveDeliveries(page: number = 1, limit: number = 20) {
    const { items, total } = await this.repository.findAllActiveDeliveries(page, limit);
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // --- Query Methods ---

  async getDeliveryById(deliveryId: string): Promise<DeliveryEntity> {
    const delivery = await this.repository.findDeliveryById(deliveryId);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    return delivery;
  }

  async getDeliveryByOrderId(orderId: string): Promise<DeliveryEntity> {
    const delivery = await this.repository.findDeliveryByOrderId(orderId);
    if (!delivery) {
      throw new NotFoundException('Delivery not found for this order');
    }
    return delivery;
  }

  async getMyDeliveries(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: DeliveryEntity[]; total: number; page: number; limit: number }> {
    const personnel = await this.getRiderByUserId(userId);
    const { items, total } = await this.repository.findDeliveriesByPersonnelId(
      personnel.id,
      page,
      limit,
    );
    return { items, total, page, limit };
  }
}
