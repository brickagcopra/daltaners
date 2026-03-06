import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PaymentRepository } from './payment.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { CreatePaymentDto, PaymentMethod } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundDto } from './dto/refund.dto';
import { SettlementQueryDto } from './dto/settlement-query.dto';
import { WalletTopupDto } from './dto/wallet-topup.dto';
import {
  AdminTransactionQueryDto,
  AdminSettlementQueryDto,
  AdminWalletQueryDto,
} from './dto/admin-transaction-query.dto';
import { TransactionEntity } from './entities/transaction.entity';

const KAFKA_TOPIC_PAYMENTS = 'daltaners.payments.events';
const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ── Idempotency ──────────────────────────────────────────────────────

  async checkIdempotency(key: string): Promise<TransactionEntity | null> {
    const cached = await this.redisService.get(`idempotency:${key}`);
    if (cached) {
      return JSON.parse(cached) as TransactionEntity;
    }

    const existing = await this.paymentRepo.findTransactionByIdempotencyKey(key);
    if (existing) {
      await this.redisService.set(
        `idempotency:${key}`,
        JSON.stringify(existing),
        IDEMPOTENCY_TTL_SECONDS,
      );
      return existing;
    }

    return null;
  }

  // ── Payment Intent ───────────────────────────────────────────────────

  async createPaymentIntent(dto: CreatePaymentDto, userId: string) {
    // Check idempotency first
    const existing = await this.checkIdempotency(dto.idempotency_key);
    if (existing) {
      this.logger.log(`Idempotent return for key: ${dto.idempotency_key}`);
      return existing;
    }

    // Create the transaction record
    const transaction = await this.paymentRepo.createTransaction({
      order_id: dto.order_id,
      user_id: userId,
      type: 'charge',
      method: dto.method,
      status: 'pending',
      amount: dto.amount,
      currency: 'PHP',
      idempotency_key: dto.idempotency_key,
      metadata: {},
      gateway_transaction_id: null,
      gateway_response: null,
      completed_at: null,
    });

    // Cache in Redis for idempotency
    await this.redisService.set(
      `idempotency:${dto.idempotency_key}`,
      JSON.stringify(transaction),
      IDEMPOTENCY_TTL_SECONDS,
    );

    // Method-specific handling
    let gatewayResponse: Record<string, unknown> | null = null;

    if (dto.method === PaymentMethod.COD) {
      // COD stays as 'pending' -- confirmed on delivery
      this.logger.log(`COD payment created: ${transaction.id} for order ${dto.order_id}`);
    } else if (dto.method === PaymentMethod.CARD) {
      // Stub: In production, create Stripe PaymentIntent
      gatewayResponse = {
        provider: 'stripe',
        client_secret: `pi_stub_${uuidv4()}_secret`,
        payment_intent_id: `pi_stub_${uuidv4()}`,
        status: 'requires_payment_method',
      };

      await this.paymentRepo.updateTransaction(transaction.id, {
        status: 'processing',
        gateway_response: gatewayResponse,
        gateway_transaction_id: gatewayResponse.payment_intent_id as string,
      });

      transaction.status = 'processing';
      transaction.gateway_response = gatewayResponse;
      transaction.gateway_transaction_id = gatewayResponse.payment_intent_id as string;

      this.logger.log(`Stripe payment intent created: ${transaction.id} for order ${dto.order_id}`);
    } else if (dto.method === PaymentMethod.GCASH) {
      // Stub: In production, create GCash payment via PayMongo or direct integration
      gatewayResponse = {
        provider: 'gcash',
        checkout_url: `https://gcash.stub/checkout/${uuidv4()}`,
        source_id: `src_gcash_stub_${uuidv4()}`,
        status: 'awaiting_payment',
      };

      await this.paymentRepo.updateTransaction(transaction.id, {
        status: 'processing',
        gateway_response: gatewayResponse,
        gateway_transaction_id: gatewayResponse.source_id as string,
      });

      transaction.status = 'processing';
      transaction.gateway_response = gatewayResponse;
      transaction.gateway_transaction_id = gatewayResponse.source_id as string;

      this.logger.log(`GCash payment intent created: ${transaction.id} for order ${dto.order_id}`);
    } else if (dto.method === PaymentMethod.WALLET) {
      // Wallet payment: validate balance and deduct atomically
      const wallet = await this.paymentRepo.findWalletByUserId(userId);
      if (!wallet || !wallet.is_active) {
        await this.paymentRepo.updateTransaction(transaction.id, { status: 'failed' });
        throw new BadRequestException('Wallet not found or inactive');
      }

      if (Number(wallet.balance) < dto.amount) {
        await this.paymentRepo.updateTransaction(transaction.id, { status: 'failed' });
        throw new BadRequestException('Insufficient wallet balance');
      }

      // Deduct balance atomically
      const updatedWallet = await this.paymentRepo.updateWalletBalance(
        wallet.id,
        dto.amount,
        'debit',
      );

      // Create wallet transaction log
      await this.paymentRepo.createWalletTransaction({
        wallet_id: wallet.id,
        type: 'payment',
        amount: dto.amount,
        balance_after: updatedWallet.balance,
        reference_type: 'order',
        reference_id: dto.order_id,
        description: `Payment for order ${dto.order_id}`,
        status: 'completed',
      });

      // Mark as completed immediately (no gateway needed)
      const now = new Date();
      await this.paymentRepo.updateTransaction(transaction.id, {
        status: 'completed',
        completed_at: now,
        gateway_response: { provider: 'wallet', wallet_id: wallet.id },
        gateway_transaction_id: `wallet_${wallet.id}_${Date.now()}`,
      });

      transaction.status = 'completed';
      transaction.completed_at = now;
      transaction.gateway_response = { provider: 'wallet', wallet_id: wallet.id };

      this.logger.log(`Wallet payment completed: ${transaction.id} for order ${dto.order_id}`);
    } else {
      // Other methods (maya, grabpay, bank_transfer) -- stub as processing
      gatewayResponse = {
        provider: dto.method,
        status: 'awaiting_payment',
        reference: `ref_${dto.method}_${uuidv4()}`,
      };

      await this.paymentRepo.updateTransaction(transaction.id, {
        status: 'processing',
        gateway_response: gatewayResponse,
        gateway_transaction_id: gatewayResponse.reference as string,
      });

      transaction.status = 'processing';
      transaction.gateway_response = gatewayResponse;
      transaction.gateway_transaction_id = gatewayResponse.reference as string;

      this.logger.log(`${dto.method} payment intent created: ${transaction.id} for order ${dto.order_id}`);
    }

    // Update idempotency cache with latest state
    await this.redisService.set(
      `idempotency:${dto.idempotency_key}`,
      JSON.stringify(transaction),
      IDEMPOTENCY_TTL_SECONDS,
    );

    // Publish payment initiated event
    await this.kafkaProducer.publish(
      KAFKA_TOPIC_PAYMENTS,
      'initiated',
      {
        transaction_id: transaction.id,
        order_id: transaction.order_id,
        user_id: transaction.user_id,
        method: transaction.method,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        idempotency_key: transaction.idempotency_key,
      },
      transaction.order_id,
    );

    return transaction;
  }

  // ── Confirm Payment ──────────────────────────────────────────────────

  async confirmPayment(dto: ConfirmPaymentDto) {
    const transaction = await this.paymentRepo.findTransactionById(dto.transaction_id);
    if (!transaction) {
      throw new NotFoundException(`Transaction ${dto.transaction_id} not found`);
    }

    if (transaction.status === 'completed') {
      this.logger.warn(`Transaction ${dto.transaction_id} already completed`);
      return transaction;
    }

    if (transaction.status !== 'pending' && transaction.status !== 'processing') {
      throw new BadRequestException(
        `Transaction ${dto.transaction_id} cannot be confirmed (status: ${transaction.status})`,
      );
    }

    const now = new Date();

    const updateData: Partial<TransactionEntity> = {
      status: 'completed',
      completed_at: now,
    };

    if (dto.gateway_transaction_id) {
      updateData.gateway_transaction_id = dto.gateway_transaction_id;
    }

    await this.paymentRepo.updateTransaction(transaction.id, updateData);

    // Invalidate idempotency cache so next read gets fresh data
    await this.redisService.del(`idempotency:${transaction.idempotency_key}`);

    // Publish payment completed event
    await this.kafkaProducer.publish(
      KAFKA_TOPIC_PAYMENTS,
      'completed',
      {
        transaction_id: transaction.id,
        order_id: transaction.order_id,
        user_id: transaction.user_id,
        method: transaction.method,
        amount: transaction.amount,
        currency: transaction.currency,
        gateway_transaction_id: dto.gateway_transaction_id || transaction.gateway_transaction_id,
        completed_at: now.toISOString(),
      },
      transaction.order_id,
    );

    this.logger.log(`Payment confirmed: ${transaction.id} for order ${transaction.order_id}`);

    return {
      ...transaction,
      status: 'completed',
      completed_at: now,
      gateway_transaction_id: dto.gateway_transaction_id || transaction.gateway_transaction_id,
    };
  }

  // ── Payment Failure ──────────────────────────────────────────────────

  async handlePaymentFailure(transactionId: string, reason?: string) {
    const transaction = await this.paymentRepo.findTransactionById(transactionId);
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    if (transaction.status === 'failed') {
      this.logger.warn(`Transaction ${transactionId} already marked as failed`);
      return transaction;
    }

    await this.paymentRepo.updateTransaction(transaction.id, {
      status: 'failed',
      metadata: {
        ...transaction.metadata,
        failure_reason: reason || 'Payment failed',
        failed_at: new Date().toISOString(),
      },
    });

    // Invalidate idempotency cache
    await this.redisService.del(`idempotency:${transaction.idempotency_key}`);

    // Publish payment failed event
    await this.kafkaProducer.publish(
      KAFKA_TOPIC_PAYMENTS,
      'failed',
      {
        transaction_id: transaction.id,
        order_id: transaction.order_id,
        user_id: transaction.user_id,
        method: transaction.method,
        amount: transaction.amount,
        currency: transaction.currency,
        reason: reason || 'Payment failed',
      },
      transaction.order_id,
    );

    this.logger.log(`Payment failed: ${transaction.id} for order ${transaction.order_id} - ${reason}`);

    return { ...transaction, status: 'failed' };
  }

  // ── Refund ───────────────────────────────────────────────────────────

  async processRefund(dto: RefundDto, userId: string) {
    const originalTransaction = await this.paymentRepo.findTransactionById(dto.transaction_id);
    if (!originalTransaction) {
      throw new NotFoundException(`Transaction ${dto.transaction_id} not found`);
    }

    if (originalTransaction.status !== 'completed') {
      throw new BadRequestException(
        `Cannot refund transaction ${dto.transaction_id} (status: ${originalTransaction.status}). Only completed transactions can be refunded.`,
      );
    }

    const refundAmount = dto.amount || Number(originalTransaction.amount);

    if (refundAmount > Number(originalTransaction.amount)) {
      throw new BadRequestException(
        `Refund amount (${refundAmount}) exceeds original transaction amount (${originalTransaction.amount})`,
      );
    }

    // Create refund transaction
    const refundIdempotencyKey = `refund_${dto.transaction_id}_${refundAmount}_${Date.now()}`;
    const refundTransaction = await this.paymentRepo.createTransaction({
      order_id: originalTransaction.order_id,
      user_id: userId,
      type: 'refund',
      method: originalTransaction.method,
      status: 'completed',
      amount: refundAmount,
      currency: originalTransaction.currency,
      idempotency_key: refundIdempotencyKey,
      metadata: {
        original_transaction_id: originalTransaction.id,
        reason: dto.reason || 'Refund requested',
      },
      gateway_transaction_id: null,
      gateway_response: null,
      completed_at: new Date(),
    });

    // If original method was wallet, credit back to wallet
    if (originalTransaction.method === PaymentMethod.WALLET) {
      const wallet = await this.paymentRepo.findWalletByUserId(originalTransaction.user_id);
      if (wallet) {
        const updatedWallet = await this.paymentRepo.updateWalletBalance(
          wallet.id,
          refundAmount,
          'credit',
        );

        await this.paymentRepo.createWalletTransaction({
          wallet_id: wallet.id,
          type: 'refund',
          amount: refundAmount,
          balance_after: updatedWallet.balance,
          reference_type: 'order',
          reference_id: originalTransaction.order_id,
          description: `Refund for order ${originalTransaction.order_id}`,
          status: 'completed',
        });
      }
    }

    // Mark original as reversed if full refund
    if (refundAmount === Number(originalTransaction.amount)) {
      await this.paymentRepo.updateTransaction(originalTransaction.id, {
        status: 'reversed',
        metadata: {
          ...originalTransaction.metadata,
          refund_transaction_id: refundTransaction.id,
          reversed_at: new Date().toISOString(),
        },
      });
    }

    // Publish payment refunded event
    await this.kafkaProducer.publish(
      KAFKA_TOPIC_PAYMENTS,
      'refunded',
      {
        refund_transaction_id: refundTransaction.id,
        original_transaction_id: originalTransaction.id,
        order_id: originalTransaction.order_id,
        user_id: userId,
        refund_amount: refundAmount,
        original_amount: originalTransaction.amount,
        currency: originalTransaction.currency,
        reason: dto.reason || 'Refund requested',
        is_full_refund: refundAmount === Number(originalTransaction.amount),
      },
      originalTransaction.order_id,
    );

    this.logger.log(
      `Refund processed: ${refundTransaction.id} (${refundAmount} ${originalTransaction.currency}) for original txn ${originalTransaction.id}`,
    );

    return refundTransaction;
  }

  // ── Query Methods ────────────────────────────────────────────────────

  async getTransactionsByOrder(orderId: string, page: number = 1, limit: number = 20) {
    const { items, total } = await this.paymentRepo.findTransactionsByOrderId(orderId, page, limit);
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionsByUser(userId: string, page: number = 1, limit: number = 20) {
    const { items, total } = await this.paymentRepo.findTransactionsByUserId(userId, page, limit);
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSettlements(query: SettlementQueryDto, vendorId: string) {
    // Use vendorId from JWT unless admin provides a different one
    const effectiveVendorId = query.vendor_id || vendorId;

    const { items, total } = await this.paymentRepo.findSettlementsByVendorId(effectiveVendorId, {
      status: query.status,
      periodStart: query.period_start,
      periodEnd: query.period_end,
      page: query.page,
      limit: query.limit,
    });

    return {
      items,
      meta: {
        page: query.page || 1,
        limit: query.limit || 20,
        total,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  // ── Vendor Settlement Summary ──────────────────────────────────────

  async getVendorSettlementSummary(vendorId: string) {
    const summary = await this.paymentRepo.getVendorSettlementSummary(vendorId);
    return {
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Wallet Methods ──────────────────────────────────────────────────

  async getWalletBalance(userId: string) {
    let wallet = await this.paymentRepo.findWalletByUserId(userId);
    if (!wallet) {
      // Auto-create wallet for user
      wallet = await this.paymentRepo.createWallet({
        user_id: userId,
        balance: 0,
        currency: 'PHP',
        is_active: true,
      });
    }

    return {
      id: wallet.id,
      balance: Number(wallet.balance),
      currency: wallet.currency,
      is_active: wallet.is_active,
      daily_limit: Number(wallet.daily_limit),
      monthly_limit: Number(wallet.monthly_limit),
    };
  }

  async topupWallet(userId: string, dto: WalletTopupDto) {
    let wallet = await this.paymentRepo.findWalletByUserId(userId);
    if (!wallet) {
      wallet = await this.paymentRepo.createWallet({
        user_id: userId,
        balance: 0,
        currency: 'PHP',
        is_active: true,
      });
    }

    if (!wallet.is_active) {
      throw new BadRequestException('Wallet is inactive');
    }

    // Create a pending topup transaction (in production, this would go through a payment gateway)
    const updatedWallet = await this.paymentRepo.updateWalletBalance(
      wallet.id,
      dto.amount,
      'credit',
    );

    const walletTxn = await this.paymentRepo.createWalletTransaction({
      wallet_id: wallet.id,
      type: 'top_up',
      amount: dto.amount,
      balance_after: updatedWallet.balance,
      reference_type: 'topup',
      reference_id: null,
      description: dto.description || 'Wallet top-up',
      status: 'completed',
    });

    this.logger.log(`Wallet top-up: ${dto.amount} PHP for user ${userId}`);

    return {
      transaction_id: walletTxn.id,
      amount: dto.amount,
      new_balance: Number(updatedWallet.balance),
      currency: wallet.currency,
    };
  }

  async getWalletTransactions(userId: string, page: number = 1, limit: number = 20) {
    const wallet = await this.paymentRepo.findWalletByUserId(userId);
    if (!wallet) {
      return { items: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    const { items, total } = await this.paymentRepo.getWalletTransactions(
      wallet.id,
      page,
      limit,
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Webhook Handlers ─────────────────────────────────────────────────

  async handleStripeWebhook(payload: Record<string, unknown>) {
    const eventType = payload.type as string;
    const data = payload.data as Record<string, unknown>;
    const object = data?.object as Record<string, unknown>;

    this.logger.log(`Stripe webhook received: ${eventType}`);

    if (!object) {
      this.logger.warn('Stripe webhook missing data.object');
      return { received: true };
    }

    const gatewayTxnId = object.id as string;

    if (eventType === 'payment_intent.succeeded') {
      // Find transaction by gateway_transaction_id
      const transaction = await this.findTransactionByGatewayId(gatewayTxnId);
      if (transaction) {
        await this.confirmPayment({
          transaction_id: transaction.id,
          gateway_transaction_id: gatewayTxnId,
        });
      } else {
        this.logger.warn(`No transaction found for Stripe payment intent: ${gatewayTxnId}`);
      }
    } else if (eventType === 'payment_intent.payment_failed') {
      const transaction = await this.findTransactionByGatewayId(gatewayTxnId);
      if (transaction) {
        const lastError = object.last_payment_error as Record<string, unknown> | undefined;
        await this.handlePaymentFailure(
          transaction.id,
          (lastError?.message as string) || 'Stripe payment failed',
        );
      }
    }

    return { received: true };
  }

  async handleGcashWebhook(payload: Record<string, unknown>) {
    const eventType = payload.type as string;
    const data = payload.data as Record<string, unknown>;
    const attributes = data?.attributes as Record<string, unknown>;

    this.logger.log(`GCash webhook received: ${eventType}`);

    if (!attributes) {
      this.logger.warn('GCash webhook missing data.attributes');
      return { received: true };
    }

    const sourceId = attributes.id as string || (data?.id as string);

    if (eventType === 'source.chargeable') {
      const transaction = await this.findTransactionByGatewayId(sourceId);
      if (transaction) {
        await this.confirmPayment({
          transaction_id: transaction.id,
          gateway_transaction_id: sourceId,
        });
      } else {
        this.logger.warn(`No transaction found for GCash source: ${sourceId}`);
      }
    } else if (eventType === 'source.failed' || eventType === 'source.expired') {
      const transaction = await this.findTransactionByGatewayId(sourceId);
      if (transaction) {
        await this.handlePaymentFailure(
          transaction.id,
          `GCash payment ${eventType.replace('source.', '')}`,
        );
      }
    }

    return { received: true };
  }

  async handleMayaWebhook(payload: Record<string, unknown>) {
    const status = payload.status as string;
    const id = payload.id as string;
    const referenceNumber = payload.referenceNumber as string || id;

    this.logger.log(`Maya webhook received: status=${status}, id=${id}`);

    if (!id) {
      this.logger.warn('Maya webhook missing transaction id');
      return { received: true };
    }

    const gatewayId = referenceNumber || id;
    const transaction = await this.findTransactionByGatewayId(gatewayId);

    if (!transaction) {
      this.logger.warn(`No transaction found for Maya reference: ${gatewayId}`);
      return { received: true };
    }

    if (status === 'PAYMENT_SUCCESS' || status === 'FOR_SETTLEMENT') {
      await this.confirmPayment({
        transaction_id: transaction.id,
        gateway_transaction_id: gatewayId,
      });
    } else if (status === 'PAYMENT_FAILED' || status === 'PAYMENT_EXPIRED') {
      await this.handlePaymentFailure(
        transaction.id,
        `Maya payment ${status.toLowerCase().replace('payment_', '')}`,
      );
    }

    return { received: true };
  }

  // ── Kafka Event Handlers ─────────────────────────────────────────────

  async handleOrderPlaced(orderData: {
    order_id: string;
    user_id: string;
    total_amount: number;
    payment_method: string;
    idempotency_key?: string;
  }) {
    this.logger.log(`ORDER_PLACED received for order: ${orderData.order_id}`);

    // Only initiate payment capture for non-COD orders
    if (orderData.payment_method === 'cod') {
      this.logger.log(`COD order ${orderData.order_id} -- no payment capture needed`);
      return;
    }

    const idempotencyKey = orderData.idempotency_key || `order_${orderData.order_id}_${Date.now()}`;

    try {
      await this.createPaymentIntent(
        {
          order_id: orderData.order_id,
          amount: orderData.total_amount,
          method: orderData.payment_method as PaymentMethod,
          idempotency_key: idempotencyKey,
        },
        orderData.user_id,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initiate payment for order ${orderData.order_id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // ── Admin Methods ──────────────────────────────────────────────────

  async adminListTransactions(query: AdminTransactionQueryDto) {
    const { items, total } = await this.paymentRepo.findAllTransactionsAdmin({
      search: query.search,
      status: query.status,
      method: query.method,
      type: query.type,
      dateFrom: query.date_from,
      dateTo: query.date_to,
      page: query.page,
      limit: query.limit,
    });

    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }

  async adminGetTransactionStats() {
    const stats = await this.paymentRepo.getTransactionStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  async adminListSettlements(query: AdminSettlementQueryDto) {
    const { items, total } = await this.paymentRepo.findAllSettlementsAdmin({
      vendorId: query.vendor_id,
      status: query.status,
      dateFrom: query.date_from,
      dateTo: query.date_to,
      page: query.page,
      limit: query.limit,
    });

    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }

  async adminGetSettlementStats() {
    const stats = await this.paymentRepo.getSettlementStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  async adminListWallets(query: AdminWalletQueryDto) {
    const { items, total } = await this.paymentRepo.findAllWalletsAdmin({
      search: query.search,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      success: true,
      data: items.map((w) => ({
        ...w,
        balance: Number(w.balance),
        daily_limit: Number(w.daily_limit),
        monthly_limit: Number(w.monthly_limit),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }

  async adminGetWalletStats() {
    const stats = await this.paymentRepo.getWalletStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────────

  private async findTransactionByGatewayId(gatewayTxnId: string): Promise<TransactionEntity | null> {
    // Check Redis cache first for fast webhook lookups
    const cached = await this.redisService.get(`payment:gateway_txn:${gatewayTxnId}`);
    if (cached) {
      return JSON.parse(cached) as TransactionEntity;
    }

    // Fall back to database query (indexed column)
    const transaction = await this.paymentRepo.findTransactionByGatewayId(gatewayTxnId);
    if (transaction) {
      // Cache for future webhook retries (1 hour TTL)
      await this.redisService.set(
        `payment:gateway_txn:${gatewayTxnId}`,
        JSON.stringify(transaction),
        3600,
      );
    }
    return transaction;
  }
}
