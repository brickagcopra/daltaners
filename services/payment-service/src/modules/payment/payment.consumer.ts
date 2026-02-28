import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { KafkaContext } from '@nestjs/microservices';
import { PaymentService } from './payment.service';

interface OrderPlacedEvent {
  specversion: string;
  id: string;
  source: string;
  type: string;
  datacontenttype: string;
  time: string;
  data: {
    order_id: string;
    user_id: string;
    total_amount: number;
    payment_method: string;
    idempotency_key?: string;
  };
}

@Controller()
export class PaymentConsumer {
  private readonly logger = new Logger(PaymentConsumer.name);

  constructor(private readonly paymentService: PaymentService) {}

  @EventPattern('daltaners.orders.events')
  async handleOrderEvents(@Payload() message: OrderPlacedEvent, @Ctx() context: KafkaContext) {
    const topic = context.getTopic();
    const partition = context.getPartition();
    const offset = context.getMessage().offset;

    this.logger.log(
      `Received event on ${topic} [partition=${partition}, offset=${offset}]: type=${message.type}`,
    );

    try {
      // Handle ORDER_PLACED events to initiate payment capture
      if (message.type === 'com.daltaners.orders.placed') {
        await this.paymentService.handleOrderPlaced(message.data);
      } else {
        this.logger.debug(`Ignoring event type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event [topic=${topic}, offset=${offset}]: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // In production: after max retries, send to DLQ
      // For now, log and do not throw to avoid consumer crash
    }
  }
}
