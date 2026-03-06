import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { KafkaProducerService } from './kafka-producer.service';
import { VendorSettlementEntity } from './entities/vendor-settlement.entity';

const KAFKA_TOPIC_SETTLEMENTS = 'daltaners.settlements.events';
const BIR_WITHHOLDING_TAX_RATE = 0.02; // 2% BIR default

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ── Settlement Generation ──────────────────────────────────────────

  async generateSettlements(
    periodStart: string,
    periodEnd: string,
    vendorId?: string,
  ): Promise<{ generated: number; skipped: number; settlements: VendorSettlementEntity[] }> {
    this.logger.log(`Generating settlements for period ${periodStart} to ${periodEnd}`);

    let vendors: Array<{ store_id: string; store_name: string; commission_rate: number }>;

    if (vendorId) {
      // Single vendor mode — still query to validate & get commission_rate
      vendors = await this.paymentRepo.getVendorsWithSettleableOrders(periodStart, periodEnd);
      vendors = vendors.filter((v) => v.store_id === vendorId);
    } else {
      vendors = await this.paymentRepo.getVendorsWithSettleableOrders(periodStart, periodEnd);
    }

    const settlements: VendorSettlementEntity[] = [];
    let skipped = 0;

    for (const vendor of vendors) {
      try {
        const settlement = await this.generateForVendor(
          vendor.store_id,
          vendor.commission_rate,
          periodStart,
          periodEnd,
        );
        if (settlement) {
          settlements.push(settlement);
        } else {
          skipped++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to generate settlement for vendor ${vendor.store_id}: ${(error as Error).message}`,
          (error as Error).stack,
        );
        skipped++;
      }
    }

    this.logger.log(
      `Settlement generation complete: ${settlements.length} generated, ${skipped} skipped`,
    );

    return {
      generated: settlements.length,
      skipped,
      settlements,
    };
  }

  async generateForVendor(
    storeId: string,
    commissionRate: number,
    periodStart: string,
    periodEnd: string,
  ): Promise<VendorSettlementEntity | null> {
    // Idempotency: check if settlement already exists for this vendor+period
    const existing = await this.paymentRepo.findExistingSettlement(storeId, periodStart, periodEnd);
    if (existing) {
      this.logger.warn(
        `Settlement already exists for vendor ${storeId} period ${periodStart}-${periodEnd}, skipping`,
      );
      return null;
    }

    // Get unsettled orders
    const orders = await this.paymentRepo.getUnsettledOrdersForVendor(
      storeId,
      periodStart,
      periodEnd,
    );

    if (orders.length === 0) {
      this.logger.log(`No unsettled orders for vendor ${storeId} in period`);
      return null;
    }

    // Calculate amounts
    const grossAmount = orders.reduce((sum, o) => sum + o.subtotal, 0);
    const commissionAmount = Math.round(grossAmount * (commissionRate / 100) * 100) / 100;
    const netAmount = Math.round((grossAmount - commissionAmount) * 100) / 100;
    const withholdingTax = Math.round(grossAmount * BIR_WITHHOLDING_TAX_RATE * 100) / 100;
    const finalAmount = Math.round((netAmount - withholdingTax) * 100) / 100;

    // Build settlement items
    const items = orders.map((order) => {
      const orderCommission =
        Math.round(order.subtotal * (commissionRate / 100) * 100) / 100;
      const orderNet = Math.round((order.subtotal - orderCommission) * 100) / 100;
      return {
        order_id: order.order_id,
        order_number: order.order_number,
        gross_amount: order.subtotal,
        commission_amount: orderCommission,
        net_amount: orderNet,
      };
    });

    // Create settlement + items atomically
    const settlement = await this.paymentRepo.createSettlementWithItems(
      {
        vendor_id: storeId,
        period_start: new Date(periodStart),
        period_end: new Date(periodEnd),
        gross_amount: grossAmount,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        withholding_tax: withholdingTax,
        adjustment_amount: 0,
        final_amount: finalAmount,
        status: 'pending',
        order_count: orders.length,
      },
      items,
    );

    this.logger.log(
      `Settlement created for vendor ${storeId}: ${settlement.id} (${orders.length} orders, gross=${grossAmount})`,
    );

    return settlement;
  }

  // ── Admin Actions ──────────────────────────────────────────────────

  async approveSettlement(
    id: string,
    adminUserId: string,
    notes?: string,
  ): Promise<VendorSettlementEntity> {
    const settlement = await this.getSettlementOrFail(id);

    if (settlement.status !== 'pending') {
      throw new BadRequestException(
        `Settlement ${id} cannot be approved (current status: ${settlement.status}). Only pending settlements can be approved.`,
      );
    }

    await this.paymentRepo.updateSettlement(id, {
      status: 'processing',
      approved_by: adminUserId,
      notes: notes || settlement.notes,
    });

    this.logger.log(`Settlement ${id} approved by admin ${adminUserId}`);

    return { ...settlement, status: 'processing', approved_by: adminUserId, notes: notes || settlement.notes };
  }

  async processSettlement(
    id: string,
    paymentReference?: string,
    notes?: string,
  ): Promise<VendorSettlementEntity> {
    const settlement = await this.getSettlementOrFail(id);

    if (settlement.status !== 'processing') {
      throw new BadRequestException(
        `Settlement ${id} cannot be processed (current status: ${settlement.status}). Only processing settlements can be marked as completed.`,
      );
    }

    const now = new Date();

    await this.paymentRepo.updateSettlement(id, {
      status: 'completed',
      payment_reference: paymentReference || settlement.payment_reference,
      settlement_date: now,
      notes: notes || settlement.notes,
    });

    const updated = {
      ...settlement,
      status: 'completed',
      payment_reference: paymentReference || settlement.payment_reference,
      settlement_date: now,
      notes: notes || settlement.notes,
    };

    // Publish settlement completed event
    await this.kafkaProducer.publish(
      KAFKA_TOPIC_SETTLEMENTS,
      'completed',
      {
        settlement_id: settlement.id,
        vendor_id: settlement.vendor_id,
        final_amount: Number(settlement.final_amount),
        order_count: settlement.order_count,
        payment_reference: paymentReference,
        completed_at: now.toISOString(),
      },
      settlement.vendor_id,
    );

    this.logger.log(
      `Settlement ${id} marked as completed (ref: ${paymentReference || 'none'})`,
    );

    return updated;
  }

  async rejectSettlement(id: string, reason: string): Promise<VendorSettlementEntity> {
    const settlement = await this.getSettlementOrFail(id);

    if (settlement.status !== 'pending') {
      throw new BadRequestException(
        `Settlement ${id} cannot be rejected (current status: ${settlement.status}). Only pending settlements can be rejected.`,
      );
    }

    // Delete settlement items to free orders for future settlements
    await this.paymentRepo.deleteSettlementItems(id);

    await this.paymentRepo.updateSettlement(id, {
      status: 'failed',
      notes: reason,
      order_count: 0,
    });

    this.logger.log(`Settlement ${id} rejected: ${reason}`);

    return { ...settlement, status: 'failed', notes: reason, order_count: 0 };
  }

  async adjustSettlement(
    id: string,
    adjustmentAmount: number,
    reason: string,
  ): Promise<VendorSettlementEntity> {
    const settlement = await this.getSettlementOrFail(id);

    if (settlement.status !== 'pending') {
      throw new BadRequestException(
        `Settlement ${id} cannot be adjusted (current status: ${settlement.status}). Only pending settlements can be adjusted.`,
      );
    }

    const netAmount = Number(settlement.net_amount);
    const withholdingTax = Number(settlement.withholding_tax);
    const newFinalAmount =
      Math.round((netAmount - withholdingTax + adjustmentAmount) * 100) / 100;

    const existingNotes = settlement.notes || '';
    const noteEntry = `[Adjustment: ${adjustmentAmount >= 0 ? '+' : ''}${adjustmentAmount}] ${reason}`;
    const updatedNotes = existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry;

    await this.paymentRepo.updateSettlement(id, {
      adjustment_amount: adjustmentAmount,
      final_amount: newFinalAmount,
      notes: updatedNotes,
    });

    this.logger.log(
      `Settlement ${id} adjusted: amount=${adjustmentAmount}, new final=${newFinalAmount}`,
    );

    return {
      ...settlement,
      adjustment_amount: adjustmentAmount,
      final_amount: newFinalAmount,
      notes: updatedNotes,
    };
  }

  async batchProcess(
    settlementIds: string[],
    referencePrefix?: string,
  ): Promise<{ processed: number; failed: number; results: Array<{ id: string; status: string; error?: string }> }> {
    const results: Array<{ id: string; status: string; error?: string }> = [];
    let processed = 0;
    let failed = 0;

    for (const id of settlementIds) {
      try {
        const reference = referencePrefix
          ? `${referencePrefix}-${id.slice(0, 8)}`
          : undefined;
        await this.processSettlement(id, reference);
        results.push({ id, status: 'completed' });
        processed++;
      } catch (error) {
        const message = (error as Error).message;
        results.push({ id, status: 'failed', error: message });
        failed++;
        this.logger.error(`Batch process failed for settlement ${id}: ${message}`);
      }
    }

    this.logger.log(`Batch process complete: ${processed} processed, ${failed} failed`);

    return { processed, failed, results };
  }

  // ── Settlement Detail ──────────────────────────────────────────────

  async getSettlementDetail(id: string, page: number = 1, limit: number = 20) {
    const settlement = await this.getSettlementOrFail(id);
    const { items, total } = await this.paymentRepo.findSettlementItems(id, page, limit);

    return {
      settlement,
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────

  private async getSettlementOrFail(id: string): Promise<VendorSettlementEntity> {
    const settlement = await this.paymentRepo.findSettlementById(id);
    if (!settlement) {
      throw new NotFoundException(`Settlement ${id} not found`);
    }
    return settlement;
  }
}
