import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from '../payment.service';
import { PaymentRepository } from '../payment.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { TransactionEntity } from '../entities/transaction.entity';
import { PaymentMethod } from '../dto/create-payment.dto';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepo: jest.Mocked<PaymentRepository>;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockTransaction: Partial<TransactionEntity> = {
    id: 'txn-uuid-1',
    order_id: 'order-uuid-1',
    user_id: 'user-uuid-1',
    type: 'charge',
    method: 'gcash',
    status: 'pending',
    amount: 500,
    currency: 'PHP',
    gateway_transaction_id: null,
    gateway_response: null,
    idempotency_key: 'idem-key-1',
    metadata: {},
    created_at: new Date('2026-02-01'),
    completed_at: null,
  };

  const mockWallet = {
    id: 'wallet-uuid-1',
    user_id: 'user-uuid-1',
    balance: 5000,
    currency: 'PHP',
    is_active: true,
    daily_limit: 50000,
    monthly_limit: 500000,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockPaymentRepo = {
      createTransaction: jest.fn(),
      findTransactionById: jest.fn(),
      findTransactionByIdempotencyKey: jest.fn(),
      findTransactionsByOrderId: jest.fn(),
      findTransactionsByUserId: jest.fn(),
      findTransactionByGatewayId: jest.fn(),
      updateTransaction: jest.fn(),
      createSettlement: jest.fn(),
      findSettlementsByVendorId: jest.fn(),
      updateSettlement: jest.fn(),
      createWallet: jest.fn(),
      findWalletByUserId: jest.fn(),
      updateWalletBalance: jest.fn(),
      createWalletTransaction: jest.fn(),
      getWalletTransactions: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockKafkaProducer = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PaymentRepository, useValue: mockPaymentRepo },
        { provide: RedisService, useValue: mockRedisService },
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepo = module.get(PaymentRepository);
    redisService = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkIdempotency', () => {
    it('should return cached transaction from Redis', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockTransaction));

      const result = await service.checkIdempotency('idem-key-1');

      expect(result).toEqual(JSON.parse(JSON.stringify(mockTransaction)));
      expect(redisService.get).toHaveBeenCalledWith('idempotency:idem-key-1');
      expect(paymentRepo.findTransactionByIdempotencyKey).not.toHaveBeenCalled();
    });

    it('should check DB when not in Redis cache', async () => {
      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByIdempotencyKey.mockResolvedValue(
        mockTransaction as TransactionEntity,
      );

      const result = await service.checkIdempotency('idem-key-1');

      expect(result).toEqual(mockTransaction);
      expect(paymentRepo.findTransactionByIdempotencyKey).toHaveBeenCalledWith('idem-key-1');
      expect(redisService.set).toHaveBeenCalledWith(
        'idempotency:idem-key-1',
        JSON.stringify(mockTransaction),
        86400,
      );
    });

    it('should return null when no matching transaction exists', async () => {
      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);

      const result = await service.checkIdempotency('new-key');

      expect(result).toBeNull();
    });
  });

  describe('createPaymentIntent', () => {
    const createDto = {
      order_id: 'order-uuid-1',
      amount: 500,
      method: PaymentMethod.GCASH,
      idempotency_key: 'new-idem-key',
    };

    it('should return existing transaction for duplicate idempotency key', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockTransaction));

      const result = await service.createPaymentIntent(createDto, 'user-uuid-1');

      expect(result).toEqual(JSON.parse(JSON.stringify(mockTransaction)));
      expect(paymentRepo.createTransaction).not.toHaveBeenCalled();
    });

    it('should create COD payment as pending', async () => {
      const codDto = { ...createDto, method: PaymentMethod.COD, idempotency_key: 'cod-key' };
      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      paymentRepo.createTransaction.mockResolvedValue({
        ...mockTransaction,
        method: 'cod',
        status: 'pending',
      } as TransactionEntity);

      const result = await service.createPaymentIntent(codDto, 'user-uuid-1');

      expect(result.status).toBe('pending');
      expect(paymentRepo.updateTransaction).not.toHaveBeenCalled();
    });

    it('should create card payment and set processing status', async () => {
      const cardDto = { ...createDto, method: PaymentMethod.CARD, idempotency_key: 'card-key' };
      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      paymentRepo.createTransaction.mockResolvedValue({
        ...mockTransaction,
        method: 'card',
      } as TransactionEntity);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);

      const result = await service.createPaymentIntent(cardDto, 'user-uuid-1');

      expect(result.status).toBe('processing');
      expect(paymentRepo.updateTransaction).toHaveBeenCalledWith(
        mockTransaction.id,
        expect.objectContaining({ status: 'processing' }),
      );
    });

    it('should process wallet payment and deduct balance', async () => {
      const walletDto = { ...createDto, method: PaymentMethod.WALLET, idempotency_key: 'wallet-key' };
      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      paymentRepo.createTransaction.mockResolvedValue({
        ...mockTransaction,
        method: 'wallet',
      } as TransactionEntity);
      paymentRepo.findWalletByUserId.mockResolvedValue(mockWallet as any);
      paymentRepo.updateWalletBalance.mockResolvedValue({ ...mockWallet, balance: 4500 } as any);
      paymentRepo.createWalletTransaction.mockResolvedValue({} as any);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);

      const result = await service.createPaymentIntent(walletDto, 'user-uuid-1');

      expect(result.status).toBe('completed');
      expect(paymentRepo.updateWalletBalance).toHaveBeenCalledWith(
        mockWallet.id,
        500,
        'debit',
      );
      expect(paymentRepo.createWalletTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'payment',
          amount: 500,
        }),
      );
    });

    it('should throw BadRequestException for insufficient wallet balance', async () => {
      const walletDto = {
        ...createDto,
        method: PaymentMethod.WALLET,
        amount: 10000,
        idempotency_key: 'insufficient-key',
      };
      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      paymentRepo.createTransaction.mockResolvedValue({
        ...mockTransaction,
        method: 'wallet',
        amount: 10000,
      } as TransactionEntity);
      paymentRepo.findWalletByUserId.mockResolvedValue(mockWallet as any);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);

      await expect(
        service.createPaymentIntent(walletDto, 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPaymentIntent(walletDto, 'user-uuid-1'),
      ).rejects.toThrow('Insufficient wallet balance');
    });

    it('should throw BadRequestException when wallet not found', async () => {
      const walletDto = { ...createDto, method: PaymentMethod.WALLET, idempotency_key: 'no-wallet-key' };
      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      paymentRepo.createTransaction.mockResolvedValue({
        ...mockTransaction,
        method: 'wallet',
      } as TransactionEntity);
      paymentRepo.findWalletByUserId.mockResolvedValue(null);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);

      await expect(
        service.createPaymentIntent(walletDto, 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should publish PAYMENT_INITIATED event', async () => {
      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      paymentRepo.createTransaction.mockResolvedValue(mockTransaction as TransactionEntity);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);

      await service.createPaymentIntent(createDto, 'user-uuid-1');

      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.payments.events',
        'initiated',
        expect.objectContaining({
          transaction_id: mockTransaction.id,
          order_id: 'order-uuid-1',
        }),
        'order-uuid-1',
      );
    });
  });

  describe('confirmPayment', () => {
    it('should confirm a pending transaction', async () => {
      paymentRepo.findTransactionById.mockResolvedValue(mockTransaction as TransactionEntity);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.confirmPayment({
        transaction_id: 'txn-uuid-1',
        gateway_transaction_id: 'gw-123',
      });

      expect(result.status).toBe('completed');
      expect(paymentRepo.updateTransaction).toHaveBeenCalledWith(
        'txn-uuid-1',
        expect.objectContaining({
          status: 'completed',
          completed_at: expect.any(Date),
          gateway_transaction_id: 'gw-123',
        }),
      );
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.payments.events',
        'completed',
        expect.objectContaining({
          transaction_id: 'txn-uuid-1',
          order_id: 'order-uuid-1',
        }),
        'order-uuid-1',
      );
    });

    it('should return immediately if transaction already completed', async () => {
      const completedTxn = { ...mockTransaction, status: 'completed' };
      paymentRepo.findTransactionById.mockResolvedValue(completedTxn as TransactionEntity);

      const result = await service.confirmPayment({ transaction_id: 'txn-uuid-1' });

      expect(result).toEqual(completedTxn);
      expect(paymentRepo.updateTransaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when transaction not found', async () => {
      paymentRepo.findTransactionById.mockResolvedValue(null);

      await expect(
        service.confirmPayment({ transaction_id: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for failed transactions', async () => {
      const failedTxn = { ...mockTransaction, status: 'failed' };
      paymentRepo.findTransactionById.mockResolvedValue(failedTxn as TransactionEntity);

      await expect(
        service.confirmPayment({ transaction_id: 'txn-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handlePaymentFailure', () => {
    it('should mark transaction as failed and publish event', async () => {
      paymentRepo.findTransactionById.mockResolvedValue(mockTransaction as TransactionEntity);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.handlePaymentFailure('txn-uuid-1', 'Card declined');

      expect(result.status).toBe('failed');
      expect(paymentRepo.updateTransaction).toHaveBeenCalledWith(
        'txn-uuid-1',
        expect.objectContaining({
          status: 'failed',
          metadata: expect.objectContaining({
            failure_reason: 'Card declined',
          }),
        }),
      );
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.payments.events',
        'failed',
        expect.objectContaining({
          reason: 'Card declined',
        }),
        'order-uuid-1',
      );
    });

    it('should return immediately if already failed (idempotent)', async () => {
      const failedTxn = { ...mockTransaction, status: 'failed' };
      paymentRepo.findTransactionById.mockResolvedValue(failedTxn as TransactionEntity);

      const result = await service.handlePaymentFailure('txn-uuid-1');

      expect(result).toEqual(failedTxn);
      expect(paymentRepo.updateTransaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when transaction not found', async () => {
      paymentRepo.findTransactionById.mockResolvedValue(null);

      await expect(service.handlePaymentFailure('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('processRefund', () => {
    it('should create refund transaction for completed payment', async () => {
      const completedTxn = { ...mockTransaction, status: 'completed', amount: 500 };
      const refundTxn = { ...mockTransaction, id: 'refund-txn-1', type: 'refund' };

      paymentRepo.findTransactionById.mockResolvedValue(completedTxn as TransactionEntity);
      paymentRepo.createTransaction.mockResolvedValue(refundTxn as TransactionEntity);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.processRefund(
        { transaction_id: 'txn-uuid-1', reason: 'Item damaged' },
        'user-uuid-1',
      );

      expect(result).toEqual(refundTxn);
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.payments.events',
        'refunded',
        expect.objectContaining({
          reason: 'Item damaged',
          is_full_refund: true,
        }),
        'order-uuid-1',
      );
    });

    it('should throw BadRequestException when transaction is not completed', async () => {
      paymentRepo.findTransactionById.mockResolvedValue(mockTransaction as TransactionEntity);

      await expect(
        service.processRefund({ transaction_id: 'txn-uuid-1' }, 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when refund amount exceeds original', async () => {
      const completedTxn = { ...mockTransaction, status: 'completed', amount: 500 };
      paymentRepo.findTransactionById.mockResolvedValue(completedTxn as TransactionEntity);

      await expect(
        service.processRefund(
          { transaction_id: 'txn-uuid-1', amount: 1000 },
          'user-uuid-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      paymentRepo.findTransactionById.mockResolvedValue(null);

      await expect(
        service.processRefund({ transaction_id: 'nonexistent' }, 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWalletBalance', () => {
    it('should return existing wallet balance', async () => {
      paymentRepo.findWalletByUserId.mockResolvedValue(mockWallet as any);

      const result = await service.getWalletBalance('user-uuid-1');

      expect(result.balance).toBe(5000);
      expect(result.currency).toBe('PHP');
      expect(result.is_active).toBe(true);
    });

    it('should auto-create wallet when not found', async () => {
      paymentRepo.findWalletByUserId.mockResolvedValue(null);
      paymentRepo.createWallet.mockResolvedValue({
        ...mockWallet,
        balance: 0,
      } as any);

      const result = await service.getWalletBalance('user-uuid-1');

      expect(result.balance).toBe(0);
      expect(paymentRepo.createWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-uuid-1',
          balance: 0,
          currency: 'PHP',
        }),
      );
    });
  });

  describe('topupWallet', () => {
    it('should add funds to wallet', async () => {
      paymentRepo.findWalletByUserId.mockResolvedValue(mockWallet as any);
      paymentRepo.updateWalletBalance.mockResolvedValue({
        ...mockWallet,
        balance: 6000,
      } as any);
      paymentRepo.createWalletTransaction.mockResolvedValue({ id: 'wt-uuid-1' } as any);

      const result = await service.topupWallet('user-uuid-1', {
        amount: 1000,
        description: 'Test topup',
      });

      expect(result.amount).toBe(1000);
      expect(result.new_balance).toBe(6000);
      expect(paymentRepo.updateWalletBalance).toHaveBeenCalledWith(
        mockWallet.id,
        1000,
        'credit',
      );
    });

    it('should auto-create wallet on topup if not exists', async () => {
      paymentRepo.findWalletByUserId.mockResolvedValue(null);
      paymentRepo.createWallet.mockResolvedValue({ ...mockWallet, balance: 0 } as any);
      paymentRepo.updateWalletBalance.mockResolvedValue({
        ...mockWallet,
        balance: 1000,
      } as any);
      paymentRepo.createWalletTransaction.mockResolvedValue({ id: 'wt-uuid-1' } as any);

      const result = await service.topupWallet('user-uuid-1', { amount: 1000 });

      expect(result.new_balance).toBe(1000);
      expect(paymentRepo.createWallet).toHaveBeenCalled();
    });

    it('should throw BadRequestException when wallet is inactive', async () => {
      paymentRepo.findWalletByUserId.mockResolvedValue({
        ...mockWallet,
        is_active: false,
      } as any);

      await expect(
        service.topupWallet('user-uuid-1', { amount: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWalletTransactions', () => {
    it('should return wallet transactions with pagination', async () => {
      paymentRepo.findWalletByUserId.mockResolvedValue(mockWallet as any);
      paymentRepo.getWalletTransactions.mockResolvedValue({
        items: [{ id: 'wt-1' }],
        total: 1,
      } as any);

      const result = await service.getWalletTransactions('user-uuid-1', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty results when wallet not found', async () => {
      paymentRepo.findWalletByUserId.mockResolvedValue(null);

      const result = await service.getWalletTransactions('user-uuid-1');

      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('handleStripeWebhook', () => {
    it('should confirm payment on payment_intent.succeeded', async () => {
      const payload = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByGatewayId.mockResolvedValue(mockTransaction as TransactionEntity);
      redisService.set.mockResolvedValue(undefined);
      paymentRepo.findTransactionById.mockResolvedValue(mockTransaction as TransactionEntity);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.handleStripeWebhook(payload);

      expect(result).toEqual({ received: true });
    });

    it('should handle missing data.object gracefully', async () => {
      const payload = { type: 'payment_intent.succeeded', data: {} };

      const result = await service.handleStripeWebhook(payload);

      expect(result).toEqual({ received: true });
    });
  });

  describe('handleMayaWebhook', () => {
    it('should confirm payment on PAYMENT_SUCCESS', async () => {
      const payload = {
        status: 'PAYMENT_SUCCESS',
        id: 'maya-123',
        referenceNumber: 'ref-maya-123',
      };

      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByGatewayId.mockResolvedValue(mockTransaction as TransactionEntity);
      redisService.set.mockResolvedValue(undefined);
      paymentRepo.findTransactionById.mockResolvedValue(mockTransaction as TransactionEntity);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.handleMayaWebhook(payload);

      expect(result).toEqual({ received: true });
    });

    it('should return received true when transaction not found', async () => {
      const payload = { status: 'PAYMENT_SUCCESS', id: 'unknown' };

      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByGatewayId.mockResolvedValue(null);

      const result = await service.handleMayaWebhook(payload);

      expect(result).toEqual({ received: true });
    });
  });

  describe('handleOrderPlaced', () => {
    it('should skip payment initiation for COD orders', async () => {
      await service.handleOrderPlaced({
        order_id: 'order-uuid-1',
        user_id: 'user-uuid-1',
        total_amount: 500,
        payment_method: 'cod',
      });

      expect(paymentRepo.createTransaction).not.toHaveBeenCalled();
    });

    it('should initiate payment for non-COD orders', async () => {
      redisService.get.mockResolvedValue(null);
      paymentRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      paymentRepo.createTransaction.mockResolvedValue(mockTransaction as TransactionEntity);
      paymentRepo.updateTransaction.mockResolvedValue(undefined);
      redisService.set.mockResolvedValue(undefined);
      kafkaProducer.publish.mockResolvedValue(undefined);

      await service.handleOrderPlaced({
        order_id: 'order-uuid-1',
        user_id: 'user-uuid-1',
        total_amount: 500,
        payment_method: 'gcash',
      });

      expect(paymentRepo.createTransaction).toHaveBeenCalled();
    });
  });
});
