import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundDto } from './dto/refund.dto';
import { SettlementQueryDto } from './dto/settlement-query.dto';
import { WalletTopupDto } from './dto/wallet-topup.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── Payment Intent ───────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('intent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent' })
  async createPaymentIntent(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentService.createPaymentIntent(dto, userId);
  }

  // ── Confirm Payment ──────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a payment (mark as completed)' })
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(dto);
  }

  // ── Refund ───────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'vendor_owner')
  @RequirePermissions('payment:refund')
  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a refund' })
  async processRefund(
    @Body() dto: RefundDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentService.processRefund(dto, userId);
  }

  // ── Order Transactions ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('order/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment transactions for an order' })
  @ApiParam({ name: 'orderId', type: 'string', format: 'uuid' })
  async getTransactionsByOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.paymentService.getTransactionsByOrder(
      orderId,
      pagination.page,
      pagination.limit,
    );
  }

  // ── My Payment History ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user payment history' })
  async getMyPayments(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.paymentService.getTransactionsByUser(
      userId,
      pagination.page,
      pagination.limit,
    );
  }

  // ── Wallet Endpoints ─────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('wallet')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wallet balance' })
  async getWalletBalance(@CurrentUser('id') userId: string) {
    return this.paymentService.getWalletBalance(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('wallet/topup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top up wallet balance' })
  async topupWallet(
    @CurrentUser('id') userId: string,
    @Body() dto: WalletTopupDto,
  ) {
    return this.paymentService.topupWallet(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('wallet/transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet transaction history' })
  async getWalletTransactions(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.paymentService.getWalletTransactions(
      userId,
      pagination.page,
      pagination.limit,
    );
  }

  // ── Stripe Webhook ───────────────────────────────────────────────────

  @Public()
  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint (no auth)' })
  async stripeWebhook(@Req() req: RawBodyRequest<Request>) {
    // In production: verify Stripe signature using req.rawBody
    // const sig = req.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    const payload = req.body as Record<string, unknown>;
    return this.paymentService.handleStripeWebhook(payload);
  }

  // ── GCash Webhook ────────────────────────────────────────────────────

  @Public()
  @Post('webhooks/gcash')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GCash webhook endpoint (no auth)' })
  async gcashWebhook(@Req() req: RawBodyRequest<Request>) {
    // In production: verify GCash/PayMongo webhook signature
    const payload = req.body as Record<string, unknown>;
    return this.paymentService.handleGcashWebhook(payload);
  }

  // ── Maya Webhook ────────────────────────────────────────────────────

  @Public()
  @Post('webhooks/maya')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Maya webhook endpoint (no auth)' })
  async mayaWebhook(@Req() req: RawBodyRequest<Request>) {
    // In production: verify Maya webhook signature
    const payload = req.body as Record<string, unknown>;
    return this.paymentService.handleMayaWebhook(payload);
  }

  // ── Vendor Settlements ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vendor_owner', 'vendor_staff', 'admin')
  @Get('settlements')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List vendor settlements' })
  async getSettlements(
    @Query() query: SettlementQueryDto,
    @CurrentUser() user: { id: string; vendor_id: string | null; role: string },
  ) {
    // For admin, allow querying any vendor; for vendors, restrict to their own
    const vendorId = user.role === 'admin'
      ? (query.vendor_id || '')
      : (user.vendor_id || '');

    return this.paymentService.getSettlements(query, vendorId);
  }
}
