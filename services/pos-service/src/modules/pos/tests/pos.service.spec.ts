import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PosService } from '../pos.service';
import { PosRepository } from '../pos.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

describe('PosService', () => {
  let service: PosService;
  let repository: jest.Mocked<PosRepository>;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  const vendorUser: JwtPayload = {
    sub: 'user-1',
    role: 'vendor_owner',
    permissions: ['store:manage'],
    vendor_id: 'store-1',
    jti: 'jti-1',
  };

  const adminUser: JwtPayload = {
    sub: 'admin-1',
    role: 'admin',
    permissions: ['*'],
    vendor_id: null,
    jti: 'jti-2',
  };

  const customerUser: JwtPayload = {
    sub: 'cust-1',
    role: 'customer',
    permissions: ['order:create'],
    vendor_id: null,
    jti: 'jti-3',
  };

  const mockTerminal = {
    id: 'term-1',
    store_id: 'store-1',
    name: 'Counter 1',
    terminal_code: 'T001',
    status: 'active',
    hardware_config: null,
    last_heartbeat_at: null,
    ip_address: null,
    created_at: new Date(),
    updated_at: new Date(),
    shifts: [],
  };

  const mockShift = {
    id: 'shift-1',
    terminal_id: 'term-1',
    cashier_id: 'user-1',
    cashier_name: 'John',
    status: 'open',
    opening_cash: 5000,
    closing_cash: null,
    expected_cash: null,
    cash_difference: null,
    total_transactions: 0,
    total_sales: 0,
    total_refunds: 0,
    total_voids: 0,
    payment_totals: {},
    opened_at: new Date(),
    closed_at: null,
    close_notes: null,
    created_at: new Date(),
    updated_at: new Date(),
    terminal: mockTerminal,
    transactions: [],
    cash_movements: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosService,
        {
          provide: PosRepository,
          useValue: {
            createTerminal: jest.fn(),
            findTerminalById: jest.fn(),
            findTerminalByCode: jest.fn(),
            findTerminalsByStoreId: jest.fn(),
            updateTerminal: jest.fn(),
            deleteTerminal: jest.fn(),
            updateTerminalHeartbeat: jest.fn(),
            createShift: jest.fn(),
            findShiftById: jest.fn(),
            findOpenShiftByTerminalId: jest.fn(),
            findShiftsByTerminalId: jest.fn(),
            findShiftsByStoreId: jest.fn(),
            updateShift: jest.fn(),
            getShiftSummary: jest.fn(),
            createCashMovement: jest.fn(),
            findCashMovementsByShiftId: jest.fn(),
            createTransactionWithItems: jest.fn(),
            findTransactionById: jest.fn(),
            findTransactionByNumber: jest.fn(),
            findTransactionByIdempotencyKey: jest.fn(),
            findTransactionsByShiftId: jest.fn(),
            findTransactionsByStoreId: jest.fn(),
            updateTransaction: jest.fn(),
            transactionNumberExists: jest.fn(),
            findReceiptByTransactionId: jest.fn(),
            getSalesSummary: jest.fn(),
            getProductSales: jest.fn(),
            getHourlySales: jest.fn(),
            getCashierPerformance: jest.fn(),
            getPaymentMethodBreakdown: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getJson: jest.fn(),
            setJson: jest.fn(),
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

    service = module.get<PosService>(PosService);
    repository = module.get(PosRepository);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  // ── Terminal Tests ──

  describe('createTerminal', () => {
    it('should create a terminal successfully', async () => {
      repository.findTerminalByCode.mockResolvedValue(null);
      repository.createTerminal.mockResolvedValue(mockTerminal as any);

      const result = await service.createTerminal(
        { store_id: 'store-1', name: 'Counter 1', terminal_code: 'T001' },
        vendorUser,
      );

      expect(result).toEqual(mockTerminal);
      expect(repository.createTerminal).toHaveBeenCalled();
      expect(kafka.publish).toHaveBeenCalledWith(
        'daltaners.pos.events',
        'terminal.created',
        expect.objectContaining({ terminal_id: 'term-1' }),
      );
    });

    it('should throw ConflictException for duplicate terminal code', async () => {
      repository.findTerminalByCode.mockResolvedValue(mockTerminal as any);

      await expect(
        service.createTerminal(
          { store_id: 'store-1', name: 'Counter 2', terminal_code: 'T001' },
          vendorUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException for non-vendor/admin user', async () => {
      await expect(
        service.createTerminal(
          { store_id: 'store-1', name: 'Counter 1', terminal_code: 'T001' },
          customerUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to create terminal for any store', async () => {
      repository.findTerminalByCode.mockResolvedValue(null);
      repository.createTerminal.mockResolvedValue(mockTerminal as any);

      const result = await service.createTerminal(
        { store_id: 'store-999', name: 'Counter 1', terminal_code: 'T001' },
        adminUser,
      );

      expect(result).toEqual(mockTerminal);
    });

    it('should throw ForbiddenException for vendor accessing another store', async () => {
      await expect(
        service.createTerminal(
          { store_id: 'store-other', name: 'Counter 1', terminal_code: 'T001' },
          vendorUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTerminal', () => {
    it('should return terminal by ID', async () => {
      repository.findTerminalById.mockResolvedValue(mockTerminal as any);

      const result = await service.getTerminal('term-1');
      expect(result).toEqual(mockTerminal);
    });

    it('should throw NotFoundException when terminal not found', async () => {
      repository.findTerminalById.mockResolvedValue(null);

      await expect(service.getTerminal('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTerminal', () => {
    it('should update terminal successfully', async () => {
      repository.findTerminalById.mockResolvedValue(mockTerminal as any);
      repository.updateTerminal.mockResolvedValue({ ...mockTerminal, name: 'Updated' } as any);

      const result = await service.updateTerminal('term-1', { name: 'Updated' }, vendorUser);
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when terminal not found', async () => {
      repository.findTerminalById.mockResolvedValue(null);

      await expect(
        service.updateTerminal('nonexistent', { name: 'Updated' }, vendorUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTerminal', () => {
    it('should delete terminal successfully', async () => {
      repository.findTerminalById.mockResolvedValue(mockTerminal as any);
      repository.findOpenShiftByTerminalId.mockResolvedValue(null);

      await service.deleteTerminal('term-1', vendorUser);
      expect(repository.deleteTerminal).toHaveBeenCalledWith('term-1');
    });

    it('should throw BadRequestException when terminal has open shift', async () => {
      repository.findTerminalById.mockResolvedValue(mockTerminal as any);
      repository.findOpenShiftByTerminalId.mockResolvedValue(mockShift as any);

      await expect(service.deleteTerminal('term-1', vendorUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('heartbeat', () => {
    it('should update heartbeat successfully', async () => {
      repository.findTerminalById.mockResolvedValue(mockTerminal as any);

      await service.heartbeat('term-1', '192.168.1.1');
      expect(repository.updateTerminalHeartbeat).toHaveBeenCalledWith('term-1', '192.168.1.1');
    });

    it('should throw NotFoundException when terminal not found', async () => {
      repository.findTerminalById.mockResolvedValue(null);

      await expect(service.heartbeat('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Shift Tests ──

  describe('openShift', () => {
    it('should open a shift successfully', async () => {
      repository.findTerminalById.mockResolvedValue(mockTerminal as any);
      repository.findOpenShiftByTerminalId.mockResolvedValue(null);
      repository.createShift.mockResolvedValue(mockShift as any);

      const result = await service.openShift(
        { terminal_id: 'term-1', opening_cash: 5000 },
        vendorUser,
      );

      expect(result).toEqual(mockShift);
      expect(repository.createShift).toHaveBeenCalledWith(
        expect.objectContaining({
          terminal_id: 'term-1',
          cashier_id: 'user-1',
          opening_cash: 5000,
          status: 'open',
        }),
      );
      expect(kafka.publish).toHaveBeenCalledWith(
        'daltaners.pos.events',
        'shift.opened',
        expect.objectContaining({ shift_id: 'shift-1' }),
      );
    });

    it('should throw BadRequestException when terminal is inactive', async () => {
      repository.findTerminalById.mockResolvedValue({
        ...mockTerminal,
        status: 'inactive',
      } as any);

      await expect(
        service.openShift({ terminal_id: 'term-1', opening_cash: 5000 }, vendorUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when terminal already has open shift', async () => {
      repository.findTerminalById.mockResolvedValue(mockTerminal as any);
      repository.findOpenShiftByTerminalId.mockResolvedValue(mockShift as any);

      await expect(
        service.openShift({ terminal_id: 'term-1', opening_cash: 5000 }, vendorUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('closeShift', () => {
    it('should close a shift and calculate cash difference', async () => {
      repository.findShiftById.mockResolvedValue(mockShift as any);
      repository.getShiftSummary.mockResolvedValue({
        total_transactions: 5,
        total_sales_amount: '10000',
        total_refunds_amount: '500',
        total_voids_amount: '0',
        payment_breakdown: [
          { method: 'cash', count: 3, amount: '6000' },
          { method: 'card', count: 2, amount: '4000' },
        ],
      });
      repository.findCashMovementsByShiftId.mockResolvedValue({
        items: [
          { type: 'cash_in', amount: 1000 },
          { type: 'cash_out', amount: 500 },
        ],
        total: 2,
        page: 1,
        limit: 1000,
        totalPages: 1,
      } as any);
      repository.updateShift.mockResolvedValue({
        ...mockShift,
        status: 'closed',
        closing_cash: 11500,
      } as any);

      const result = await service.closeShift(
        'shift-1',
        { closing_cash: 11500 },
        vendorUser,
      );

      expect(result.status).toBe('closed');
      // expected: 5000 (opening) + 6000 (cash sales) + 1000 (cash_in) - 500 (cash_out) = 11500
      expect(repository.updateShift).toHaveBeenCalledWith(
        'shift-1',
        expect.objectContaining({
          status: 'closed',
          closing_cash: 11500,
          expected_cash: 11500,
          cash_difference: 0,
        }),
      );
    });

    it('should throw NotFoundException when shift not found', async () => {
      repository.findShiftById.mockResolvedValue(null);

      await expect(
        service.closeShift('nonexistent', { closing_cash: 5000 }, vendorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when shift is already closed', async () => {
      repository.findShiftById.mockResolvedValue({ ...mockShift, status: 'closed' } as any);

      await expect(
        service.closeShift('shift-1', { closing_cash: 5000 }, vendorUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getShift', () => {
    it('should return shift by ID', async () => {
      repository.findShiftById.mockResolvedValue(mockShift as any);

      const result = await service.getShift('shift-1');
      expect(result).toEqual(mockShift);
    });

    it('should throw NotFoundException when shift not found', async () => {
      repository.findShiftById.mockResolvedValue(null);

      await expect(service.getShift('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listShiftsByTerminal', () => {
    it('should return paginated shifts', async () => {
      const paginated = { items: [mockShift], total: 1, page: 1, limit: 20, totalPages: 1 };
      repository.findShiftsByTerminalId.mockResolvedValue(paginated as any);

      const result = await service.listShiftsByTerminal('term-1', 1, 20);
      expect(result.items).toHaveLength(1);
    });
  });

  // ── Cash Movement Tests ──

  describe('createCashMovement', () => {
    it('should create cash movement for open shift', async () => {
      repository.findShiftById.mockResolvedValue(mockShift as any);
      const movement = { id: 'cm-1', shift_id: 'shift-1', type: 'cash_in', amount: 1000 };
      repository.createCashMovement.mockResolvedValue(movement as any);

      const result = await service.createCashMovement(
        'shift-1',
        { type: 'cash_in', amount: 1000 },
        vendorUser,
      );

      expect(result).toEqual(movement);
      expect(kafka.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException when shift not found', async () => {
      repository.findShiftById.mockResolvedValue(null);

      await expect(
        service.createCashMovement('nonexistent', { type: 'cash_in', amount: 1000 }, vendorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when shift is closed', async () => {
      repository.findShiftById.mockResolvedValue({ ...mockShift, status: 'closed' } as any);

      await expect(
        service.createCashMovement('shift-1', { type: 'cash_in', amount: 1000 }, vendorUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Transaction Tests ──

  describe('createTransaction', () => {
    const createDto = {
      shift_id: 'shift-1',
      type: 'sale',
      payment_method: 'cash',
      items: [
        {
          product_id: 'prod-1',
          product_name: 'Test Product',
          unit_price: 100,
          quantity: 2,
        },
      ],
      amount_tendered: 250,
    };

    const mockTransaction = {
      id: 'tx-1',
      transaction_number: 'POS-20260302-000001',
      shift_id: 'shift-1',
      store_id: 'store-1',
      type: 'sale',
      status: 'completed',
      subtotal: 200,
      tax_amount: 0,
      discount_amount: 0,
      total: 200,
      payment_method: 'cash',
      amount_tendered: 250,
      change_amount: 50,
      items: [],
      receipt: null,
    };

    it('should create a sale transaction successfully', async () => {
      repository.findShiftById.mockResolvedValue(mockShift as any);
      repository.transactionNumberExists.mockResolvedValue(false);
      repository.createTransactionWithItems.mockResolvedValue(mockTransaction as any);

      const result = await service.createTransaction(createDto as any, vendorUser);

      expect(result).toEqual(mockTransaction);
      expect(repository.createTransactionWithItems).toHaveBeenCalled();
      expect(kafka.publish).toHaveBeenCalledWith(
        'daltaners.pos.events',
        'transaction.created',
        expect.objectContaining({ type: 'sale' }),
        'store-1',
      );
    });

    it('should return existing transaction for idempotent request', async () => {
      repository.findTransactionByIdempotencyKey.mockResolvedValue(mockTransaction as any);

      const result = await service.createTransaction(
        { ...createDto, idempotency_key: 'key-1' } as any,
        vendorUser,
      );

      expect(result).toEqual(mockTransaction);
      expect(repository.createTransactionWithItems).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when shift not found', async () => {
      repository.findShiftById.mockResolvedValue(null);

      await expect(
        service.createTransaction(createDto as any, vendorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when shift is closed', async () => {
      repository.findShiftById.mockResolvedValue({ ...mockShift, status: 'closed' } as any);

      await expect(
        service.createTransaction(createDto as any, vendorUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for refund without original_transaction_id', async () => {
      repository.findShiftById.mockResolvedValue(mockShift as any);

      await expect(
        service.createTransaction(
          { ...createDto, type: 'refund' } as any,
          vendorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cash tendered is less than total', async () => {
      repository.findShiftById.mockResolvedValue(mockShift as any);
      repository.transactionNumberExists.mockResolvedValue(false);

      await expect(
        service.createTransaction(
          { ...createDto, amount_tendered: 100 } as any,
          vendorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow card payment without amount_tendered check', async () => {
      repository.findShiftById.mockResolvedValue(mockShift as any);
      repository.transactionNumberExists.mockResolvedValue(false);
      repository.createTransactionWithItems.mockResolvedValue(mockTransaction as any);

      await expect(
        service.createTransaction(
          { ...createDto, payment_method: 'card', amount_tendered: 0 } as any,
          vendorUser,
        ),
      ).resolves.toBeDefined();
    });

    it('should calculate item totals correctly', async () => {
      repository.findShiftById.mockResolvedValue(mockShift as any);
      repository.transactionNumberExists.mockResolvedValue(false);
      repository.createTransactionWithItems.mockResolvedValue(mockTransaction as any);

      await service.createTransaction(
        {
          ...createDto,
          items: [
            { product_id: 'p1', product_name: 'A', unit_price: 100.50, quantity: 3, tax_amount: 10 },
            { product_id: 'p2', product_name: 'B', unit_price: 50, quantity: 1, discount_amount: 5 },
          ],
          amount_tendered: 500,
        } as any,
        vendorUser,
      );

      const call = repository.createTransactionWithItems.mock.calls[0];
      const txData = call[0];
      // subtotal = (100.50 * 3) + (50 * 1) = 301.5 + 50 = 351.5
      expect(txData.subtotal).toBe(351.5);
      // tax = 10
      expect(txData.tax_amount).toBe(10);
    });
  });

  describe('voidTransaction', () => {
    const mockTx = {
      id: 'tx-1',
      transaction_number: 'POS-20260302-000001',
      shift_id: 'shift-1',
      store_id: 'store-1',
      status: 'completed',
      total: 200,
    };

    it('should void a completed transaction', async () => {
      repository.findTransactionById.mockResolvedValue(mockTx as any);
      repository.findShiftById.mockResolvedValue(mockShift as any);
      repository.updateTransaction.mockResolvedValue({ ...mockTx, status: 'voided' } as any);

      const result = await service.voidTransaction('tx-1', 'Customer request', vendorUser);

      expect(result.status).toBe('voided');
      expect(repository.updateTransaction).toHaveBeenCalledWith('tx-1', {
        status: 'voided',
        void_reason: 'Customer request',
      });
    });

    it('should throw NotFoundException when transaction not found', async () => {
      repository.findTransactionById.mockResolvedValue(null);

      await expect(
        service.voidTransaction('nonexistent', 'reason', vendorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already voided', async () => {
      repository.findTransactionById.mockResolvedValue({ ...mockTx, status: 'voided' } as any);

      await expect(
        service.voidTransaction('tx-1', 'reason', vendorUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when shift is closed', async () => {
      repository.findTransactionById.mockResolvedValue(mockTx as any);
      repository.findShiftById.mockResolvedValue({ ...mockShift, status: 'closed' } as any);

      await expect(
        service.voidTransaction('tx-1', 'reason', vendorUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTransaction', () => {
    it('should return transaction by ID', async () => {
      const tx = { id: 'tx-1', items: [], receipt: null };
      repository.findTransactionById.mockResolvedValue(tx as any);

      const result = await service.getTransaction('tx-1');
      expect(result).toEqual(tx);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findTransactionById.mockResolvedValue(null);

      await expect(service.getTransaction('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReceipt', () => {
    it('should return receipt by transaction ID', async () => {
      const receipt = { id: 'r-1', transaction_id: 'tx-1', receipt_data: {} };
      repository.findReceiptByTransactionId.mockResolvedValue(receipt as any);

      const result = await service.getReceipt('tx-1');
      expect(result).toEqual(receipt);
    });

    it('should throw NotFoundException when receipt not found', async () => {
      repository.findReceiptByTransactionId.mockResolvedValue(null);

      await expect(service.getReceipt('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Report Tests ──

  describe('getSalesSummary', () => {
    it('should return sales summary from repository', async () => {
      const summary = { total_sales: 100, total_revenue: '50000' };
      repository.getSalesSummary.mockResolvedValue(summary);

      const result = await service.getSalesSummary('store-1', '2026-01-01', '2026-01-31');
      expect(result).toEqual(summary);
      expect(repository.getSalesSummary).toHaveBeenCalledWith('store-1', '2026-01-01', '2026-01-31');
    });
  });

  describe('getProductSales', () => {
    it('should return product sales with default limit', async () => {
      repository.getProductSales.mockResolvedValue([]);

      await service.getProductSales('store-1', '2026-01-01', '2026-01-31');
      expect(repository.getProductSales).toHaveBeenCalledWith('store-1', '2026-01-01', '2026-01-31', 20);
    });

    it('should pass custom limit', async () => {
      repository.getProductSales.mockResolvedValue([]);

      await service.getProductSales('store-1', '2026-01-01', '2026-01-31', 10);
      expect(repository.getProductSales).toHaveBeenCalledWith('store-1', '2026-01-01', '2026-01-31', 10);
    });
  });

  describe('getHourlySales', () => {
    it('should return hourly sales from repository', async () => {
      const data = [{ hour: 10, transaction_count: 5, total_revenue: '1000' }];
      repository.getHourlySales.mockResolvedValue(data);

      const result = await service.getHourlySales('store-1', '2026-01-01', '2026-01-31');
      expect(result).toEqual(data);
    });
  });

  describe('getCashierPerformance', () => {
    it('should return cashier performance from repository', async () => {
      repository.getCashierPerformance.mockResolvedValue([]);

      await service.getCashierPerformance('store-1', '2026-01-01', '2026-01-31');
      expect(repository.getCashierPerformance).toHaveBeenCalledWith('store-1', '2026-01-01', '2026-01-31');
    });
  });

  describe('getPaymentBreakdown', () => {
    it('should return payment breakdown from repository', async () => {
      const data = [{ method: 'cash', count: 50, amount: '25000' }];
      repository.getPaymentMethodBreakdown.mockResolvedValue(data);

      const result = await service.getPaymentBreakdown('store-1', '2026-01-01', '2026-01-31');
      expect(result).toEqual(data);
    });
  });

  describe('getShiftSummary', () => {
    it('should return shift summary', async () => {
      repository.findShiftById.mockResolvedValue(mockShift as any);
      const summary = { total_transactions: 10, total_sales_amount: '5000' };
      repository.getShiftSummary.mockResolvedValue(summary);

      const result = await service.getShiftSummary('shift-1');
      expect(result).toEqual(summary);
    });

    it('should throw NotFoundException when shift not found', async () => {
      repository.findShiftById.mockResolvedValue(null);

      await expect(service.getShiftSummary('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
