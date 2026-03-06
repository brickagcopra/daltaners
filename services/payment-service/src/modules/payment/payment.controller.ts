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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { SettlementService } from './settlement.service';
import { TaxService } from './tax.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundDto } from './dto/refund.dto';
import { SettlementQueryDto } from './dto/settlement-query.dto';
import { WalletTopupDto } from './dto/wallet-topup.dto';
import { TaxInvoiceQueryDto } from './dto/tax-invoice.dto';
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
  constructor(
    private readonly paymentService: PaymentService,
    private readonly settlementService: SettlementService,
    private readonly taxService: TaxService,
  ) {}

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
  @Get('settlements/summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor settlement summary (total earned, paid, pending, commission)' })
  async getSettlementSummary(
    @CurrentUser() user: { id: string; vendor_id: string | null; role: string },
    @Query('vendor_id') queryVendorId?: string,
  ) {
    const vendorId = user.role === 'admin'
      ? (queryVendorId || '')
      : (user.vendor_id || '');

    return this.paymentService.getVendorSettlementSummary(vendorId);
  }

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vendor_owner', 'vendor_staff')
  @Get('settlements/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get settlement detail with order breakdown (vendor)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getSettlementDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationQueryDto,
    @CurrentUser() user: { id: string; vendor_id: string | null },
  ) {
    const detail = await this.settlementService.getSettlementDetail(
      id,
      pagination.page,
      pagination.limit,
    );

    // Authorization: vendors can only view their own settlements
    if (detail.settlement.vendor_id !== user.vendor_id) {
      throw new ForbiddenException('You can only view your own settlements');
    }

    return {
      success: true,
      data: detail.settlement,
      items: detail.items,
      meta: detail.meta,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Vendor Tax Endpoints ───────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vendor_owner', 'vendor_staff')
  @Get('tax/invoices')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor tax invoices (EWT certificates)' })
  async getMyTaxInvoices(
    @CurrentUser() user: { id: string; vendor_id: string | null },
    @Query() query: TaxInvoiceQueryDto,
  ) {
    if (!user.vendor_id) {
      throw new ForbiddenException('No vendor associated with this account');
    }
    return this.taxService.getVendorInvoices(user.vendor_id, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vendor_owner', 'vendor_staff')
  @Get('tax/invoices/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tax invoice detail (vendor)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getMyTaxInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; vendor_id: string | null },
  ) {
    if (!user.vendor_id) {
      throw new ForbiddenException('No vendor associated with this account');
    }
    const invoice = await this.taxService.getInvoiceById(id);
    if (invoice.vendor_id !== user.vendor_id) {
      throw new ForbiddenException('You can only view your own tax invoices');
    }
    return {
      success: true,
      data: invoice,
      timestamp: new Date().toISOString(),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vendor_owner', 'vendor_staff')
  @Get('tax/summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor tax summary (total VAT, EWT, commissions)' })
  async getMyTaxSummary(
    @CurrentUser() user: { id: string; vendor_id: string | null },
    @Query('period_start') periodStart?: string,
    @Query('period_end') periodEnd?: string,
  ) {
    if (!user.vendor_id) {
      throw new ForbiddenException('No vendor associated with this account');
    }
    const summary = await this.taxService.getVendorTaxSummary(
      user.vendor_id,
      periodStart,
      periodEnd,
    );
    return {
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    };
  }
}
