import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SettlementService } from './settlement.service';

@Injectable()
export class SettlementScheduler {
  private readonly logger = new Logger(SettlementScheduler.name);

  constructor(private readonly settlementService: SettlementService) {}

  /**
   * Weekly settlement generation — every Monday at 3:00 AM Manila time (UTC+8).
   * Generates settlements for the previous week (Mon 00:00 → Sun 23:59:59.999).
   */
  @Cron('0 3 * * 1', { timeZone: 'Asia/Manila' })
  async handleWeeklySettlement() {
    this.logger.log('Weekly settlement cron triggered');

    const now = new Date();

    // Calculate previous Monday 00:00:00 Manila time
    const prevMonday = new Date(now);
    prevMonday.setDate(prevMonday.getDate() - 7);
    prevMonday.setHours(0, 0, 0, 0);
    // Adjust to Monday (getDay: 0=Sun, 1=Mon, ...)
    const dayOfWeek = prevMonday.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    prevMonday.setDate(prevMonday.getDate() - daysToMonday);

    // Previous Sunday 23:59:59.999
    const prevSunday = new Date(prevMonday);
    prevSunday.setDate(prevSunday.getDate() + 6);
    prevSunday.setHours(23, 59, 59, 999);

    const periodStart = prevMonday.toISOString();
    const periodEnd = prevSunday.toISOString();

    this.logger.log(`Settlement period: ${periodStart} to ${periodEnd}`);

    try {
      const result = await this.settlementService.generateSettlements(periodStart, periodEnd);
      this.logger.log(
        `Weekly settlement complete: ${result.generated} generated, ${result.skipped} skipped`,
      );
    } catch (error) {
      this.logger.error(
        `Weekly settlement failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
