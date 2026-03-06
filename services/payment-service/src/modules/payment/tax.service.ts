import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { TaxRepository } from './tax.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { TaxConfigurationEntity } from './entities/tax-configuration.entity';
import { TaxInvoiceEntity } from './entities/tax-invoice.entity';
import { TaxReportEntity } from './entities/tax-report.entity';
import { CreateTaxConfigDto, UpdateTaxConfigDto } from './dto/tax-configuration.dto';
import { GenerateTaxReportDto } from './dto/tax-report.dto';

const KAFKA_TOPIC_TAX = 'daltaners.tax.events';
const CACHE_PREFIX = 'tax';
const CACHE_TTL = 300; // 5 minutes

const DEFAULT_VAT_RATE = 0.12; // 12% Philippine VAT
const DEFAULT_EWT_RATE = 0.02; // 2% Expanded Withholding Tax

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(
    private readonly taxRepo: TaxRepository,
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ── Tax Configuration Management (Admin) ──────────────────────────

  async createTaxConfig(
    dto: CreateTaxConfigDto,
    adminUserId: string,
  ): Promise<TaxConfigurationEntity> {
    const config = await this.taxRepo.createConfig({
      name: dto.name,
      tax_type: dto.tax_type,
      rate: dto.rate,
      applies_to: dto.applies_to,
      applies_to_value: dto.applies_to_value || null,
      description: dto.description || null,
      is_inclusive: dto.is_inclusive ?? true,
      effective_from: dto.effective_from ? new Date(dto.effective_from) : new Date(),
      effective_until: dto.effective_until ? new Date(dto.effective_until) : null,
      created_by: adminUserId,
    });

    await this.invalidateConfigCache();

    this.logger.log(`Tax config created: ${config.id} (${config.name})`);

    await this.kafkaProducer.publish(
      KAFKA_TOPIC_TAX,
      'config_created',
      {
        config_id: config.id,
        name: config.name,
        tax_type: config.tax_type,
        rate: Number(config.rate),
        created_by: adminUserId,
      },
      config.id,
    );

    return config;
  }

  async updateTaxConfig(
    id: string,
    dto: UpdateTaxConfigDto,
    adminUserId: string,
  ): Promise<TaxConfigurationEntity> {
    const config = await this.getConfigOrFail(id);

    const updateData: Partial<TaxConfigurationEntity> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.rate !== undefined) updateData.rate = dto.rate;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.is_inclusive !== undefined) updateData.is_inclusive = dto.is_inclusive;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
    if (dto.effective_from !== undefined) updateData.effective_from = new Date(dto.effective_from);
    if (dto.effective_until !== undefined) updateData.effective_until = new Date(dto.effective_until);

    await this.taxRepo.updateConfig(id, updateData);
    await this.invalidateConfigCache();

    this.logger.log(`Tax config updated: ${id} by admin ${adminUserId}`);

    return { ...config, ...updateData };
  }

  async deleteTaxConfig(id: string): Promise<void> {
    await this.getConfigOrFail(id);
    await this.taxRepo.deleteConfig(id);
    await this.invalidateConfigCache();
    this.logger.log(`Tax config deleted: ${id}`);
  }

  async listTaxConfigs(options: {
    tax_type?: string;
    applies_to?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { data, total } = await this.taxRepo.findAllConfigs(options);
    const page = options.page || 1;
    const limit = options.limit || 20;

    return {
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      timestamp: new Date().toISOString(),
    };
  }

  async getActiveTaxConfigs(): Promise<TaxConfigurationEntity[]> {
    const cached = await this.redis.get(`${CACHE_PREFIX}:active_configs`);
    if (cached) return JSON.parse(cached);

    const configs = await this.taxRepo.findActiveConfigs();
    await this.redis.set(`${CACHE_PREFIX}:active_configs`, JSON.stringify(configs), CACHE_TTL);
    return configs;
  }

  async getTaxConfigById(id: string): Promise<TaxConfigurationEntity> {
    return this.getConfigOrFail(id);
  }

  // ── Tax Invoice Management ────────────────────────────────────────

  async generateInvoiceForSettlement(
    settlementId: string,
    vendorId: string,
    vendorName: string,
    vendorTin: string | null,
    vendorAddress: string | null,
    grossAmount: number,
    commissionAmount: number,
    withholdingTax: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TaxInvoiceEntity> {
    // Check if invoice already exists for this settlement
    const existing = await this.taxRepo.findInvoiceBySettlement(settlementId);
    if (existing) {
      this.logger.warn(`Invoice already exists for settlement ${settlementId}: ${existing.invoice_number}`);
      return existing;
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Generate EWT certificate (BIR Form 2307 equivalent)
    const invoiceNumber = await this.taxRepo.getNextInvoiceNumber(`EWT-${yearMonth}-`);
    const netAmount = grossAmount - commissionAmount;
    const vatAmount = Math.round(grossAmount * DEFAULT_VAT_RATE * 100) / 100;
    const ewtAmount = Math.round(grossAmount * DEFAULT_EWT_RATE * 100) / 100;

    const invoice = await this.taxRepo.createInvoice({
      invoice_number: invoiceNumber,
      invoice_type: 'ewt_certificate',
      vendor_id: vendorId,
      vendor_name: vendorName,
      vendor_tin: vendorTin,
      vendor_address: vendorAddress,
      settlement_id: settlementId,
      period_start: periodStart,
      period_end: periodEnd,
      gross_amount: grossAmount,
      vat_amount: vatAmount,
      ewt_amount: ewtAmount,
      net_amount: netAmount,
      vat_rate: DEFAULT_VAT_RATE,
      ewt_rate: DEFAULT_EWT_RATE,
      status: 'issued',
      issued_at: now,
    });

    this.logger.log(
      `Tax invoice generated: ${invoiceNumber} for vendor ${vendorId} (settlement ${settlementId})`,
    );

    await this.kafkaProducer.publish(
      KAFKA_TOPIC_TAX,
      'invoice_issued',
      {
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
        vendor_id: vendorId,
        settlement_id: settlementId,
        gross_amount: grossAmount,
        ewt_amount: ewtAmount,
        vat_amount: vatAmount,
      },
      vendorId,
    );

    return invoice;
  }

  async cancelInvoice(id: string, reason?: string): Promise<TaxInvoiceEntity> {
    const invoice = await this.getInvoiceOrFail(id);

    if (invoice.status !== 'issued' && invoice.status !== 'draft') {
      throw new BadRequestException(
        `Invoice ${id} cannot be cancelled (current status: ${invoice.status})`,
      );
    }

    await this.taxRepo.updateInvoice(id, {
      status: 'cancelled',
      cancelled_at: new Date(),
      cancellation_reason: reason || null,
    });

    this.logger.log(`Invoice ${invoice.invoice_number} cancelled: ${reason || 'no reason'}`);

    return {
      ...invoice,
      status: 'cancelled',
      cancelled_at: new Date(),
      cancellation_reason: reason || null,
    };
  }

  async voidInvoice(id: string, reason?: string): Promise<TaxInvoiceEntity> {
    const invoice = await this.getInvoiceOrFail(id);

    if (invoice.status !== 'issued') {
      throw new BadRequestException(
        `Only issued invoices can be voided (current status: ${invoice.status})`,
      );
    }

    await this.taxRepo.updateInvoice(id, {
      status: 'voided',
      cancelled_at: new Date(),
      cancellation_reason: reason || null,
    });

    this.logger.log(`Invoice ${invoice.invoice_number} voided: ${reason || 'no reason'}`);

    return {
      ...invoice,
      status: 'voided',
      cancelled_at: new Date(),
      cancellation_reason: reason || null,
    };
  }

  async getVendorInvoices(
    vendorId: string,
    options: {
      invoice_type?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { data, total } = await this.taxRepo.findInvoicesByVendor(vendorId, options);
    const page = options.page || 1;
    const limit = options.limit || 20;

    return {
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      timestamp: new Date().toISOString(),
    };
  }

  async adminListInvoices(options: {
    vendor_id?: string;
    invoice_type?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { data, total } = await this.taxRepo.findAllInvoicesAdmin(options);
    const page = options.page || 1;
    const limit = options.limit || 20;

    return {
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      timestamp: new Date().toISOString(),
    };
  }

  async getInvoiceById(id: string): Promise<TaxInvoiceEntity> {
    return this.getInvoiceOrFail(id);
  }

  async getInvoiceStats() {
    return this.taxRepo.getInvoiceStats();
  }

  // ── Tax Report Management ─────────────────────────────────────────

  async generateTaxReport(
    dto: GenerateTaxReportDto,
    adminUserId: string,
  ): Promise<TaxReportEntity> {
    const { report_type, period_year, period_month, period_quarter } = dto;

    // Validate required fields
    if (
      (report_type === 'monthly_vat' || report_type === 'ewt_summary') &&
      !period_month
    ) {
      throw new BadRequestException('period_month is required for monthly reports');
    }

    if (report_type === 'quarterly_vat' && !period_quarter) {
      throw new BadRequestException('period_quarter is required for quarterly reports');
    }

    // Determine period type and dates
    let periodType: string;
    let periodStart: Date;
    let periodEnd: Date;

    if (report_type === 'monthly_vat' || report_type === 'ewt_summary') {
      periodType = 'monthly';
      periodStart = new Date(Date.UTC(period_year, (period_month as number) - 1, 1));
      periodEnd = new Date(Date.UTC(period_year, period_month as number, 1));
    } else if (report_type === 'quarterly_vat') {
      periodType = 'quarterly';
      const startMonth = ((period_quarter as number) - 1) * 3;
      periodStart = new Date(Date.UTC(period_year, startMonth, 1));
      periodEnd = new Date(Date.UTC(period_year, startMonth + 3, 1));
    } else {
      // annual_income
      periodType = 'annual';
      periodStart = new Date(Date.UTC(period_year, 0, 1));
      periodEnd = new Date(Date.UTC(period_year + 1, 0, 1));
    }

    // Check for existing report (allow regeneration by deleting draft)
    const existing = await this.taxRepo.findExistingReport(
      report_type,
      period_year,
      period_month,
      period_quarter,
    );

    if (existing && existing.status !== 'draft') {
      throw new ConflictException(
        `A ${existing.status} report already exists for this period: ${existing.report_number}. Create an amendment instead.`,
      );
    }

    // If draft exists, update it instead of creating new
    if (existing && existing.status === 'draft') {
      return this.regenerateReport(existing.id, periodStart, periodEnd, adminUserId);
    }

    // Generate report number
    const prefix = `TAX-${report_type.toUpperCase().replace('_', '')}-${period_year}-`;
    const reportNumber = await this.taxRepo.getNextReportNumber(prefix);

    // Aggregate data
    const orderAgg = await this.taxRepo.getOrderAggregatesForPeriod(
      periodStart.toISOString(),
      periodEnd.toISOString(),
    );

    const settlementAgg = await this.taxRepo.getSettlementAggregatesForPeriod(
      periodStart.toISOString(),
      periodEnd.toISOString(),
    );

    const totalNetRevenue = Math.round(
      (orderAgg.total_gross_sales - orderAgg.total_refunds - settlementAgg.total_commissions) * 100,
    ) / 100;

    const report = await this.taxRepo.createReport({
      report_number: reportNumber,
      report_type,
      period_type: periodType,
      period_year,
      period_month: period_month || null,
      period_quarter: period_quarter || null,
      period_start: periodStart,
      period_end: periodEnd,
      total_gross_sales: orderAgg.total_gross_sales,
      total_vat_collected: orderAgg.total_vat,
      total_ewt_withheld: settlementAgg.total_ewt,
      total_commissions: settlementAgg.total_commissions,
      total_refunds: orderAgg.total_refunds,
      total_net_revenue: totalNetRevenue,
      total_orders: orderAgg.total_orders,
      total_vendors: settlementAgg.total_vendors,
      total_settlements: settlementAgg.total_settlements,
      breakdown_by_category: orderAgg.breakdown_by_category,
      breakdown_by_zone: {},
      breakdown_by_method: orderAgg.breakdown_by_method,
      status: 'draft',
      generated_by: adminUserId,
    });

    this.logger.log(
      `Tax report generated: ${reportNumber} (type=${report_type}, period=${period_year}/${period_month || period_quarter || 'full'})`,
    );

    await this.kafkaProducer.publish(
      KAFKA_TOPIC_TAX,
      'report_generated',
      {
        report_id: report.id,
        report_number: reportNumber,
        report_type,
        period_year,
        period_month,
        period_quarter,
        total_gross_sales: orderAgg.total_gross_sales,
        total_vat: orderAgg.total_vat,
        total_ewt: settlementAgg.total_ewt,
        generated_by: adminUserId,
      },
      report.id,
    );

    return report;
  }

  private async regenerateReport(
    id: string,
    periodStart: Date,
    periodEnd: Date,
    adminUserId: string,
  ): Promise<TaxReportEntity> {
    const orderAgg = await this.taxRepo.getOrderAggregatesForPeriod(
      periodStart.toISOString(),
      periodEnd.toISOString(),
    );

    const settlementAgg = await this.taxRepo.getSettlementAggregatesForPeriod(
      periodStart.toISOString(),
      periodEnd.toISOString(),
    );

    const totalNetRevenue = Math.round(
      (orderAgg.total_gross_sales - orderAgg.total_refunds - settlementAgg.total_commissions) * 100,
    ) / 100;

    await this.taxRepo.updateReport(id, {
      total_gross_sales: orderAgg.total_gross_sales,
      total_vat_collected: orderAgg.total_vat,
      total_ewt_withheld: settlementAgg.total_ewt,
      total_commissions: settlementAgg.total_commissions,
      total_refunds: orderAgg.total_refunds,
      total_net_revenue: totalNetRevenue,
      total_orders: orderAgg.total_orders,
      total_vendors: settlementAgg.total_vendors,
      total_settlements: settlementAgg.total_settlements,
      breakdown_by_category: orderAgg.breakdown_by_category,
      breakdown_by_method: orderAgg.breakdown_by_method,
      generated_by: adminUserId,
    });

    const report = await this.taxRepo.findReportById(id);
    this.logger.log(`Tax report regenerated: ${report?.report_number}`);
    return report!;
  }

  async finalizeTaxReport(
    id: string,
    adminUserId: string,
    notes?: string,
  ): Promise<TaxReportEntity> {
    const report = await this.getReportOrFail(id);

    if (report.status !== 'draft') {
      throw new BadRequestException(
        `Report ${id} cannot be finalized (current status: ${report.status}). Only draft reports can be finalized.`,
      );
    }

    const now = new Date();
    await this.taxRepo.updateReport(id, {
      status: 'finalized',
      finalized_by: adminUserId,
      finalized_at: now,
      notes: notes || report.notes,
    });

    this.logger.log(`Tax report ${report.report_number} finalized by admin ${adminUserId}`);

    return {
      ...report,
      status: 'finalized',
      finalized_by: adminUserId,
      finalized_at: now,
      notes: notes || report.notes,
    };
  }

  async fileTaxReport(
    id: string,
    adminUserId: string,
    filingReference?: string,
    notes?: string,
  ): Promise<TaxReportEntity> {
    const report = await this.getReportOrFail(id);

    if (report.status !== 'finalized') {
      throw new BadRequestException(
        `Report ${id} cannot be filed (current status: ${report.status}). Only finalized reports can be filed.`,
      );
    }

    const now = new Date();
    const updatedNotes = notes
      ? (report.notes ? `${report.notes}\n${notes}` : notes)
      : report.notes;

    const metadataUpdate = {
      ...((report.metadata as Record<string, unknown>) || {}),
      filing_reference: filingReference,
      filed_by: adminUserId,
    };

    await this.taxRepo.updateReport(id, {
      status: 'filed',
      filed_at: now,
      notes: updatedNotes,
      metadata: metadataUpdate,
    });

    this.logger.log(`Tax report ${report.report_number} filed by admin ${adminUserId}`);

    await this.kafkaProducer.publish(
      KAFKA_TOPIC_TAX,
      'report_filed',
      {
        report_id: report.id,
        report_number: report.report_number,
        report_type: report.report_type,
        period_year: report.period_year,
        filing_reference: filingReference,
        filed_by: adminUserId,
      },
      report.id,
    );

    return {
      ...report,
      status: 'filed',
      filed_at: now,
      notes: updatedNotes,
      metadata: metadataUpdate,
    };
  }

  async listTaxReports(options: {
    report_type?: string;
    status?: string;
    year?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { data, total } = await this.taxRepo.findAllReports(options);
    const page = options.page || 1;
    const limit = options.limit || 20;

    return {
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      timestamp: new Date().toISOString(),
    };
  }

  async getTaxReportById(id: string): Promise<TaxReportEntity> {
    return this.getReportOrFail(id);
  }

  async getReportStats() {
    return this.taxRepo.getReportStats();
  }

  // ── Vendor Tax Summary ─────────────────────────────────────────────

  async getVendorTaxSummary(
    vendorId: string,
    periodStart?: string,
    periodEnd?: string,
  ) {
    const cacheKey = periodStart
      ? `${CACHE_PREFIX}:vendor_summary:${vendorId}:${periodStart}:${periodEnd}`
      : `${CACHE_PREFIX}:vendor_summary:${vendorId}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const summary = await this.taxRepo.getVendorTaxSummary(vendorId, periodStart, periodEnd);

    await this.redis.set(cacheKey, JSON.stringify(summary), CACHE_TTL);
    return summary;
  }

  // ── Private Helpers ────────────────────────────────────────────────

  private async getConfigOrFail(id: string): Promise<TaxConfigurationEntity> {
    const config = await this.taxRepo.findConfigById(id);
    if (!config) {
      throw new NotFoundException(`Tax configuration ${id} not found`);
    }
    return config;
  }

  private async getInvoiceOrFail(id: string): Promise<TaxInvoiceEntity> {
    const invoice = await this.taxRepo.findInvoiceById(id);
    if (!invoice) {
      throw new NotFoundException(`Tax invoice ${id} not found`);
    }
    return invoice;
  }

  private async getReportOrFail(id: string): Promise<TaxReportEntity> {
    const report = await this.taxRepo.findReportById(id);
    if (!report) {
      throw new NotFoundException(`Tax report ${id} not found`);
    }
    return report;
  }

  private async invalidateConfigCache(): Promise<void> {
    await this.redis.del(`${CACHE_PREFIX}:active_configs`);
  }
}
