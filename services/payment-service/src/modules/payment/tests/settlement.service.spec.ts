import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SettlementService } from '../settlement.service';
import { PaymentRepository } from '../payment.repository';
import { KafkaProducerService } from '../kafka-producer.service';

describe('SettlementService', () => {
  let service: SettlementService;
  let paymentRepo: jest.Mocked<PaymentRepository>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockVendor = {
    store_id: 'store-uuid-1',
    store_name: 'Test Store',
    commission_rate: 10,
  };

  const mockOrders = [
    { order_id: 'order-1', order_number: 'ORD-001', subtotal: 1000 },
    { order_id: 'order-2', order_number: 'ORD-002', subtotal: 2000 },
    { order_id: 'order-3', order_number: 'ORD-003', subtotal: 500 },
  ];

  const mockSettlement = {
    id: 'settlement-uuid-1',
    vendor_id: 'store-uuid-1',
    period_start: new Date('2026-02-24T00:00:00Z'),
    period_end: new Date('2026-03-02T23:59:59Z'),
    gross_amount: 3500,
    commission_amount: 350,
    net_amount: 3150,
    withholding_tax: 70,
    adjustment_amount: 0,
    final_amount: 3080,
    status: 'pending',
    payment_reference: null,
    settlement_date: null,
    notes: null,
    approved_by: null,
    order_count: 3,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        {
          provide: PaymentRepository,
          useValue: {
            getVendorsWithSettleableOrders: jest.fn(),
            getUnsettledOrdersForVendor: jest.fn(),
            findExistingSettlement: jest.fn(),
            createSettlementWithItems: jest.fn(),
            findSettlementById: jest.fn(),
            findSettlementItems: jest.fn(),
            updateSettlement: jest.fn(),
            deleteSettlementItems: jest.fn(),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
    paymentRepo = module.get(PaymentRepository);
    kafkaProducer = module.get(KafkaProducerService);
  });

  // ── Settlement Generation ──────────────────────────────────────────

  describe('generateSettlements', () => {
    const periodStart = '2026-02-24T00:00:00Z';
    const periodEnd = '2026-03-02T23:59:59Z';

    it('should generate settlements for all vendors with settleable orders', async () => {
      paymentRepo.getVendorsWithSettleableOrders.mockResolvedValue([mockVendor]);
      paymentRepo.findExistingSettlement.mockResolvedValue(null);
      paymentRepo.getUnsettledOrdersForVendor.mockResolvedValue(mockOrders);
      paymentRepo.createSettlementWithItems.mockResolvedValue(mockSettlement as any);

      const result = await service.generateSettlements(periodStart, periodEnd);

      expect(result.generated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.settlements).toHaveLength(1);
      expect(paymentRepo.getVendorsWithSettleableOrders).toHaveBeenCalledWith(periodStart, periodEnd);
    });

    it('should generate settlement for a specific vendor only', async () => {
      paymentRepo.getVendorsWithSettleableOrders.mockResolvedValue([mockVendor]);
      paymentRepo.findExistingSettlement.mockResolvedValue(null);
      paymentRepo.getUnsettledOrdersForVendor.mockResolvedValue(mockOrders);
      paymentRepo.createSettlementWithItems.mockResolvedValue(mockSettlement as any);

      const result = await service.generateSettlements(periodStart, periodEnd, 'store-uuid-1');

      expect(result.generated).toBe(1);
    });

    it('should filter out non-matching vendor when vendor_id is specified', async () => {
      paymentRepo.getVendorsWithSettleableOrders.mockResolvedValue([mockVendor]);

      const result = await service.generateSettlements(periodStart, periodEnd, 'other-vendor-id');

      expect(result.generated).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should skip vendor with no settleable orders', async () => {
      paymentRepo.getVendorsWithSettleableOrders.mockResolvedValue([]);

      const result = await service.generateSettlements(periodStart, periodEnd);

      expect(result.generated).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should skip vendor if generation fails and count it as skipped', async () => {
      paymentRepo.getVendorsWithSettleableOrders.mockResolvedValue([mockVendor]);
      paymentRepo.findExistingSettlement.mockResolvedValue(null);
      paymentRepo.getUnsettledOrdersForVendor.mockRejectedValue(new Error('DB error'));

      const result = await service.generateSettlements(periodStart, periodEnd);

      expect(result.generated).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('generateForVendor', () => {
    const periodStart = '2026-02-24T00:00:00Z';
    const periodEnd = '2026-03-02T23:59:59Z';

    it('should calculate settlement amounts correctly', async () => {
      paymentRepo.findExistingSettlement.mockResolvedValue(null);
      paymentRepo.getUnsettledOrdersForVendor.mockResolvedValue(mockOrders);
      paymentRepo.createSettlementWithItems.mockImplementation(async (data) => ({
        id: 'new-settlement-id',
        ...data,
        created_at: new Date(),
      }) as any);

      await service.generateForVendor('store-uuid-1', 10, periodStart, periodEnd);

      const callArgs = paymentRepo.createSettlementWithItems.mock.calls[0];
      const settlementData = callArgs[0];
      const items = callArgs[1];

      // gross = 1000 + 2000 + 500 = 3500
      expect(settlementData.gross_amount).toBe(3500);
      // commission = 3500 * 0.10 = 350
      expect(settlementData.commission_amount).toBe(350);
      // net = 3500 - 350 = 3150
      expect(settlementData.net_amount).toBe(3150);
      // withholding_tax = 3500 * 0.02 = 70
      expect(settlementData.withholding_tax).toBe(70);
      // final = 3150 - 70 + 0 = 3080
      expect(settlementData.final_amount).toBe(3080);
      expect(settlementData.order_count).toBe(3);
      expect(settlementData.status).toBe('pending');
      expect(items).toHaveLength(3);
    });

    it('should calculate per-order commission correctly', async () => {
      paymentRepo.findExistingSettlement.mockResolvedValue(null);
      paymentRepo.getUnsettledOrdersForVendor.mockResolvedValue([
        { order_id: 'order-1', order_number: 'ORD-001', subtotal: 1000 },
      ]);
      paymentRepo.createSettlementWithItems.mockImplementation(async (data) => ({
        id: 'new-settlement-id',
        ...data,
        created_at: new Date(),
      }) as any);

      await service.generateForVendor('store-uuid-1', 15, periodStart, periodEnd);

      const items = paymentRepo.createSettlementWithItems.mock.calls[0][1];
      // order commission = 1000 * 0.15 = 150
      expect(items[0].commission_amount).toBe(150);
      // order net = 1000 - 150 = 850
      expect(items[0].net_amount).toBe(850);
    });

    it('should return null for idempotent duplicate (same vendor+period)', async () => {
      paymentRepo.findExistingSettlement.mockResolvedValue(mockSettlement as any);

      const result = await service.generateForVendor('store-uuid-1', 10, periodStart, periodEnd);

      expect(result).toBeNull();
      expect(paymentRepo.createSettlementWithItems).not.toHaveBeenCalled();
    });

    it('should return null when vendor has no unsettled orders', async () => {
      paymentRepo.findExistingSettlement.mockResolvedValue(null);
      paymentRepo.getUnsettledOrdersForVendor.mockResolvedValue([]);

      const result = await service.generateForVendor('store-uuid-1', 10, periodStart, periodEnd);

      expect(result).toBeNull();
    });
  });

  // ── Approve Settlement ─────────────────────────────────────────────

  describe('approveSettlement', () => {
    it('should approve a pending settlement', async () => {
      paymentRepo.findSettlementById.mockResolvedValue(mockSettlement as any);
      paymentRepo.updateSettlement.mockResolvedValue(undefined);

      const result = await service.approveSettlement('settlement-uuid-1', 'admin-uuid', 'Looks good');

      expect(result.status).toBe('processing');
      expect(result.approved_by).toBe('admin-uuid');
      expect(result.notes).toBe('Looks good');
      expect(paymentRepo.updateSettlement).toHaveBeenCalledWith('settlement-uuid-1', {
        status: 'processing',
        approved_by: 'admin-uuid',
        notes: 'Looks good',
      });
    });

    it('should throw BadRequestException for non-pending settlement', async () => {
      paymentRepo.findSettlementById.mockResolvedValue({
        ...mockSettlement,
        status: 'processing',
      } as any);

      await expect(
        service.approveSettlement('settlement-uuid-1', 'admin-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing settlement', async () => {
      paymentRepo.findSettlementById.mockResolvedValue(null);

      await expect(
        service.approveSettlement('nonexistent', 'admin-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Process Settlement ─────────────────────────────────────────────

  describe('processSettlement', () => {
    it('should process a settlement in processing status', async () => {
      paymentRepo.findSettlementById.mockResolvedValue({
        ...mockSettlement,
        status: 'processing',
      } as any);
      paymentRepo.updateSettlement.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.processSettlement('settlement-uuid-1', 'BANK-REF-123', 'Paid via BPI');

      expect(result.status).toBe('completed');
      expect(result.payment_reference).toBe('BANK-REF-123');
      expect(result.settlement_date).toBeDefined();
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.settlements.events',
        'completed',
        expect.objectContaining({
          settlement_id: 'settlement-uuid-1',
          vendor_id: 'store-uuid-1',
          payment_reference: 'BANK-REF-123',
        }),
        'store-uuid-1',
      );
    });

    it('should throw BadRequestException for non-processing settlement', async () => {
      paymentRepo.findSettlementById.mockResolvedValue(mockSettlement as any); // status is 'pending'

      await expect(
        service.processSettlement('settlement-uuid-1', 'REF'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already completed settlement', async () => {
      paymentRepo.findSettlementById.mockResolvedValue({
        ...mockSettlement,
        status: 'completed',
      } as any);

      await expect(
        service.processSettlement('settlement-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Reject Settlement ──────────────────────────────────────────────

  describe('rejectSettlement', () => {
    it('should reject a pending settlement and free orders', async () => {
      paymentRepo.findSettlementById.mockResolvedValue(mockSettlement as any);
      paymentRepo.deleteSettlementItems.mockResolvedValue(undefined);
      paymentRepo.updateSettlement.mockResolvedValue(undefined);

      const result = await service.rejectSettlement('settlement-uuid-1', 'Incorrect amounts');

      expect(result.status).toBe('failed');
      expect(result.notes).toBe('Incorrect amounts');
      expect(result.order_count).toBe(0);
      expect(paymentRepo.deleteSettlementItems).toHaveBeenCalledWith('settlement-uuid-1');
    });

    it('should throw BadRequestException for non-pending settlement', async () => {
      paymentRepo.findSettlementById.mockResolvedValue({
        ...mockSettlement,
        status: 'processing',
      } as any);

      await expect(
        service.rejectSettlement('settlement-uuid-1', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Adjust Settlement ──────────────────────────────────────────────

  describe('adjustSettlement', () => {
    it('should adjust settlement and recalculate final amount (positive)', async () => {
      paymentRepo.findSettlementById.mockResolvedValue(mockSettlement as any);
      paymentRepo.updateSettlement.mockResolvedValue(undefined);

      const result = await service.adjustSettlement('settlement-uuid-1', 200, 'Delivery bonus');

      // final = net(3150) - tax(70) + adjustment(200) = 3280
      expect(result.final_amount).toBe(3280);
      expect(result.adjustment_amount).toBe(200);
      expect(result.notes).toContain('[Adjustment: +200]');
      expect(result.notes).toContain('Delivery bonus');
    });

    it('should adjust settlement with negative amount (deduction)', async () => {
      paymentRepo.findSettlementById.mockResolvedValue(mockSettlement as any);
      paymentRepo.updateSettlement.mockResolvedValue(undefined);

      const result = await service.adjustSettlement('settlement-uuid-1', -100, 'Late penalty');

      // final = net(3150) - tax(70) + adjustment(-100) = 2980
      expect(result.final_amount).toBe(2980);
      expect(result.adjustment_amount).toBe(-100);
      expect(result.notes).toContain('[Adjustment: -100]');
    });

    it('should append adjustment note to existing notes', async () => {
      paymentRepo.findSettlementById.mockResolvedValue({
        ...mockSettlement,
        notes: 'Previous note',
      } as any);
      paymentRepo.updateSettlement.mockResolvedValue(undefined);

      const result = await service.adjustSettlement('settlement-uuid-1', 50, 'Extra');

      expect(result.notes).toContain('Previous note');
      expect(result.notes).toContain('[Adjustment: +50] Extra');
    });

    it('should throw BadRequestException for non-pending settlement', async () => {
      paymentRepo.findSettlementById.mockResolvedValue({
        ...mockSettlement,
        status: 'completed',
      } as any);

      await expect(
        service.adjustSettlement('settlement-uuid-1', 100, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Batch Process ──────────────────────────────────────────────────

  describe('batchProcess', () => {
    it('should process multiple settlements', async () => {
      const processingSettlement = { ...mockSettlement, status: 'processing' };
      paymentRepo.findSettlementById.mockResolvedValue(processingSettlement as any);
      paymentRepo.updateSettlement.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.batchProcess(
        ['settlement-1', 'settlement-2'],
        'BATCH-2026-03',
      );

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('completed');
    });

    it('should report failures without stopping batch', async () => {
      const processingSettlement = { ...mockSettlement, status: 'processing' };

      // First succeeds, second fails
      paymentRepo.findSettlementById
        .mockResolvedValueOnce(processingSettlement as any)
        .mockResolvedValueOnce(mockSettlement as any); // status 'pending' → will fail processSettlement
      paymentRepo.updateSettlement.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.batchProcess(['settlement-1', 'settlement-2']);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[1].status).toBe('failed');
      expect(result.results[1].error).toBeDefined();
    });

    it('should generate references with prefix when provided', async () => {
      const processingSettlement = { ...mockSettlement, id: 'abcdefgh-1234-5678-9012-abcdefghijkl', status: 'processing' };
      paymentRepo.findSettlementById.mockResolvedValue(processingSettlement as any);
      paymentRepo.updateSettlement.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      await service.batchProcess(['abcdefgh-1234-5678-9012-abcdefghijkl'], 'BATCH-001');

      expect(paymentRepo.updateSettlement).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payment_reference: 'BATCH-001-abcdefgh',
        }),
      );
    });
  });

  // ── Settlement Detail ──────────────────────────────────────────────

  describe('getSettlementDetail', () => {
    it('should return settlement with paginated items', async () => {
      paymentRepo.findSettlementById.mockResolvedValue(mockSettlement as any);
      paymentRepo.findSettlementItems.mockResolvedValue({
        items: [
          {
            id: 'item-1',
            settlement_id: 'settlement-uuid-1',
            order_id: 'order-1',
            order_number: 'ORD-001',
            gross_amount: 1000,
            commission_amount: 100,
            net_amount: 900,
            created_at: new Date(),
            settlement: mockSettlement,
          } as any,
        ],
        total: 3,
      });

      const result = await service.getSettlementDetail('settlement-uuid-1', 1, 1);

      expect(result.settlement).toEqual(mockSettlement);
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(3);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should throw NotFoundException for missing settlement', async () => {
      paymentRepo.findSettlementById.mockResolvedValue(null);

      await expect(
        service.getSettlementDetail('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
