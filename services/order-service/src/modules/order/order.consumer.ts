import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { KafkaContext } from '@nestjs/microservices';
import { OrderService } from './order.service';

interface PaymentEvent {
  specversion: string;
  id: string;
  source: string;
  type: string;
  datacontenttype: string;
  time: string;
  data: {
    order_id: string;
    payment_id: string;
    status: string;
    amount: number;
    idempotency_key: string;
  };
}

interface DeliveryTrackingEvent {
  specversion: string;
  id: string;
  source: string;
  type: string;
  datacontenttype: string;
  time: string;
  data: {
    order_id: string;
    delivery_id: string;
    status: string;
    rider_id: string;
    latitude: number;
    longitude: number;
  };
}

@Controller()
export class OrderConsumer {
  private readonly logger = new Logger(OrderConsumer.name);
  private readonly processedEventIds = new Set<string>();

  constructor(private readonly orderService: OrderService) {}

  @EventPattern('daltaners.payments.events')
  async handlePaymentEvent(
    @Payload() message: PaymentEvent,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    const eventId = message.id;
    const eventType = message.type;

    // Idempotency check: skip duplicate events
    if (this.processedEventIds.has(eventId)) {
      this.logger.warn(`Duplicate payment event skipped: ${eventId}`);
      return;
    }

    this.logger.log(`Received payment event: ${eventType} for order ${message.data.order_id}`);

    try {
      switch (eventType) {
        case 'com.daltaners.payments.completed':
          await this.orderService.handlePaymentCompleted(message.data.order_id);
          break;

        case 'com.daltaners.payments.failed':
          await this.orderService.handlePaymentFailed(message.data.order_id);
          break;

        default:
          this.logger.warn(`Unhandled payment event type: ${eventType}`);
          break;
      }

      // Mark event as processed
      this.processedEventIds.add(eventId);

      // Prevent memory leak by limiting the set size
      if (this.processedEventIds.size > 10000) {
        const iterator = this.processedEventIds.values();
        for (let i = 0; i < 5000; i++) {
          const result = iterator.next();
          if (!result.done) {
            this.processedEventIds.delete(result.value);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process payment event ${eventType} for order ${message.data.order_id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error; // Rethrow to trigger Kafka retry mechanism
    }
  }

  @EventPattern('daltaners.delivery.events')
  async handleDeliveryTrackingEvent(
    @Payload() message: DeliveryTrackingEvent,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    const eventId = message.id;
    const eventType = message.type;

    // Idempotency check: skip duplicate events
    if (this.processedEventIds.has(eventId)) {
      this.logger.warn(`Duplicate delivery tracking event skipped: ${eventId}`);
      return;
    }

    this.logger.log(
      `Received delivery tracking event: ${eventType} for order ${message.data.order_id}`,
    );

    try {
      const deliveryStatus = message.data.status;
      await this.orderService.handleDeliveryStatusUpdate(
        message.data.order_id,
        deliveryStatus,
      );

      // Mark event as processed
      this.processedEventIds.add(eventId);

      // Prevent memory leak
      if (this.processedEventIds.size > 10000) {
        const iterator = this.processedEventIds.values();
        for (let i = 0; i < 5000; i++) {
          const result = iterator.next();
          if (!result.done) {
            this.processedEventIds.delete(result.value);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process delivery tracking event for order ${message.data.order_id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error; // Rethrow to trigger Kafka retry mechanism
    }
  }
}
