import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx } from '@nestjs/microservices';
import { KafkaContext } from '@nestjs/microservices';
import { DeliveryService } from './delivery.service';

interface OrderPlacedEvent {
  specversion: string;
  id: string;
  source: string;
  type: string;
  datacontenttype: string;
  time: string;
  data: {
    order_id: string;
    store_id: string;
    customer_id: string;
    pickup_latitude: number;
    pickup_longitude: number;
    dropoff_latitude: number;
    dropoff_longitude: number;
    delivery_fee: number;
    cod_amount?: number;
    pickup_location?: Record<string, unknown>;
    dropoff_location?: Record<string, unknown>;
  };
}

@Controller()
export class DeliveryConsumer {
  private readonly logger = new Logger(DeliveryConsumer.name);

  constructor(private readonly deliveryService: DeliveryService) {}

  @MessagePattern('daltaners.orders.events')
  async handleOrderEvents(@Payload() message: OrderPlacedEvent, @Ctx() context: KafkaContext) {
    const topic = context.getTopic();
    const partition = context.getPartition();
    const offset = context.getMessage().offset;

    this.logger.log(
      `Received event from ${topic} [partition=${partition}, offset=${offset}]: type=${message.type}`,
    );

    try {
      switch (message.type) {
        case 'com.daltaners.orders.placed':
          await this.handleOrderPlaced(message);
          break;
        case 'com.daltaners.orders.cancelled':
          await this.handleOrderCancelled(message);
          break;
        default:
          this.logger.debug(`Ignoring unhandled event type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process event ${message.type} for order ${message.data?.order_id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    const { order_id, pickup_latitude, pickup_longitude } = event.data;

    if (!order_id || !pickup_latitude || !pickup_longitude) {
      this.logger.warn(`ORDER_PLACED event missing required fields: ${JSON.stringify(event.data)}`);
      return;
    }

    this.logger.log(`Processing ORDER_PLACED for order ${order_id}`);

    const delivery = await this.deliveryService.assignRider(
      order_id,
      pickup_latitude,
      pickup_longitude,
    );

    if (!delivery) {
      this.logger.warn(`No rider could be assigned for order ${order_id} — will retry or alert`);
    } else {
      this.logger.log(`Rider assigned for order ${order_id}: delivery ${delivery.id}`);
    }
  }

  private async handleOrderCancelled(event: OrderPlacedEvent): Promise<void> {
    const { order_id } = event.data;

    this.logger.log(`Processing ORDER_CANCELLED for order ${order_id}`);

    try {
      const delivery = await this.deliveryService.getDeliveryByOrderId(order_id);

      if (['delivered', 'failed', 'cancelled'].includes(delivery.status)) {
        this.logger.log(`Delivery for order ${order_id} already in terminal state: ${delivery.status}`);
        return;
      }

      await this.deliveryService.updateDeliveryStatus(delivery.id, {
        status: 'cancelled' as any,
        failure_reason: 'Order cancelled by customer or system',
      });

      this.logger.log(`Delivery ${delivery.id} cancelled due to order cancellation`);
    } catch (error) {
      if ((error as any)?.status === 404) {
        this.logger.log(`No delivery found for cancelled order ${order_id} — nothing to cancel`);
      } else {
        throw error;
      }
    }
  }
}
