import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';

interface KafkaEventMessage {
  type: string;
  data: Record<string, unknown>;
}

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  @EventPattern('daltaners.orders.events')
  async handleOrderEvent(@Payload() message: KafkaEventMessage): Promise<void> {
    this.logger.log(`Received order event: ${message.type}`);

    try {
      switch (message.type) {
        case 'com.daltaners.orders.placed':
          await this.notificationService.sendNotification(
            message.data.customer_id as string,
            'push',
            'Order Placed!',
            `Your order ${message.data.order_number} has been placed successfully.`,
            message.data,
          );
          // Real-time WebSocket notification
          this.notificationGateway.emitNotification(
            message.data.customer_id as string,
            {
              title: 'Order Placed!',
              body: `Your order ${message.data.order_number} has been placed successfully.`,
              type: 'order_placed',
              data: message.data,
            },
          );
          break;

        case 'com.daltaners.orders.confirmed':
          await this.notificationService.sendNotification(
            message.data.customer_id as string,
            'push',
            'Order Confirmed',
            `Your order ${message.data.order_number} has been confirmed by the store.`,
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.customer_id as string,
            {
              title: 'Order Confirmed',
              body: `Your order ${message.data.order_number} has been confirmed by the store.`,
              type: 'order_confirmed',
              data: message.data,
            },
          );
          break;

        case 'com.daltaners.orders.status_changed': {
          const statusLabel = this.formatOrderStatus(
            message.data.new_status as string,
          );
          await this.notificationService.sendNotification(
            message.data.customer_id as string,
            'push',
            'Order Update',
            `Your order ${message.data.order_number} is now ${statusLabel}.`,
            message.data,
          );
          // Emit to user room
          this.notificationGateway.emitNotification(
            message.data.customer_id as string,
            {
              title: 'Order Update',
              body: `Your order ${message.data.order_number} is now ${statusLabel}.`,
              type: 'order_status_changed',
              data: message.data,
            },
          );
          // Emit to order-specific room (for tracking pages)
          if (message.data.order_id) {
            this.notificationGateway.emitOrderStatusUpdate(
              message.data.order_id as string,
              {
                order_id: message.data.order_id as string,
                order_number: message.data.order_number as string,
                status: message.data.new_status as string,
                previous_status: message.data.previous_status as string,
              },
            );
          }
          break;
        }

        case 'com.daltaners.orders.cancelled':
          await this.notificationService.sendNotification(
            message.data.customer_id as string,
            'push',
            'Order Cancelled',
            `Your order ${message.data.order_number} has been cancelled.`,
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.customer_id as string,
            {
              title: 'Order Cancelled',
              body: `Your order ${message.data.order_number} has been cancelled.`,
              type: 'order_cancelled',
              data: message.data,
            },
          );
          if (message.data.order_id) {
            this.notificationGateway.emitOrderStatusUpdate(
              message.data.order_id as string,
              {
                order_id: message.data.order_id as string,
                order_number: message.data.order_number as string,
                status: 'cancelled',
                previous_status: message.data.previous_status as string,
              },
            );
          }
          break;

        case 'com.daltaners.orders.ready_for_pickup':
          await this.notificationService.sendNotification(
            message.data.customer_id as string,
            'push',
            'Order Ready',
            `Your order ${message.data.order_number} is ready for pickup!`,
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.customer_id as string,
            {
              title: 'Order Ready',
              body: `Your order ${message.data.order_number} is ready for pickup!`,
              type: 'order_ready',
              data: message.data,
            },
          );
          break;

        default:
          this.logger.debug(`Unhandled order event type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process order event ${message.type}: ${error}`);
    }
  }

  @EventPattern('daltaners.delivery.events')
  async handleDeliveryEvent(@Payload() message: KafkaEventMessage): Promise<void> {
    this.logger.log(`Received delivery event: ${message.type}`);

    try {
      switch (message.type) {
        case 'com.daltaners.delivery.assigned':
          await this.notificationService.sendNotification(
            message.data.customer_id as string,
            'push',
            'Rider Assigned',
            'A delivery rider has been assigned to your order.',
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.customer_id as string,
            {
              title: 'Rider Assigned',
              body: 'A delivery rider has been assigned to your order.',
              type: 'delivery_assigned',
              data: message.data,
            },
          );
          // Notify the rider
          if (message.data.rider_id) {
            await this.notificationService.sendNotification(
              message.data.rider_id as string,
              'push',
              'New Delivery Assignment',
              `You have a new delivery assignment for order ${message.data.order_number}.`,
              message.data,
            );
            this.notificationGateway.emitNotification(
              message.data.rider_id as string,
              {
                title: 'New Delivery Assignment',
                body: `You have a new delivery assignment for order ${message.data.order_number}.`,
                type: 'delivery_new_assignment',
                data: message.data,
              },
            );
          }
          break;

        case 'com.daltaners.delivery.picked_up':
          await this.notificationService.sendNotification(
            message.data.customer_id as string,
            'push',
            'Order Picked Up',
            'Your order has been picked up by the rider and is on its way.',
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.customer_id as string,
            {
              title: 'Order Picked Up',
              body: 'Your order has been picked up by the rider and is on its way.',
              type: 'delivery_picked_up',
              data: message.data,
            },
          );
          if (message.data.order_id) {
            this.notificationGateway.emitOrderStatusUpdate(
              message.data.order_id as string,
              {
                order_id: message.data.order_id as string,
                status: 'picked_up',
              },
            );
          }
          break;

        case 'com.daltaners.delivery.near_destination':
          await this.notificationService.sendNotification(
            message.data.customer_id as string,
            'push',
            'Rider Nearby',
            'Your delivery rider is almost at your location.',
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.customer_id as string,
            {
              title: 'Rider Nearby',
              body: 'Your delivery rider is almost at your location.',
              type: 'delivery_near',
              data: message.data,
            },
          );
          break;

        case 'com.daltaners.delivery.completed':
          await this.notificationService.sendNotification(
            message.data.customer_id as string,
            'push',
            'Order Delivered',
            'Your order has been delivered. Enjoy!',
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.customer_id as string,
            {
              title: 'Order Delivered',
              body: 'Your order has been delivered. Enjoy!',
              type: 'delivery_completed',
              data: message.data,
            },
          );
          if (message.data.order_id) {
            this.notificationGateway.emitOrderStatusUpdate(
              message.data.order_id as string,
              {
                order_id: message.data.order_id as string,
                status: 'delivered',
              },
            );
          }
          break;

        default:
          this.logger.debug(`Unhandled delivery event type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process delivery event ${message.type}: ${error}`);
    }
  }

  /**
   * GPS location updates from delivery service.
   * Forwards to connected clients via WebSocket for live tracking.
   */
  @EventPattern('daltaners.delivery.location')
  async handleDeliveryLocationEvent(@Payload() message: KafkaEventMessage): Promise<void> {
    if (message.type !== 'com.daltaners.delivery.location_updated') return;

    try {
      if (message.data.order_id) {
        this.notificationGateway.emitDeliveryLocationUpdate(
          message.data.order_id as string,
          {
            latitude: message.data.latitude as number,
            longitude: message.data.longitude as number,
            speed: message.data.speed as number | undefined,
            heading: message.data.heading as number | undefined,
            eta_minutes: message.data.eta_minutes as number | undefined,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to forward GPS location: ${error}`);
    }
  }

  @EventPattern('daltaners.payments.events')
  async handlePaymentEvent(@Payload() message: KafkaEventMessage): Promise<void> {
    this.logger.log(`Received payment event: ${message.type}`);

    try {
      switch (message.type) {
        case 'com.daltaners.payments.completed':
          await this.notificationService.sendNotification(
            message.data.user_id as string,
            'push',
            'Payment Confirmed',
            `Payment of PHP ${message.data.amount} has been processed.`,
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.user_id as string,
            {
              title: 'Payment Confirmed',
              body: `Payment of PHP ${message.data.amount} has been processed.`,
              type: 'payment_completed',
              data: message.data,
            },
          );
          break;

        case 'com.daltaners.payments.failed':
          await this.notificationService.sendNotification(
            message.data.user_id as string,
            'push',
            'Payment Failed',
            `Your payment of PHP ${message.data.amount} could not be processed. Please try again.`,
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.user_id as string,
            {
              title: 'Payment Failed',
              body: `Your payment of PHP ${message.data.amount} could not be processed.`,
              type: 'payment_failed',
              data: message.data,
            },
          );
          break;

        case 'com.daltaners.payments.refunded':
          await this.notificationService.sendNotification(
            message.data.user_id as string,
            'push',
            'Refund Processed',
            `A refund of PHP ${message.data.amount} has been processed to your account.`,
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.user_id as string,
            {
              title: 'Refund Processed',
              body: `A refund of PHP ${message.data.amount} has been processed.`,
              type: 'payment_refunded',
              data: message.data,
            },
          );
          break;

        default:
          this.logger.debug(`Unhandled payment event type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process payment event ${message.type}: ${error}`);
    }
  }

  @EventPattern('daltaners.inventory.events')
  async handleInventoryEvent(@Payload() message: KafkaEventMessage): Promise<void> {
    this.logger.log(`Received inventory event: ${message.type}`);

    try {
      switch (message.type) {
        case 'com.daltaners.inventory.low':
          await this.notificationService.sendNotification(
            message.data.vendor_user_id as string,
            'push',
            'Low Stock Alert',
            `Product "${message.data.product_name}" is running low on stock.`,
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.vendor_user_id as string,
            {
              title: 'Low Stock Alert',
              body: `Product "${message.data.product_name}" is running low on stock.`,
              type: 'inventory_low',
              data: message.data,
            },
          );
          break;

        case 'com.daltaners.inventory.out_of_stock':
          await this.notificationService.sendNotification(
            message.data.vendor_user_id as string,
            'push',
            'Out of Stock',
            `Product "${message.data.product_name}" is now out of stock.`,
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.vendor_user_id as string,
            {
              title: 'Out of Stock',
              body: `Product "${message.data.product_name}" is now out of stock.`,
              type: 'inventory_out_of_stock',
              data: message.data,
            },
          );
          break;

        case 'com.daltaners.inventory.restocked':
          await this.notificationService.sendNotification(
            message.data.vendor_user_id as string,
            'push',
            'Product Restocked',
            `Product "${message.data.product_name}" has been restocked.`,
            message.data,
          );
          this.notificationGateway.emitNotification(
            message.data.vendor_user_id as string,
            {
              title: 'Product Restocked',
              body: `Product "${message.data.product_name}" has been restocked.`,
              type: 'inventory_restocked',
              data: message.data,
            },
          );
          break;

        default:
          this.logger.debug(`Unhandled inventory event type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process inventory event ${message.type}: ${error}`);
    }
  }

  private formatOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      confirmed: 'confirmed',
      preparing: 'being prepared',
      ready: 'ready for pickup',
      picked_up: 'picked up by rider',
      in_transit: 'on its way',
      delivered: 'delivered',
      cancelled: 'cancelled',
      returned: 'returned',
      refunded: 'refunded',
    };
    return statusMap[status] || status;
  }
}
