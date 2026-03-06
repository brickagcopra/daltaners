import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TaxConfigurationEntity } from './entities/tax-configuration.entity';
import { TaxInvoiceEntity } from './entities/tax-invoice.entity';
import { TaxReportEntity } from './entities/tax-report.entity';

@Injectable()
export class TaxRepository {
  private readonly logger = new Logger(TaxRepository.name);

  constructor(
    @InjectRepository(TaxConfigurationEntity)
    private readonly configRepo: Repository<TaxConfigurationEntity>,
    @InjectRepository(TaxInvoiceEntity)
    private readonly invoiceRepo: Repository<TaxInvoiceEntity>,
    @InjectRepository(TaxReportEntity)
    private readonly reportRepo: Repository<TaxReportEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Tax Configuration ──────────────────────────────────────────────

  async createConfig(data: Partial<TaxConfigurationEntity>): Promise<TaxConfigurationEntity> {
    const config = this.configRepo.create(data);
    return this.configRepo.save(config);
  }

  async findConfigById(id: string): Promise<TaxConfigurationEntity | null> {
    return this.configRepo.findOne({ where: { id } });
  }

  async updateConfig(
    id: string,
    data: Partial<TaxConfigurationEntity>,
  ): Promise<void> {
    await this.configRepo.update(id, data as Record<string, unknown>);
  }

  async deleteConfig(id: string): Promise<void> {
    await this.configRepo.delete(id);
  }

  async findAllConfigs(options: {
    tax_type?: string;
    applies_to?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TaxConfigurationEntity[]; total: number }> {
    const { tax_type, applies_to, status, page = 1, limit = 20 } = options;

    const qb = this.configRepo.createQueryBuilder('tc');

    if (tax_type && tax_type !== 'all') {
      qb.andWhere('tc.tax_type = :tax_type', { tax_type });
    }

    if (applies_to && applies_to !== 'all') {
      const scope = applies_to === 'all_scope' ? 'all' : applies_to;
      qb.andWhere('tc.applies_to = :applies_to', { applies_to: scope });
    }

    if (status && status !== 'all') {
      qb.andWhere('tc.is_active = :is_active', {
        is_active: status === 'active',
      });
    }

    qb.orderBy('tc.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findActiveConfigs(): Promise<TaxConfigurationEntity[]> {
    return this.configRepo
      .createQueryBuilder('tc')
      .where('tc.is_active = TRUE')
      .andWhere('tc.effective_from <= NOW()')
      .andWhere('(tc.effective_until IS NULL OR tc.effective_until >= NOW())')
      .orderBy('tc.tax_type', 'ASC')
      .getMany();
  }

  // ── Tax Invoice ────────────────────────────────────────────────────

  async createInvoice(data: Partial<TaxInvoiceEntity>): Promise<TaxInvoiceEntity> {
    const invoice = this.invoiceRepo.create(data);
    return this.invoiceRepo.save(invoice);
  }

  async findInvoiceById(id: string): Promise<TaxInvoiceEntity | null> {
    return this.invoiceRepo.findOne({ where: { id } });
  }

  async findInvoiceByNumber(invoiceNumber: string): Promise<TaxInvoiceEntity | null> {
    return this.invoiceRepo.findOne({ where: { invoice_number: invoiceNumber } });
  }

  async updateInvoice(
    id: string,
    data: Partial<TaxInvoiceEntity>,
  ): Promise<void> {
    await this.invoiceRepo.update(id, data as Record<string, unknown>);
  }

  async findInvoicesByVendor(
    vendorId: string,
    options: {
      invoice_type?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: TaxInvoiceEntity[]; total: number }> {
    const { invoice_type, status, date_from, date_to, page = 1, limit = 20 } = options;

    const qb = this.invoiceRepo
      .createQueryBuilder('ti')
      .where('ti.vendor_id = :vendorId', { vendorId });

    if (invoice_type && invoice_type !== 'all') {
      qb.andWhere('ti.invoice_type = :invoice_type', { invoice_type });
    }

    if (status && status !== 'all') {
      qb.andWhere('ti.status = :status', { status });
    }

    if (date_from) {
      qb.andWhere('ti.created_at >= :date_from', { date_from });
    }

    if (date_to) {
      qb.andWhere('ti.created_at <= :date_to', { date_to });
    }

    qb.orderBy('ti.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findAllInvoicesAdmin(options: {
    vendor_id?: string;
    invoice_type?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TaxInvoiceEntity[]; total: number }> {
    const {
      vendor_id,
      invoice_type,
      status,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 20,
    } = options;

    const qb = this.invoiceRepo.createQueryBuilder('ti');

    if (vendor_id) {
      qb.andWhere('ti.vendor_id = :vendor_id', { vendor_id });
    }

    if (invoice_type && invoice_type !== 'all') {
      qb.andWhere('ti.invoice_type = :invoice_type', { invoice_type });
    }

    if (status && status !== 'all') {
      qb.andWhere('ti.status = :status', { status });
    }

    if (date_from) {
      qb.andWhere('ti.created_at >= :date_from', { date_from });
    }

    if (date_to) {
      qb.andWhere('ti.created_at <= :date_to', { date_to });
    }

    if (search) {
      qb.andWhere(
        '(ti.invoice_number ILIKE :search OR ti.vendor_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('ti.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getInvoiceStats(): Promise<{
    total_invoices: number;
    total_issued: number;
    total_draft: number;
    total_cancelled: number;
    total_vat: number;
    total_ewt: number;
  }> {
    const result = await this.invoiceRepo
      .createQueryBuilder('ti')
      .select([
        'COUNT(*)::int AS total_invoices',
        "COUNT(*) FILTER (WHERE ti.status = 'issued')::int AS total_issued",
        "COUNT(*) FILTER (WHERE ti.status = 'draft')::int AS total_draft",
        "COUNT(*) FILTER (WHERE ti.status IN ('cancelled', 'voided'))::int AS total_cancelled",
        'COALESCE(SUM(ti.vat_amount) FILTER (WHERE ti.status = \'issued\'), 0)::numeric AS total_vat',
        'COALESCE(SUM(ti.ewt_amount) FILTER (WHERE ti.status = \'issued\'), 0)::numeric AS total_ewt',
      ])
      .getRawOne();

    return {
      total_invoices: result.total_invoices,
      total_issued: result.total_issued,
      total_draft: result.total_draft,
      total_cancelled: result.total_cancelled,
      total_vat: Number(result.total_vat),
      total_ewt: Number(result.total_ewt),
    };
  }

  async getNextInvoiceNumber(prefix: string): Promise<string> {
    const result = await this.invoiceRepo
      .createQueryBuilder('ti')
      .select('ti.invoice_number')
      .where('ti.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('ti.invoice_number', 'DESC')
      .limit(1)
      .getRawOne();

    if (!result) {
      return `${prefix}000001`;
    }

    const lastNumber = result.ti_invoice_number;
    const numericPart = parseInt(lastNumber.replace(prefix, ''), 10);
    const nextNumber = numericPart + 1;
    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  async findInvoiceBySettlement(settlementId: string): Promise<TaxInvoiceEntity | null> {
    return this.invoiceRepo.findOne({
      where: { settlement_id: settlementId },
    });
  }

  // ── Tax Report ─────────────────────────────────────────────────────

  async createReport(data: Partial<TaxReportEntity>): Promise<TaxReportEntity> {
    const report = this.reportRepo.create(data);
    return this.reportRepo.save(report);
  }

  async findReportById(id: string): Promise<TaxReportEntity | null> {
    return this.reportRepo.findOne({ where: { id } });
  }

  async updateReport(
    id: string,
    data: Partial<TaxReportEntity>,
  ): Promise<void> {
    await this.reportRepo.update(id, data as Record<string, unknown>);
  }

  async findExistingReport(
    reportType: string,
    periodYear: number,
    periodMonth?: number,
    periodQuarter?: number,
  ): Promise<TaxReportEntity | null> {
    const qb = this.reportRepo
      .createQueryBuilder('tr')
      .where('tr.report_type = :reportType', { reportType })
      .andWhere('tr.period_year = :periodYear', { periodYear });

    if (periodMonth !== undefined && periodMonth !== null) {
      qb.andWhere('tr.period_month = :periodMonth', { periodMonth });
    }

    if (periodQuarter !== undefined && periodQuarter !== null) {
      qb.andWhere('tr.period_quarter = :periodQuarter', { periodQuarter });
    }

    return qb.getOne();
  }

  async findAllReports(options: {
    report_type?: string;
    status?: string;
    year?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TaxReportEntity[]; total: number }> {
    const { report_type, status, year, search, page = 1, limit = 20 } = options;

    const qb = this.reportRepo.createQueryBuilder('tr');

    if (report_type && report_type !== 'all') {
      qb.andWhere('tr.report_type = :report_type', { report_type });
    }

    if (status && status !== 'all') {
      qb.andWhere('tr.status = :status', { status });
    }

    if (year) {
      qb.andWhere('tr.period_year = :year', { year });
    }

    if (search) {
      qb.andWhere('tr.report_number ILIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('tr.period_year', 'DESC')
      .addOrderBy('tr.period_month', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getNextReportNumber(prefix: string): Promise<string> {
    const result = await this.reportRepo
      .createQueryBuilder('tr')
      .select('tr.report_number')
      .where('tr.report_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('tr.report_number', 'DESC')
      .limit(1)
      .getRawOne();

    if (!result) {
      return `${prefix}0001`;
    }

    const lastNumber = result.tr_report_number;
    const numericPart = parseInt(lastNumber.replace(prefix, ''), 10);
    const nextNumber = numericPart + 1;
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  async getReportStats(): Promise<{
    total_reports: number;
    total_draft: number;
    total_finalized: number;
    total_filed: number;
    total_vat_collected: number;
    total_ewt_withheld: number;
    total_gross_sales: number;
  }> {
    const result = await this.reportRepo
      .createQueryBuilder('tr')
      .select([
        'COUNT(*)::int AS total_reports',
        "COUNT(*) FILTER (WHERE tr.status = 'draft')::int AS total_draft",
        "COUNT(*) FILTER (WHERE tr.status = 'finalized')::int AS total_finalized",
        "COUNT(*) FILTER (WHERE tr.status = 'filed')::int AS total_filed",
        "COALESCE(SUM(tr.total_vat_collected) FILTER (WHERE tr.status != 'draft'), 0)::numeric AS total_vat_collected",
        "COALESCE(SUM(tr.total_ewt_withheld) FILTER (WHERE tr.status != 'draft'), 0)::numeric AS total_ewt_withheld",
        "COALESCE(SUM(tr.total_gross_sales) FILTER (WHERE tr.status != 'draft'), 0)::numeric AS total_gross_sales",
      ])
      .getRawOne();

    return {
      total_reports: result.total_reports,
      total_draft: result.total_draft,
      total_finalized: result.total_finalized,
      total_filed: result.total_filed,
      total_vat_collected: Number(result.total_vat_collected),
      total_ewt_withheld: Number(result.total_ewt_withheld),
      total_gross_sales: Number(result.total_gross_sales),
    };
  }

  // ── Aggregation Queries (for report generation) ────────────────────

  async getOrderAggregatesForPeriod(
    periodStart: string,
    periodEnd: string,
  ): Promise<{
    total_gross_sales: number;
    total_vat: number;
    total_orders: number;
    total_refunds: number;
    breakdown_by_category: Record<string, { gross: number; orders: number }>;
    breakdown_by_method: Record<string, { amount: number; count: number }>;
  }> {
    // Get order totals for the period
    const orderResult = await this.dataSource.query(
      `SELECT
        COALESCE(SUM(o.subtotal), 0)::numeric AS total_gross_sales,
        COALESCE(SUM(o.tax_amount), 0)::numeric AS total_vat,
        COUNT(*)::int AS total_orders
      FROM orders.orders o
      WHERE o.status = 'delivered'
        AND o.created_at >= $1
        AND o.created_at < $2`,
      [periodStart, periodEnd],
    );

    // Get refunds for the period
    const refundResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(t.amount), 0)::numeric AS total_refunds
      FROM payments.transactions t
      WHERE t.type = 'refund'
        AND t.status = 'completed'
        AND t.created_at >= $1
        AND t.created_at < $2`,
      [periodStart, periodEnd],
    );

    // Get breakdown by category (service_type)
    const categoryResult = await this.dataSource.query(
      `SELECT
        o.service_type,
        COALESCE(SUM(o.subtotal), 0)::numeric AS gross,
        COUNT(*)::int AS orders
      FROM orders.orders o
      WHERE o.status = 'delivered'
        AND o.created_at >= $1
        AND o.created_at < $2
      GROUP BY o.service_type`,
      [periodStart, periodEnd],
    );

    // Get breakdown by payment method
    const methodResult = await this.dataSource.query(
      `SELECT
        t.method,
        COALESCE(SUM(t.amount), 0)::numeric AS amount,
        COUNT(*)::int AS count
      FROM payments.transactions t
      WHERE t.type = 'charge'
        AND t.status = 'completed'
        AND t.created_at >= $1
        AND t.created_at < $2
      GROUP BY t.method`,
      [periodStart, periodEnd],
    );

    const breakdownByCategory: Record<string, { gross: number; orders: number }> = {};
    for (const row of categoryResult) {
      breakdownByCategory[row.service_type || 'unknown'] = {
        gross: Number(row.gross),
        orders: row.orders,
      };
    }

    const breakdownByMethod: Record<string, { amount: number; count: number }> = {};
    for (const row of methodResult) {
      breakdownByMethod[row.method || 'unknown'] = {
        amount: Number(row.amount),
        count: row.count,
      };
    }

    return {
      total_gross_sales: Number(orderResult[0]?.total_gross_sales || 0),
      total_vat: Number(orderResult[0]?.total_vat || 0),
      total_orders: orderResult[0]?.total_orders || 0,
      total_refunds: Number(refundResult[0]?.total_refunds || 0),
      breakdown_by_category: breakdownByCategory,
      breakdown_by_method: breakdownByMethod,
    };
  }

  async getSettlementAggregatesForPeriod(
    periodStart: string,
    periodEnd: string,
  ): Promise<{
    total_commissions: number;
    total_ewt: number;
    total_settlements: number;
    total_vendors: number;
  }> {
    const result = await this.dataSource.query(
      `SELECT
        COALESCE(SUM(vs.commission_amount), 0)::numeric AS total_commissions,
        COALESCE(SUM(vs.withholding_tax), 0)::numeric AS total_ewt,
        COUNT(*)::int AS total_settlements,
        COUNT(DISTINCT vs.vendor_id)::int AS total_vendors
      FROM payments.vendor_settlements vs
      WHERE vs.status IN ('completed', 'processing')
        AND vs.created_at >= $1
        AND vs.created_at < $2`,
      [periodStart, periodEnd],
    );

    return {
      total_commissions: Number(result[0]?.total_commissions || 0),
      total_ewt: Number(result[0]?.total_ewt || 0),
      total_settlements: result[0]?.total_settlements || 0,
      total_vendors: result[0]?.total_vendors || 0,
    };
  }

  async getVendorTaxSummary(
    vendorId: string,
    periodStart?: string,
    periodEnd?: string,
  ): Promise<{
    total_gross: number;
    total_vat: number;
    total_ewt: number;
    total_commissions: number;
    total_net: number;
    total_invoices: number;
  }> {
    const params: unknown[] = [vendorId];
    let dateFilter = '';

    if (periodStart && periodEnd) {
      dateFilter = 'AND ti.created_at >= $2 AND ti.created_at < $3';
      params.push(periodStart, periodEnd);
    }

    const result = await this.dataSource.query(
      `SELECT
        COALESCE(SUM(ti.gross_amount), 0)::numeric AS total_gross,
        COALESCE(SUM(ti.vat_amount), 0)::numeric AS total_vat,
        COALESCE(SUM(ti.ewt_amount), 0)::numeric AS total_ewt,
        COALESCE(SUM(ti.net_amount), 0)::numeric AS total_net,
        COUNT(*)::int AS total_invoices
      FROM payments.tax_invoices ti
      WHERE ti.vendor_id = $1
        AND ti.status = 'issued'
        ${dateFilter}`,
      params,
    );

    // Get commissions separately from settlements
    const commParams: unknown[] = [vendorId];
    let commDateFilter = '';
    if (periodStart && periodEnd) {
      commDateFilter = 'AND vs.created_at >= $2 AND vs.created_at < $3';
      commParams.push(periodStart, periodEnd);
    }

    const commResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(vs.commission_amount), 0)::numeric AS total_commissions
      FROM payments.vendor_settlements vs
      WHERE vs.vendor_id = $1
        AND vs.status IN ('completed', 'processing')
        ${commDateFilter}`,
      commParams,
    );

    return {
      total_gross: Number(result[0]?.total_gross || 0),
      total_vat: Number(result[0]?.total_vat || 0),
      total_ewt: Number(result[0]?.total_ewt || 0),
      total_commissions: Number(commResult[0]?.total_commissions || 0),
      total_net: Number(result[0]?.total_net || 0),
      total_invoices: result[0]?.total_invoices || 0,
    };
  }
}
