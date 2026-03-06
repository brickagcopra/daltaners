import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TaxService } from '../tax.service';
import { TaxRepository } from '../tax.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';

describe('TaxService', () => {
  let service: TaxService;
  let taxRepo: jest.Mocked<TaxRepository>;
  let redis: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const adminUserId = 'admin-uuid-1';

  const mockTaxConfig = {
    id: 'config-uuid-1',
    name: 'Standard VAT',
    tax_type: 'vat',
    rate: 0.12,
    applies_to: 'all',
    applies_to_value: null,
    description: 'Philippine Standard VAT at 12%',
    is_inclusive: true,
    is_active: true,
    effective_from: new Date('2026-01-01'),
    effective_until: null,
    created_by: adminUserId,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockInvoice = {
    id: 'invoice-uuid-1',
    invoice_number: 'EWT-202603-000001',
    invoice_type: 'ewt_certificate',
    vendor_id: 'vendor-uuid-1',
    vendor_name: 'Test Store',
    vendor_tin: '123-456-789-000',
    vendor_address: 'Manila, Philippines',
    settlement_id: 'settlement-uuid-1',
    order_id: null,
    period_start: new Date('2026-02-01'),
    period_end: new Date('2026-02-28'),
    gross_amount: 10000,
    vat_amount: 1200,
    ewt_amount: 200,
    net_amount: 8500,
    vat_rate: 0.12,
    ewt_rate: 0.02,
    status: 'issued',
    issued_at: new Date(),
    cancelled_at: null,
    cancellation_reason: null,
    notes: null,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
    settlement: null as any,
  };

  const mockReport = {
    id: 'report-uuid-1',
    report_number: 'TAX-MONTHLYVAT-2026-0001',
    report_type: 'monthly_vat',
    period_type: 'monthly',
    period_year: 2026,
    period_month: 2,
    period_quarter: null,
    period_start: new Date('2026-02-01'),
    period_end: new Date('2026-03-01'),
    total_gross_sales: 500000,
    total_vat_collected: 60000,
    total_ewt_withheld: 10000,
    total_commissions: 75000,
    total_refunds: 5000,
    total_net_revenue: 420000,
    total_orders: 250,
    total_vendors: 15,
    total_settlements: 12,
    breakdown_by_category: { grocery: { gross: 300000, orders: 150 } },
    breakdown_by_zone: {},
    breakdown_by_method: { gcash: { amount: 200000, count: 100 } },
    status: 'draft',
    generated_by: adminUserId,
    finalized_by: null,
    finalized_at: null,
    filed_at: null,
    notes: null,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxService,
        {
          provide: TaxRepository,
          useValue: {
            createConfig: jest.fn(),
            findConfigById: jest.fn(),
            updateConfig: jest.fn(),
            deleteConfig: jest.fn(),
            findAllConfigs: jest.fn(),
            findActiveConfigs: jest.fn(),
            createInvoice: jest.fn(),
            findInvoiceById: jest.fn(),
            findInvoiceByNumber: jest.fn(),
            updateInvoice: jest.fn(),
            findInvoicesByVendor: jest.fn(),
            findAllInvoicesAdmin: jest.fn(),
            getInvoiceStats: jest.fn(),
            getNextInvoiceNumber: jest.fn(),
            findInvoiceBySettlement: jest.fn(),
            createReport: jest.fn(),
            findReportById: jest.fn(),
            updateReport: jest.fn(),
            findExistingReport: jest.fn(),
            findAllReports: jest.fn(),
            getNextReportNumber: jest.fn(),
            getReportStats: jest.fn(),
            getOrderAggregatesForPeriod: jest.fn(),
            getSettlementAggregatesForPeriod: jest.fn(),
            getVendorTaxSummary: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            publish: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<TaxService>(TaxService);
    taxRepo = module.get(TaxRepository);
    redis = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Tax Configuration ──────────────────────────────────────────────

  describe('createTaxConfig', () => {
    it('should create a tax configuration', async () => {
      taxRepo.createConfig.mockResolvedValue(mockTaxConfig as any);

      const result = await service.createTaxConfig(
        {
          name: 'Standard VAT',
          tax_type: 'vat',
          rate: 0.12,
          applies_to: 'all',
          description: 'Philippine Standard VAT at 12%',
        },
        adminUserId,
      );

      expect(result).toEqual(mockTaxConfig);
      expect(taxRepo.createConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Standard VAT',
          tax_type: 'vat',
          rate: 0.12,
          applies_to: 'all',
          created_by: adminUserId,
        }),
      );
      expect(redis.del).toHaveBeenCalledWith('tax:active_configs');
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.tax.events',
        'config_created',
        expect.objectContaining({ config_id: mockTaxConfig.id }),
        mockTaxConfig.id,
      );
    });
  });

  describe('updateTaxConfig', () => {
    it('should update a tax configuration', async () => {
      taxRepo.findConfigById.mockResolvedValue(mockTaxConfig as any);
      taxRepo.updateConfig.mockResolvedValue(undefined);

      const result = await service.updateTaxConfig(
        mockTaxConfig.id,
        { rate: 0.15, name: 'Updated VAT' },
        adminUserId,
      );

      expect(result.rate).toBe(0.15);
      expect(result.name).toBe('Updated VAT');
      expect(taxRepo.updateConfig).toHaveBeenCalledWith(
        mockTaxConfig.id,
        expect.objectContaining({ rate: 0.15, name: 'Updated VAT' }),
      );
      expect(redis.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent config', async () => {
      taxRepo.findConfigById.mockResolvedValue(null);

      await expect(
        service.updateTaxConfig('non-existent', { rate: 0.15 }, adminUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTaxConfig', () => {
    it('should delete a tax configuration', async () => {
      taxRepo.findConfigById.mockResolvedValue(mockTaxConfig as any);
      taxRepo.deleteConfig.mockResolvedValue(undefined);

      await service.deleteTaxConfig(mockTaxConfig.id);

      expect(taxRepo.deleteConfig).toHaveBeenCalledWith(mockTaxConfig.id);
      expect(redis.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent config', async () => {
      taxRepo.findConfigById.mockResolvedValue(null);

      await expect(service.deleteTaxConfig('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listTaxConfigs', () => {
    it('should return paginated tax configs', async () => {
      taxRepo.findAllConfigs.mockResolvedValue({
        data: [mockTaxConfig as any],
        total: 1,
      });

      const result = await service.listTaxConfigs({ page: 1, limit: 20 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getActiveTaxConfigs', () => {
    it('should return active configs from database', async () => {
      taxRepo.findActiveConfigs.mockResolvedValue([mockTaxConfig as any]);

      const result = await service.getActiveTaxConfigs();

      expect(result).toHaveLength(1);
      expect(redis.set).toHaveBeenCalledWith(
        'tax:active_configs',
        expect.any(String),
        300,
      );
    });

    it('should return cached configs when available', async () => {
      redis.get.mockResolvedValue(JSON.stringify([mockTaxConfig]));

      const result = await service.getActiveTaxConfigs();

      expect(result).toHaveLength(1);
      expect(taxRepo.findActiveConfigs).not.toHaveBeenCalled();
    });
  });

  // ── Tax Invoice ────────────────────────────────────────────────────

  describe('generateInvoiceForSettlement', () => {
    it('should generate an EWT certificate for a settlement', async () => {
      taxRepo.findInvoiceBySettlement.mockResolvedValue(null);
      taxRepo.getNextInvoiceNumber.mockResolvedValue('EWT-202603-000001');
      taxRepo.createInvoice.mockResolvedValue(mockInvoice as any);

      const result = await service.generateInvoiceForSettlement(
        'settlement-uuid-1',
        'vendor-uuid-1',
        'Test Store',
        '123-456-789-000',
        'Manila, Philippines',
        10000,
        1500,
        200,
        new Date('2026-02-01'),
        new Date('2026-02-28'),
      );

      expect(result.invoice_number).toBe('EWT-202603-000001');
      expect(result.invoice_type).toBe('ewt_certificate');
      expect(taxRepo.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_type: 'ewt_certificate',
          vendor_id: 'vendor-uuid-1',
          settlement_id: 'settlement-uuid-1',
          status: 'issued',
        }),
      );
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.tax.events',
        'invoice_issued',
        expect.objectContaining({ vendor_id: 'vendor-uuid-1' }),
        'vendor-uuid-1',
      );
    });

    it('should return existing invoice if already generated for settlement', async () => {
      taxRepo.findInvoiceBySettlement.mockResolvedValue(mockInvoice as any);

      const result = await service.generateInvoiceForSettlement(
        'settlement-uuid-1',
        'vendor-uuid-1',
        'Test Store',
        null,
        null,
        10000,
        1500,
        200,
        new Date('2026-02-01'),
        new Date('2026-02-28'),
      );

      expect(result).toEqual(mockInvoice);
      expect(taxRepo.createInvoice).not.toHaveBeenCalled();
    });
  });

  describe('cancelInvoice', () => {
    it('should cancel an issued invoice', async () => {
      taxRepo.findInvoiceById.mockResolvedValue(mockInvoice as any);
      taxRepo.updateInvoice.mockResolvedValue(undefined);

      const result = await service.cancelInvoice(
        mockInvoice.id,
        'Incorrect amount',
      );

      expect(result.status).toBe('cancelled');
      expect(result.cancellation_reason).toBe('Incorrect amount');
      expect(taxRepo.updateInvoice).toHaveBeenCalledWith(
        mockInvoice.id,
        expect.objectContaining({
          status: 'cancelled',
          cancellation_reason: 'Incorrect amount',
        }),
      );
    });

    it('should throw BadRequestException for already cancelled invoice', async () => {
      const cancelledInvoice = { ...mockInvoice, status: 'cancelled' };
      taxRepo.findInvoiceById.mockResolvedValue(cancelledInvoice as any);

      await expect(
        service.cancelInvoice(cancelledInvoice.id, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent invoice', async () => {
      taxRepo.findInvoiceById.mockResolvedValue(null);

      await expect(
        service.cancelInvoice('non-existent', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('voidInvoice', () => {
    it('should void an issued invoice', async () => {
      taxRepo.findInvoiceById.mockResolvedValue(mockInvoice as any);
      taxRepo.updateInvoice.mockResolvedValue(undefined);

      const result = await service.voidInvoice(mockInvoice.id, 'Voided');

      expect(result.status).toBe('voided');
    });

    it('should throw BadRequestException for draft invoice', async () => {
      const draftInvoice = { ...mockInvoice, status: 'draft' };
      taxRepo.findInvoiceById.mockResolvedValue(draftInvoice as any);

      await expect(
        service.voidInvoice(draftInvoice.id, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getVendorInvoices', () => {
    it('should return vendor invoices with pagination', async () => {
      taxRepo.findInvoicesByVendor.mockResolvedValue({
        data: [mockInvoice as any],
        total: 1,
      });

      const result = await service.getVendorInvoices('vendor-uuid-1', {
        page: 1,
        limit: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(taxRepo.findInvoicesByVendor).toHaveBeenCalledWith(
        'vendor-uuid-1',
        expect.any(Object),
      );
    });
  });

  describe('adminListInvoices', () => {
    it('should return all invoices with filters', async () => {
      taxRepo.findAllInvoicesAdmin.mockResolvedValue({
        data: [mockInvoice as any],
        total: 1,
      });

      const result = await service.adminListInvoices({
        status: 'issued',
        page: 1,
        limit: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getInvoiceStats', () => {
    it('should return invoice statistics', async () => {
      const stats = {
        total_invoices: 50,
        total_issued: 40,
        total_draft: 5,
        total_cancelled: 5,
        total_vat: 120000,
        total_ewt: 20000,
      };
      taxRepo.getInvoiceStats.mockResolvedValue(stats);

      const result = await service.getInvoiceStats();

      expect(result).toEqual(stats);
    });
  });

  // ── Tax Report ─────────────────────────────────────────────────────

  describe('generateTaxReport', () => {
    it('should generate a monthly VAT report', async () => {
      taxRepo.findExistingReport.mockResolvedValue(null);
      taxRepo.getNextReportNumber.mockResolvedValue('TAX-MONTHLYVAT-2026-0001');
      taxRepo.getOrderAggregatesForPeriod.mockResolvedValue({
        total_gross_sales: 500000,
        total_vat: 60000,
        total_orders: 250,
        total_refunds: 5000,
        breakdown_by_category: { grocery: { gross: 300000, orders: 150 } },
        breakdown_by_method: { gcash: { amount: 200000, count: 100 } },
      });
      taxRepo.getSettlementAggregatesForPeriod.mockResolvedValue({
        total_commissions: 75000,
        total_ewt: 10000,
        total_settlements: 12,
        total_vendors: 15,
      });
      taxRepo.createReport.mockResolvedValue(mockReport as any);

      const result = await service.generateTaxReport(
        { report_type: 'monthly_vat', period_year: 2026, period_month: 2 },
        adminUserId,
      );

      expect(result.report_type).toBe('monthly_vat');
      expect(result.period_year).toBe(2026);
      expect(taxRepo.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          report_type: 'monthly_vat',
          period_type: 'monthly',
          period_year: 2026,
          period_month: 2,
          status: 'draft',
          generated_by: adminUserId,
        }),
      );
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.tax.events',
        'report_generated',
        expect.objectContaining({ report_type: 'monthly_vat' }),
        expect.any(String),
      );
    });

    it('should throw BadRequestException for monthly report without month', async () => {
      await expect(
        service.generateTaxReport(
          { report_type: 'monthly_vat', period_year: 2026 },
          adminUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for quarterly report without quarter', async () => {
      await expect(
        service.generateTaxReport(
          { report_type: 'quarterly_vat', period_year: 2026 },
          adminUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when finalized report exists', async () => {
      taxRepo.findExistingReport.mockResolvedValue({
        ...mockReport,
        status: 'finalized',
      } as any);

      await expect(
        service.generateTaxReport(
          { report_type: 'monthly_vat', period_year: 2026, period_month: 2 },
          adminUserId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should regenerate if draft report exists', async () => {
      taxRepo.findExistingReport.mockResolvedValue(mockReport as any);
      taxRepo.getOrderAggregatesForPeriod.mockResolvedValue({
        total_gross_sales: 600000,
        total_vat: 72000,
        total_orders: 300,
        total_refunds: 3000,
        breakdown_by_category: {},
        breakdown_by_method: {},
      });
      taxRepo.getSettlementAggregatesForPeriod.mockResolvedValue({
        total_commissions: 90000,
        total_ewt: 12000,
        total_settlements: 15,
        total_vendors: 18,
      });
      taxRepo.updateReport.mockResolvedValue(undefined);
      taxRepo.findReportById.mockResolvedValue({
        ...mockReport,
        total_gross_sales: 600000,
      } as any);

      const result = await service.generateTaxReport(
        { report_type: 'monthly_vat', period_year: 2026, period_month: 2 },
        adminUserId,
      );

      expect(taxRepo.updateReport).toHaveBeenCalledWith(
        mockReport.id,
        expect.objectContaining({ total_gross_sales: 600000 }),
      );
      expect(result.total_gross_sales).toBe(600000);
    });

    it('should generate a quarterly VAT report', async () => {
      taxRepo.findExistingReport.mockResolvedValue(null);
      taxRepo.getNextReportNumber.mockResolvedValue('TAX-QUARTERLYVAT-2026-0001');
      taxRepo.getOrderAggregatesForPeriod.mockResolvedValue({
        total_gross_sales: 1500000,
        total_vat: 180000,
        total_orders: 750,
        total_refunds: 15000,
        breakdown_by_category: {},
        breakdown_by_method: {},
      });
      taxRepo.getSettlementAggregatesForPeriod.mockResolvedValue({
        total_commissions: 225000,
        total_ewt: 30000,
        total_settlements: 36,
        total_vendors: 20,
      });
      taxRepo.createReport.mockResolvedValue({
        ...mockReport,
        report_type: 'quarterly_vat',
        period_type: 'quarterly',
        period_quarter: 1,
        period_month: null,
      } as any);

      const result = await service.generateTaxReport(
        { report_type: 'quarterly_vat', period_year: 2026, period_quarter: 1 },
        adminUserId,
      );

      expect(result.report_type).toBe('quarterly_vat');
    });

    it('should generate an annual income report', async () => {
      taxRepo.findExistingReport.mockResolvedValue(null);
      taxRepo.getNextReportNumber.mockResolvedValue('TAX-ANNUALINCOME-2026-0001');
      taxRepo.getOrderAggregatesForPeriod.mockResolvedValue({
        total_gross_sales: 6000000,
        total_vat: 720000,
        total_orders: 3000,
        total_refunds: 60000,
        breakdown_by_category: {},
        breakdown_by_method: {},
      });
      taxRepo.getSettlementAggregatesForPeriod.mockResolvedValue({
        total_commissions: 900000,
        total_ewt: 120000,
        total_settlements: 144,
        total_vendors: 50,
      });
      taxRepo.createReport.mockResolvedValue({
        ...mockReport,
        report_type: 'annual_income',
        period_type: 'annual',
        period_month: null,
      } as any);

      const result = await service.generateTaxReport(
        { report_type: 'annual_income', period_year: 2026 },
        adminUserId,
      );

      expect(result.report_type).toBe('annual_income');
    });
  });

  describe('finalizeTaxReport', () => {
    it('should finalize a draft report', async () => {
      taxRepo.findReportById.mockResolvedValue(mockReport as any);
      taxRepo.updateReport.mockResolvedValue(undefined);

      const result = await service.finalizeTaxReport(
        mockReport.id,
        adminUserId,
        'Reviewed and approved',
      );

      expect(result.status).toBe('finalized');
      expect(result.finalized_by).toBe(adminUserId);
      expect(result.finalized_at).toBeInstanceOf(Date);
      expect(taxRepo.updateReport).toHaveBeenCalledWith(
        mockReport.id,
        expect.objectContaining({
          status: 'finalized',
          finalized_by: adminUserId,
        }),
      );
    });

    it('should throw BadRequestException for non-draft report', async () => {
      const finalizedReport = { ...mockReport, status: 'finalized' };
      taxRepo.findReportById.mockResolvedValue(finalizedReport as any);

      await expect(
        service.finalizeTaxReport(finalizedReport.id, adminUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent report', async () => {
      taxRepo.findReportById.mockResolvedValue(null);

      await expect(
        service.finalizeTaxReport('non-existent', adminUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('fileTaxReport', () => {
    it('should file a finalized report', async () => {
      const finalizedReport = { ...mockReport, status: 'finalized' };
      taxRepo.findReportById.mockResolvedValue(finalizedReport as any);
      taxRepo.updateReport.mockResolvedValue(undefined);

      const result = await service.fileTaxReport(
        finalizedReport.id,
        adminUserId,
        'BIR-2026-02-REF-001',
        'Filed with BIR',
      );

      expect(result.status).toBe('filed');
      expect(result.filed_at).toBeInstanceOf(Date);
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.tax.events',
        'report_filed',
        expect.objectContaining({
          report_id: finalizedReport.id,
          filing_reference: 'BIR-2026-02-REF-001',
        }),
        finalizedReport.id,
      );
    });

    it('should throw BadRequestException for draft report', async () => {
      taxRepo.findReportById.mockResolvedValue(mockReport as any);

      await expect(
        service.fileTaxReport(mockReport.id, adminUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listTaxReports', () => {
    it('should return paginated reports', async () => {
      taxRepo.findAllReports.mockResolvedValue({
        data: [mockReport as any],
        total: 1,
      });

      const result = await service.listTaxReports({ page: 1, limit: 20 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by report type', async () => {
      taxRepo.findAllReports.mockResolvedValue({ data: [], total: 0 });

      await service.listTaxReports({
        report_type: 'ewt_summary',
        page: 1,
        limit: 20,
      });

      expect(taxRepo.findAllReports).toHaveBeenCalledWith(
        expect.objectContaining({ report_type: 'ewt_summary' }),
      );
    });
  });

  describe('getReportStats', () => {
    it('should return report statistics', async () => {
      const stats = {
        total_reports: 10,
        total_draft: 3,
        total_finalized: 5,
        total_filed: 2,
        total_vat_collected: 500000,
        total_ewt_withheld: 80000,
        total_gross_sales: 4000000,
      };
      taxRepo.getReportStats.mockResolvedValue(stats);

      const result = await service.getReportStats();

      expect(result).toEqual(stats);
    });
  });

  // ── Vendor Tax Summary ─────────────────────────────────────────────

  describe('getVendorTaxSummary', () => {
    it('should return vendor tax summary', async () => {
      const summary = {
        total_gross: 50000,
        total_vat: 6000,
        total_ewt: 1000,
        total_commissions: 7500,
        total_net: 42500,
        total_invoices: 5,
      };
      taxRepo.getVendorTaxSummary.mockResolvedValue(summary);

      const result = await service.getVendorTaxSummary('vendor-uuid-1');

      expect(result).toEqual(summary);
      expect(redis.set).toHaveBeenCalled();
    });

    it('should return cached summary when available', async () => {
      const summary = { total_gross: 50000 };
      redis.get.mockResolvedValue(JSON.stringify(summary));

      const result = await service.getVendorTaxSummary('vendor-uuid-1');

      expect(result).toEqual(summary);
      expect(taxRepo.getVendorTaxSummary).not.toHaveBeenCalled();
    });

    it('should support period filtering', async () => {
      const summary = {
        total_gross: 20000,
        total_vat: 2400,
        total_ewt: 400,
        total_commissions: 3000,
        total_net: 17000,
        total_invoices: 2,
      };
      taxRepo.getVendorTaxSummary.mockResolvedValue(summary);

      const result = await service.getVendorTaxSummary(
        'vendor-uuid-1',
        '2026-02-01',
        '2026-03-01',
      );

      expect(result).toEqual(summary);
      expect(taxRepo.getVendorTaxSummary).toHaveBeenCalledWith(
        'vendor-uuid-1',
        '2026-02-01',
        '2026-03-01',
      );
    });
  });
});
