import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PerformanceService } from '../performance.service';

@Controller()
export class PerformanceSubscriber {
  private readonly logger = new Logger(PerformanceSubscriber.name);

  constructor(private readonly performanceService: PerformanceService) {}

  @EventPattern('daltaners.orders.events')
  async handleOrderEvent(
    @Payload() message: { value: string },
  ): Promise<void> {
    try {
      const event = typeof message === 'string' ? JSON.parse(message) : message;
      const data = event.data || event;

      if (!data.store_id) {
        return;
      }

      this.logger.log(`Received order event for store ${data.store_id}: ${data.status || data.type}`);

      await this.performanceService.handleOrderEvent({
        store_id: data.store_id,
        status: data.status || data.order_status,
        total_amount: data.total_amount,
      });
    } catch (error) {
      this.logger.error('Error processing order event', (error as Error).stack);
    }
  }

  @EventPattern('daltaners.returns.events')
  async handleReturnEvent(
    @Payload() message: { value: string },
  ): Promise<void> {
    try {
      const event = typeof message === 'string' ? JSON.parse(message) : message;
      const data = event.data || event;

      if (!data.store_id) {
        return;
      }

      this.logger.log(`Received return event for store ${data.store_id}`);

      await this.performanceService.handleReturnEvent({
        store_id: data.store_id,
      });
    } catch (error) {
      this.logger.error('Error processing return event', (error as Error).stack);
    }
  }

  @EventPattern('daltaners.disputes.events')
  async handleDisputeEvent(
    @Payload() message: { value: string },
  ): Promise<void> {
    try {
      const event = typeof message === 'string' ? JSON.parse(message) : message;
      const data = event.data || event;

      if (!data.store_id) {
        return;
      }

      this.logger.log(`Received dispute event for store ${data.store_id}`);

      await this.performanceService.handleDisputeEvent({
        store_id: data.store_id,
      });
    } catch (error) {
      this.logger.error('Error processing dispute event', (error as Error).stack);
    }
  }

  @EventPattern('daltaners.reviews.events')
  async handleReviewEvent(
    @Payload() message: { value: string },
  ): Promise<void> {
    try {
      const event = typeof message === 'string' ? JSON.parse(message) : message;
      const data = event.data || event;

      if (!data.store_id || data.reviewable_type !== 'store') {
        return;
      }

      this.logger.log(`Received review event for store ${data.store_id}`);

      await this.performanceService.handleReviewEvent({
        store_id: data.store_id || data.reviewable_id,
        rating: data.rating,
      });
    } catch (error) {
      this.logger.error('Error processing review event', (error as Error).stack);
    }
  }
}
