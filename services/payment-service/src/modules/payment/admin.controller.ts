import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import { SettlementService } from './settlement.service';
import {
  AdminTransactionQueryDto,
  AdminSettlementQueryDto,
  AdminWalletQueryDto,
} from './dto/admin-transaction-query.dto';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';
import {
  ApproveSettlementDto,
  ProcessSettlementDto,
  RejectSettlementDto,
  AdjustSettlementDto,
  BatchProcessDto,
} from './dto/settlement-action.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Admin - Payments')
@ApiBearerAuth()
@Controller('payments/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly settlementService: SettlementService,
  ) {}

  // ── Transaction Endpoints ──────────────────────────────────────────

  @Get('transactions')
  @ApiOperation({ summary: 'List all transactions with filters (admin)' })
  async listTransactions(@Query() query: AdminTransactionQueryDto) {
    return this.paymentService.adminListTransactions(query);
  }

  @Get('transaction-stats')
  @ApiOperation({ summary: 'Get transaction statistics (admin)' })
  async getTransactionStats() {
    return this.paymentService.adminGetTransactionStats();
  }

  // ── Settlement List & Stats ────────────────────────────────────────

  @Get('settlements')
  @ApiOperation({ summary: 'List all vendor settlements with filters (admin)' })
  async listSettlements(@Query() query: AdminSettlementQueryDto) {
    return this.paymentService.adminListSettlements(query);
  }

  @Get('settlement-stats')
  @ApiOperation({ summary: 'Get settlement statistics (admin)' })
  async getSettlementStats() {
    return this.paymentService.adminGetSettlementStats();
  }

  // ── Settlement Generation & Actions ────────────────────────────────

  @Post('settlements/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate settlements for a period (admin)' })
  async generateSettlements(@Body() dto: GenerateSettlementDto) {
    const result = await this.settlementService.generateSettlements(
      dto.period_start,
      dto.period_end,
      dto.vendor_id,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('settlements/:id')
  @ApiOperation({ summary: 'Get settlement detail with order breakdown (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getSettlementDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const result = await this.settlementService.getSettlementDetail(
      id,
      pagination.page,
      pagination.limit,
    );
    return {
      success: true,
      data: result.settlement,
      items: result.items,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('settlements/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a settlement (pending → processing)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async approveSettlement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveSettlementDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    const settlement = await this.settlementService.approveSettlement(
      id,
      adminUserId,
      dto.notes,
    );
    return {
      success: true,
      data: settlement,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('settlements/:id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark settlement as paid (processing → completed)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async processSettlement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessSettlementDto,
  ) {
    const settlement = await this.settlementService.processSettlement(
      id,
      dto.payment_reference,
      dto.notes,
    );
    return {
      success: true,
      data: settlement,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('settlements/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a settlement (pending → failed)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async rejectSettlement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectSettlementDto,
  ) {
    const settlement = await this.settlementService.rejectSettlement(id, dto.reason);
    return {
      success: true,
      data: settlement,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('settlements/:id/adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust settlement amounts before approval' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async adjustSettlement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustSettlementDto,
  ) {
    const settlement = await this.settlementService.adjustSettlement(
      id,
      dto.adjustment_amount,
      dto.reason,
    );
    return {
      success: true,
      data: settlement,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('settlements/batch-process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch process multiple settlements' })
  async batchProcess(@Body() dto: BatchProcessDto) {
    const result = await this.settlementService.batchProcess(
      dto.settlement_ids,
      dto.reference_prefix,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Wallet Endpoints ───────────────────────────────────────────────

  @Get('wallets')
  @ApiOperation({ summary: 'List all wallets with filters (admin)' })
  async listWallets(@Query() query: AdminWalletQueryDto) {
    return this.paymentService.adminListWallets(query);
  }

  @Get('wallet-stats')
  @ApiOperation({ summary: 'Get wallet statistics (admin)' })
  async getWalletStats() {
    return this.paymentService.adminGetWalletStats();
  }
}
