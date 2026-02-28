import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { PaymentService } from '../payment.service';
import { PaymentRepository } from '../payment.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { TransactionEntity } from '../entities/transaction.entity';
import { VendorSettlementEntity } from '../entities/vendor-settlement.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { WalletTransactionEntity } from '../entities/wallet-transaction.entity';

describe('Payment Consumer Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let module: TestingModule;
  let dataSource: DataSource;
  let paymentService: PaymentService;
  let mockKafka: jest.Mocked<KafkaProducerService>;

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    getClient: jest.fn().mockReturnValue({}),
  };

  const userId = '11111111-1111-1111-1111-111111111111';
  const orderId = '22222222-2222-2222-2222-222222222222';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();

    const pgClient = new Client({ connectionString: container.getConnectionUri() });
    await pgClient.connect();
    await pgClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await pgClient.query('CREATE SCHEMA IF NOT EXISTS payments');
    await pgClient.end();

    mockKafka = {
      publish: jest.fn().mockResolvedValue(undefined),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: container.getConnectionUri(),
          entities: [TransactionEntity, VendorSettlementEntity, WalletEntity, WalletTransactionEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([TransactionEntity, VendorSettlementEntity, WalletEntity, WalletTransactionEntity]),
      ],
      providers: [
        PaymentService,
        PaymentRepository,
        { provide: RedisService, useValue: mockRedis },
        { provide: KafkaProducerService, useValue: mockKafka },
      ],
    }).compile();

    paymentService = module.get<PaymentService>(PaymentService);
    dataSource = module.get<DataSource>(DataSource);
  }, 60000);

  afterAll(async () => {
    await dataSource?.destroy();
    await module?.close();
    await container?.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
  });

  let idempotencyCounter = 0;
  const nextIdempotencyKey = () => `test-idem-key-${Date.now()}-${++idempotencyCounter}`;

  describe('handleOrderPlaced (card)', () => {
    it('should create a transaction record with status processing', async () => {
      const idemKey = nextIdempotencyKey();
      const orderData = {
        order_id: orderId,
        user_id: userId,
        total_amount: 500,
        payment_method: 'card',
        idempotency_key: idemKey,
      };

      await paymentService.handleOrderPlaced(orderData);

      const txn = await dataSource.getRepository(TransactionEntity).findOne({
        where: { idempotency_key: idemKey },
      });
      expect(txn).toBeDefined();
      expect(txn!.order_id).toBe(orderId);
      expect(txn!.user_id).toBe(userId);
      expect(txn!.type).toBe('charge');
      expect(txn!.method).toBe('card');
      expect(txn!.status).toBe('processing');
      expect(Number(txn!.amount)).toBe(500);
    });

    it('should publish payments.initiated event', async () => {
      const idemKey = nextIdempotencyKey();
      await paymentService.handleOrderPlaced({
        order_id: orderId,
        user_id: userId,
        total_amount: 300,
        payment_method: 'card',
        idempotency_key: idemKey,
      });

      expect(mockKafka.publish).toHaveBeenCalledWith(
        'daltaners.payments.events',
        'initiated',
        expect.objectContaining({
          order_id: orderId,
          method: 'card',
          status: 'processing',
        }),
        orderId,
      );
    });
  });

  describe('handleOrderPlaced (COD)', () => {
    it('should skip payment processing for COD orders', async () => {
      await paymentService.handleOrderPlaced({
        order_id: orderId,
        user_id: userId,
        total_amount: 200,
        payment_method: 'cod',
      });

      // No transaction should be created
      expect(mockKafka.publish).not.toHaveBeenCalled();
    });
  });

  describe('handleOrderPlaced (wallet)', () => {
    it('should deduct wallet balance and create completed transaction', async () => {
      const walletUserId = '33333333-3333-3333-3333-333333333333';
      const walletOrderId = '44444444-4444-4444-4444-444444444444';

      // Create and fund wallet
      const walletRepo = dataSource.getRepository(WalletEntity);
      const wallet = walletRepo.create({
        user_id: walletUserId,
        balance: 1000,
        currency: 'PHP',
        is_active: true,
      });
      await walletRepo.save(wallet);

      const idemKey = nextIdempotencyKey();
      await paymentService.handleOrderPlaced({
        order_id: walletOrderId,
        user_id: walletUserId,
        total_amount: 250,
        payment_method: 'wallet',
        idempotency_key: idemKey,
      });

      // Verify transaction created as completed
      const txn = await dataSource.getRepository(TransactionEntity).findOne({
        where: { idempotency_key: idemKey },
      });
      expect(txn).toBeDefined();
      expect(txn!.status).toBe('completed');
      expect(txn!.method).toBe('wallet');

      // Verify wallet balance was deducted
      const updatedWallet = await walletRepo.findOne({ where: { user_id: walletUserId } });
      expect(Number(updatedWallet!.balance)).toBe(750);

      // Verify wallet transaction log was created
      const walletTxns = await dataSource.getRepository(WalletTransactionEntity).find({
        where: { wallet_id: wallet.id },
      });
      expect(walletTxns.length).toBeGreaterThanOrEqual(1);
      const paymentTxn = walletTxns.find((t) => t.type === 'payment');
      expect(paymentTxn).toBeDefined();
      expect(Number(paymentTxn!.amount)).toBe(250);
    });
  });

  describe('confirmPayment', () => {
    it('should update transaction status to completed', async () => {
      const idemKey = nextIdempotencyKey();

      // Create a pending transaction first
      const txn = await dataSource.getRepository(TransactionEntity).save({
        order_id: orderId,
        user_id: userId,
        type: 'charge',
        method: 'gcash',
        status: 'processing',
        amount: 400,
        currency: 'PHP',
        idempotency_key: idemKey,
        metadata: {},
      });

      const result = await paymentService.confirmPayment({
        transaction_id: txn.id,
        gateway_transaction_id: 'gateway-123',
      });

      expect(result.status).toBe('completed');
      expect(result.completed_at).toBeDefined();

      // Verify in DB
      const dbTxn = await dataSource.getRepository(TransactionEntity).findOne({
        where: { id: txn.id },
      });
      expect(dbTxn!.status).toBe('completed');
      expect(dbTxn!.completed_at).toBeDefined();
    });

    it('should publish payments.completed event', async () => {
      const idemKey = nextIdempotencyKey();
      const txn = await dataSource.getRepository(TransactionEntity).save({
        order_id: orderId,
        user_id: userId,
        type: 'charge',
        method: 'gcash',
        status: 'processing',
        amount: 400,
        currency: 'PHP',
        idempotency_key: idemKey,
        metadata: {},
      });

      await paymentService.confirmPayment({
        transaction_id: txn.id,
      });

      expect(mockKafka.publish).toHaveBeenCalledWith(
        'daltaners.payments.events',
        'completed',
        expect.objectContaining({
          transaction_id: txn.id,
          order_id: orderId,
        }),
        orderId,
      );
    });

    it('should be idempotent — already completed returns same result', async () => {
      const idemKey = nextIdempotencyKey();
      const txn = await dataSource.getRepository(TransactionEntity).save({
        order_id: orderId,
        user_id: userId,
        type: 'charge',
        method: 'card',
        status: 'completed',
        amount: 100,
        currency: 'PHP',
        idempotency_key: idemKey,
        metadata: {},
        completed_at: new Date(),
      });

      const result = await paymentService.confirmPayment({
        transaction_id: txn.id,
      });

      expect(result.status).toBe('completed');
      expect(mockKafka.publish).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentFailure', () => {
    it('should mark transaction as failed', async () => {
      const idemKey = nextIdempotencyKey();
      const txn = await dataSource.getRepository(TransactionEntity).save({
        order_id: orderId,
        user_id: userId,
        type: 'charge',
        method: 'card',
        status: 'processing',
        amount: 500,
        currency: 'PHP',
        idempotency_key: idemKey,
        metadata: {},
      });

      const result = await paymentService.handlePaymentFailure(txn.id, 'Card declined');

      expect(result.status).toBe('failed');

      // Verify in DB
      const dbTxn = await dataSource.getRepository(TransactionEntity).findOne({
        where: { id: txn.id },
      });
      expect(dbTxn!.status).toBe('failed');
    });

    it('should publish payments.failed event', async () => {
      const idemKey = nextIdempotencyKey();
      const txn = await dataSource.getRepository(TransactionEntity).save({
        order_id: orderId,
        user_id: userId,
        type: 'charge',
        method: 'card',
        status: 'processing',
        amount: 500,
        currency: 'PHP',
        idempotency_key: idemKey,
        metadata: {},
      });

      await paymentService.handlePaymentFailure(txn.id, 'Card declined');

      expect(mockKafka.publish).toHaveBeenCalledWith(
        'daltaners.payments.events',
        'failed',
        expect.objectContaining({
          transaction_id: txn.id,
          reason: 'Card declined',
        }),
        orderId,
      );
    });

    it('should be idempotent — already failed returns same result', async () => {
      const idemKey = nextIdempotencyKey();
      const txn = await dataSource.getRepository(TransactionEntity).save({
        order_id: orderId,
        user_id: userId,
        type: 'charge',
        method: 'card',
        status: 'failed',
        amount: 500,
        currency: 'PHP',
        idempotency_key: idemKey,
        metadata: {},
      });

      const result = await paymentService.handlePaymentFailure(txn.id);

      expect(result.status).toBe('failed');
      expect(mockKafka.publish).not.toHaveBeenCalled();
    });
  });

  describe('processRefund', () => {
    it('should create refund transaction and publish event', async () => {
      const idemKey = nextIdempotencyKey();
      const original = await dataSource.getRepository(TransactionEntity).save({
        order_id: orderId,
        user_id: userId,
        type: 'charge',
        method: 'card',
        status: 'completed',
        amount: 600,
        currency: 'PHP',
        idempotency_key: idemKey,
        metadata: {},
        completed_at: new Date(),
      });

      const refund = await paymentService.processRefund(
        { transaction_id: original.id, reason: 'Customer request' },
        userId,
      );

      expect(refund.type).toBe('refund');
      expect(refund.status).toBe('completed');
      expect(Number(refund.amount)).toBe(600);

      // Verify original marked as reversed
      const dbOriginal = await dataSource.getRepository(TransactionEntity).findOne({
        where: { id: original.id },
      });
      expect(dbOriginal!.status).toBe('reversed');

      // Verify Kafka event
      expect(mockKafka.publish).toHaveBeenCalledWith(
        'daltaners.payments.events',
        'refunded',
        expect.objectContaining({
          original_transaction_id: original.id,
          refund_amount: 600,
          is_full_refund: true,
        }),
        orderId,
      );
    });

    it('should credit wallet for wallet payment refund', async () => {
      const refundUserId = '55555555-5555-5555-5555-555555555555';

      // Create wallet with remaining balance
      const walletRepo = dataSource.getRepository(WalletEntity);
      const wallet = walletRepo.create({
        user_id: refundUserId,
        balance: 500,
        currency: 'PHP',
        is_active: true,
      });
      await walletRepo.save(wallet);

      const idemKey = nextIdempotencyKey();
      const original = await dataSource.getRepository(TransactionEntity).save({
        order_id: orderId,
        user_id: refundUserId,
        type: 'charge',
        method: 'wallet',
        status: 'completed',
        amount: 200,
        currency: 'PHP',
        idempotency_key: idemKey,
        metadata: {},
        completed_at: new Date(),
      });

      await paymentService.processRefund(
        { transaction_id: original.id },
        refundUserId,
      );

      // Verify wallet balance was credited back
      const updatedWallet = await walletRepo.findOne({ where: { user_id: refundUserId } });
      expect(Number(updatedWallet!.balance)).toBe(700);

      // Verify wallet transaction log
      const walletTxns = await dataSource.getRepository(WalletTransactionEntity).find({
        where: { wallet_id: wallet.id },
      });
      const refundTxn = walletTxns.find((t) => t.type === 'refund');
      expect(refundTxn).toBeDefined();
      expect(Number(refundTxn!.amount)).toBe(200);
    });

    it('should reject refund for non-completed transaction', async () => {
      const idemKey = nextIdempotencyKey();
      const txn = await dataSource.getRepository(TransactionEntity).save({
        order_id: orderId,
        user_id: userId,
        type: 'charge',
        method: 'card',
        status: 'processing',
        amount: 300,
        currency: 'PHP',
        idempotency_key: idemKey,
        metadata: {},
      });

      await expect(
        paymentService.processRefund({ transaction_id: txn.id }, userId),
      ).rejects.toThrow('Only completed transactions can be refunded');
    });
  });

  describe('idempotency', () => {
    it('should not create duplicate transactions for same idempotency_key', async () => {
      const idemKey = nextIdempotencyKey();

      // First call creates transaction
      await paymentService.handleOrderPlaced({
        order_id: orderId,
        user_id: userId,
        total_amount: 100,
        payment_method: 'gcash',
        idempotency_key: idemKey,
      });

      // Simulate Redis returning cached value for second call
      const txn = await dataSource.getRepository(TransactionEntity).findOne({
        where: { idempotency_key: idemKey },
      });
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(txn));

      // Second call should return existing (via idempotency check)
      await paymentService.handleOrderPlaced({
        order_id: orderId,
        user_id: userId,
        total_amount: 100,
        payment_method: 'gcash',
        idempotency_key: idemKey,
      });

      // Count transactions with this key — should be exactly 1
      const count = await dataSource.getRepository(TransactionEntity).count({
        where: { idempotency_key: idemKey },
      });
      expect(count).toBe(1);
    });
  });

  describe('wallet operations', () => {
    it('should auto-create wallet on getWalletBalance', async () => {
      const newUserId = '66666666-6666-6666-6666-666666666666';

      const balance = await paymentService.getWalletBalance(newUserId);

      expect(balance.balance).toBe(0);
      expect(balance.currency).toBe('PHP');
      expect(balance.is_active).toBe(true);

      // Verify wallet in DB
      const wallet = await dataSource.getRepository(WalletEntity).findOne({
        where: { user_id: newUserId },
      });
      expect(wallet).toBeDefined();
    });

    it('should topup wallet and create wallet transaction', async () => {
      const topupUserId = '77777777-7777-7777-7777-777777777777';

      // First call auto-creates wallet
      await paymentService.getWalletBalance(topupUserId);

      const result = await paymentService.topupWallet(topupUserId, {
        amount: 500,
        description: 'Test topup',
      });

      expect(result.amount).toBe(500);
      expect(result.new_balance).toBe(500);
      expect(result.currency).toBe('PHP');

      // Second topup
      const result2 = await paymentService.topupWallet(topupUserId, {
        amount: 300,
      });
      expect(result2.new_balance).toBe(800);
    });
  });
});
