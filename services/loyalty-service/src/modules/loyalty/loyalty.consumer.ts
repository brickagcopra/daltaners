import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { LoyaltyService } from './loyalty.service';

interface OrderStatusChangedEvent {
  specversion: string;
  id: string;
  source: string;
  type: string;
  datacontenttype: string;
  time: string;
  data: {
    order_id: string;
    order_number: string;
    customer_id: string;
    store_id: string;
    total_amount: number;
    previous_status: string;
    new_status: string;
    updated_by: string;
    updated_by_role: string;
  };
}

@Controller()
export class LoyaltyConsumer {
  private readonly logger = new Logger(LoyaltyConsumer.name);

  constructor(private readonly loyaltyService: LoyaltyService) {}

  @EventPattern('daltaners.orders.events')
  async handleOrderEvents(
    @Payload() message: OrderStatusChangedEvent,
    @Ctx() context: KafkaContext,
  ) {
    try {
      const topic = context.getTopic();
      const partition = context.getPartition();
      const offset = context.getMessage().offset;

      this.logger.log(
        `Received event from ${topic} [partition=${partition}, offset=${offset}]: type=${message.type}`,
      );

      // Only process delivered orders for points earning
      if (
        message.type === 'com.daltaners.orders.status_changed' &&
        message.data?.new_status === 'delivered'
      ) {
        const { order_id, customer_id, total_amount } = message.data;

        if (!total_amount || total_amount <= 0) {
          this.logger.warn(
            `Order ${order_id} delivered but no valid total_amount (${total_amount}), skipping points`,
          );
          return;
        }

        this.logger.log(
          `Processing loyalty points for delivered order ${order_id}, amount: ${total_amount}`,
        );

        await this.loyaltyService.earnPointsForOrder(
          order_id,
          customer_id,
          total_amount,
        );
      }
    } catch (error) {
      // Log error but don't throw — prevents consumer crash
      // In production, implement DLQ for failed messages
      this.logger.error(
        `Error processing order event: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
