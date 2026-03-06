import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PosRepository, PaginatedResult } from './pos.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { TerminalEntity } from './entities/terminal.entity';
import { ShiftEntity } from './entities/shift.entity';
import { CashMovementEntity } from './entities/cash-movement.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { CreateTerminalDto } from './dto/create-terminal.dto';
import { UpdateTerminalDto } from './dto/update-terminal.dto';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

const KAFKA_TOPIC = 'daltaners.pos.events';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private readonly repository: PosRepository,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ── Terminal Operations ──

  async createTerminal(dto: CreateTerminalDto, user: JwtPayload): Promise<TerminalEntity> {
    this.assertVendorOrAdmin(user, dto.store_id);

    const existing = await this.repository.findTerminalByCode(dto.terminal_code);
    if (existing) {
      throw new ConflictException(`Terminal code "${dto.terminal_code}" already exists`);
    }

    const terminal = await this.repository.createTerminal({
      store_id: dto.store_id,
      name: dto.name,
      terminal_code: dto.terminal_code,
      hardware_config: dto.hardware_config || null,
      ip_address: dto.ip_address || null,
      status: 'active',
    });

    this.logger.log(`Terminal created: ${terminal.id} for store ${dto.store_id}`);
    await this.kafka.publish(KAFKA_TOPIC, 'terminal.created', {
      terminal_id: terminal.id,
      store_id: terminal.store_id,
      terminal_code: terminal.terminal_code,
    });

    return terminal;
  }

  async getTerminal(id: string): Promise<TerminalEntity> {
    const terminal = await this.repository.findTerminalById(id);
    if (!terminal) {
      throw new NotFoundException(`Terminal ${id} not found`);
    }
    return terminal;
  }

  async listTerminals(
    storeId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<TerminalEntity>> {
    return this.repository.findTerminalsByStoreId(storeId, page, limit);
  }

  async updateTerminal(
    id: string,
    dto: UpdateTerminalDto,
    user: JwtPayload,
  ): Promise<TerminalEntity> {
    const terminal = await this.getTerminal(id);
    this.assertVendorOrAdmin(user, terminal.store_id);

    const updated = await this.repository.updateTerminal(id, dto);
    if (!updated) {
      throw new NotFoundException(`Terminal ${id} not found`);
    }

    this.logger.log(`Terminal updated: ${id}`);
    return updated;
  }

  async deleteTerminal(id: string, user: JwtPayload): Promise<void> {
    const terminal = await this.getTerminal(id);
    this.assertVendorOrAdmin(user, terminal.store_id);

    const openShift = await this.repository.findOpenShiftByTerminalId(id);
    if (openShift) {
      throw new BadRequestException('Cannot delete terminal with an open shift. Close the shift first.');
    }

    await this.repository.deleteTerminal(id);
    this.logger.log(`Terminal deleted: ${id}`);

    await this.kafka.publish(KAFKA_TOPIC, 'terminal.deleted', {
      terminal_id: id,
      store_id: terminal.store_id,
    });
  }

  async heartbeat(id: string, ipAddress?: string): Promise<void> {
    const terminal = await this.repository.findTerminalById(id);
    if (!terminal) {
      throw new NotFoundException(`Terminal ${id} not found`);
    }
    await this.repository.updateTerminalHeartbeat(id, ipAddress);
  }

  // ── Shift Operations ──

  async openShift(dto: OpenShiftDto, user: JwtPayload): Promise<ShiftEntity> {
    const terminal = await this.getTerminal(dto.terminal_id);
    this.assertVendorOrAdmin(user, terminal.store_id);

    if (terminal.status !== 'active') {
      throw new BadRequestException(`Terminal "${terminal.name}" is not active (status: ${terminal.status})`);
    }

    const existingShift = await this.repository.findOpenShiftByTerminalId(dto.terminal_id);
    if (existingShift) {
      throw new ConflictException(
        `Terminal "${terminal.name}" already has an open shift (ID: ${existingShift.id})`,
      );
    }

    const shift = await this.repository.createShift({
      terminal_id: dto.terminal_id,
      cashier_id: user.sub,
      cashier_name: dto.cashier_name || null,
      opening_cash: dto.opening_cash,
      opened_at: new Date(),
      status: 'open',
      total_transactions: 0,
      total_sales: 0,
      total_refunds: 0,
      total_voids: 0,
      payment_totals: {},
    });

    this.logger.log(`Shift opened: ${shift.id} on terminal ${dto.terminal_id} by ${user.sub}`);
    await this.kafka.publish(KAFKA_TOPIC, 'shift.opened', {
      shift_id: shift.id,
      terminal_id: dto.terminal_id,
      store_id: terminal.store_id,
      cashier_id: user.sub,
      opening_cash: dto.opening_cash,
    });

    return shift;
  }

  async closeShift(shiftId: string, dto: CloseShiftDto, user: JwtPayload): Promise<ShiftEntity> {
    const shift = await this.repository.findShiftById(shiftId);
    if (!shift) {
      throw new NotFoundException(`Shift ${shiftId} not found`);
    }
    if (shift.status !== 'open') {
      throw new BadRequestException(`Shift is already ${shift.status}`);
    }

    this.assertVendorOrAdmin(user, shift.terminal?.store_id);

    // Calculate expected cash:
    // opening_cash + cash sales - cash refunds + cash_in floats - cash_out/pickups
    const summary = await this.repository.getShiftSummary(shiftId);
    const cashPayments = (summary.payment_breakdown as Array<{ method: string; amount: string }>)
      ?.find((p) => p.method === 'cash');
    const cashSales = cashPayments ? parseFloat(cashPayments.amount) : 0;

    // Get cash movements for the shift
    const movements = await this.repository.findCashMovementsByShiftId(shiftId, 1, 1000);
    let cashIn = 0;
    let cashOut = 0;
    for (const m of movements.items) {
      if (m.type === 'cash_in' || m.type === 'float') {
        cashIn += Number(m.amount);
      } else {
        cashOut += Number(m.amount);
      }
    }

    const expectedCash = Number(shift.opening_cash) + cashSales + cashIn - cashOut;
    const cashDifference = dto.closing_cash - expectedCash;

    const updated = await this.repository.updateShift(shiftId, {
      status: 'closed',
      closing_cash: dto.closing_cash,
      expected_cash: parseFloat(expectedCash.toFixed(2)),
      cash_difference: parseFloat(cashDifference.toFixed(2)),
      close_notes: dto.close_notes || null,
      closed_at: new Date(),
      total_transactions: Number(summary.total_transactions) || 0,
      total_sales: Number(summary.total_sales_amount) || 0,
      total_refunds: Number(summary.total_refunds_amount) || 0,
      total_voids: Number(summary.total_voids_amount) || 0,
    });

    if (!updated) {
      throw new NotFoundException(`Shift ${shiftId} not found`);
    }

    this.logger.log(
      `Shift closed: ${shiftId}, expected: ${expectedCash.toFixed(2)}, actual: ${dto.closing_cash}, diff: ${cashDifference.toFixed(2)}`,
    );

    await this.kafka.publish(KAFKA_TOPIC, 'shift.closed', {
      shift_id: shiftId,
      terminal_id: shift.terminal_id,
      store_id: shift.terminal?.store_id,
      cashier_id: shift.cashier_id,
      closing_cash: dto.closing_cash,
      expected_cash: parseFloat(expectedCash.toFixed(2)),
      cash_difference: parseFloat(cashDifference.toFixed(2)),
      total_sales: Number(summary.total_sales_amount) || 0,
    });

    return updated;
  }

  async getShift(id: string): Promise<ShiftEntity> {
    const shift = await this.repository.findShiftById(id);
    if (!shift) {
      throw new NotFoundException(`Shift ${id} not found`);
    }
    return shift;
  }

  async listShiftsByTerminal(
    terminalId: string,
    page: number,
    limit: number,
    status?: string,
  ): Promise<PaginatedResult<ShiftEntity>> {
    return this.repository.findShiftsByTerminalId(terminalId, page, limit, status);
  }

  async listShiftsByStore(
    storeId: string,
    page: number,
    limit: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PaginatedResult<ShiftEntity>> {
    return this.repository.findShiftsByStoreId(storeId, page, limit, dateFrom, dateTo);
  }

  async getShiftSummary(shiftId: string): Promise<Record<string, unknown>> {
    const shift = await this.repository.findShiftById(shiftId);
    if (!shift) {
      throw new NotFoundException(`Shift ${shiftId} not found`);
    }
    return this.repository.getShiftSummary(shiftId);
  }

  // ── Cash Movement Operations ──

  async createCashMovement(
    shiftId: string,
    dto: CreateCashMovementDto,
    user: JwtPayload,
  ): Promise<CashMovementEntity> {
    const shift = await this.repository.findShiftById(shiftId);
    if (!shift) {
      throw new NotFoundException(`Shift ${shiftId} not found`);
    }
    if (shift.status !== 'open') {
      throw new BadRequestException('Cannot add cash movement to a closed shift');
    }

    this.assertVendorOrAdmin(user, shift.terminal?.store_id);

    const movement = await this.repository.createCashMovement({
      shift_id: shiftId,
      type: dto.type,
      amount: dto.amount,
      reason: dto.reason || null,
      performed_by: user.sub,
      performed_by_name: null,
    });

    this.logger.log(
      `Cash movement: ${dto.type} ${dto.amount} on shift ${shiftId} by ${user.sub}`,
    );

    await this.kafka.publish(KAFKA_TOPIC, 'cash_movement.created', {
      movement_id: movement.id,
      shift_id: shiftId,
      type: dto.type,
      amount: dto.amount,
    });

    return movement;
  }

  async listCashMovements(
    shiftId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<CashMovementEntity>> {
    const shift = await this.repository.findShiftById(shiftId);
    if (!shift) {
      throw new NotFoundException(`Shift ${shiftId} not found`);
    }
    return this.repository.findCashMovementsByShiftId(shiftId, page, limit);
  }

  // ── Transaction Operations ──

  async createTransaction(
    dto: CreateTransactionDto,
    user: JwtPayload,
  ): Promise<TransactionEntity> {
    // Idempotency check
    if (dto.idempotency_key) {
      const existing = await this.repository.findTransactionByIdempotencyKey(dto.idempotency_key);
      if (existing) {
        this.logger.log(`Idempotent transaction returned: ${existing.id}`);
        return existing;
      }
    }

    // Validate shift
    const shift = await this.repository.findShiftById(dto.shift_id);
    if (!shift) {
      throw new NotFoundException(`Shift ${dto.shift_id} not found`);
    }
    if (shift.status !== 'open') {
      throw new BadRequestException('Cannot create transaction on a closed shift');
    }

    this.assertVendorOrAdmin(user, shift.terminal?.store_id);

    // Validate refund requires original_transaction_id
    if (dto.type === 'refund' && !dto.original_transaction_id) {
      throw new BadRequestException('Refund transactions require original_transaction_id');
    }

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const items = dto.items.map((item) => {
      const itemTax = item.tax_amount || 0;
      const itemDiscount = item.discount_amount || 0;
      const itemTotal = item.unit_price * item.quantity + itemTax - itemDiscount;
      subtotal += item.unit_price * item.quantity;
      totalTax += itemTax;
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        barcode: item.barcode || null,
        sku: item.sku || null,
        unit_price: item.unit_price,
        quantity: item.quantity,
        tax_amount: itemTax,
        discount_amount: itemDiscount,
        total: parseFloat(itemTotal.toFixed(2)),
      };
    });

    const discountAmount = dto.discount_amount || 0;
    const total = parseFloat((subtotal + totalTax - discountAmount).toFixed(2));

    // For cash payments, validate amount tendered
    const amountTendered = dto.amount_tendered || 0;
    if (dto.payment_method === 'cash' && dto.type === 'sale' && amountTendered < total) {
      throw new BadRequestException(
        `Amount tendered (${amountTendered}) is less than total (${total})`,
      );
    }
    const changeAmount = dto.payment_method === 'cash'
      ? parseFloat((amountTendered - total).toFixed(2))
      : 0;

    // Generate transaction number: POS-YYYYMMDD-XXXXXX
    const txNumber = await this.generateTransactionNumber();

    const transaction = await this.repository.createTransactionWithItems(
      {
        transaction_number: txNumber,
        shift_id: dto.shift_id,
        store_id: shift.terminal?.store_id || '',
        terminal_id: shift.terminal_id,
        cashier_id: user.sub,
        customer_id: dto.customer_id || null,
        type: dto.type,
        status: 'completed',
        subtotal,
        tax_amount: totalTax,
        discount_amount: discountAmount,
        total,
        payment_method: dto.payment_method,
        payment_details: dto.payment_details || null,
        amount_tendered: amountTendered,
        change_amount: changeAmount,
        original_transaction_id: dto.original_transaction_id || null,
        refund_reason: dto.refund_reason || null,
        idempotency_key: dto.idempotency_key || null,
        loyalty_points_earned: dto.type === 'sale' ? Math.floor(total) : null,
        loyalty_points_redeemed: dto.loyalty_points_redeemed || null,
        metadata: dto.metadata || {},
      },
      items,
      {
        receipt_data: {
          transaction_number: txNumber,
          items: items.map((i) => ({
            name: i.product_name,
            qty: i.quantity,
            price: i.unit_price,
            total: i.total,
          })),
          subtotal,
          tax: totalTax,
          discount: discountAmount,
          total,
          payment_method: dto.payment_method,
          amount_tendered: amountTendered,
          change: changeAmount,
        },
        receipt_text: this.formatReceiptText(txNumber, items, subtotal, totalTax, discountAmount, total, dto.payment_method, amountTendered, changeAmount),
      },
    );

    this.logger.log(`Transaction created: ${txNumber} (${dto.type}) total: ${total}`);

    await this.kafka.publish(KAFKA_TOPIC, 'transaction.created', {
      transaction_id: transaction.id,
      transaction_number: txNumber,
      store_id: shift.terminal?.store_id,
      type: dto.type,
      total,
      payment_method: dto.payment_method,
      items_count: items.length,
    }, shift.terminal?.store_id);

    return transaction;
  }

  async getTransaction(id: string): Promise<TransactionEntity> {
    const tx = await this.repository.findTransactionById(id);
    if (!tx) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return tx;
  }

  async getTransactionByNumber(txNumber: string): Promise<TransactionEntity> {
    const tx = await this.repository.findTransactionByNumber(txNumber);
    if (!tx) {
      throw new NotFoundException(`Transaction ${txNumber} not found`);
    }
    return tx;
  }

  async listTransactionsByShift(
    shiftId: string,
    page: number,
    limit: number,
    type?: string,
    status?: string,
  ): Promise<PaginatedResult<TransactionEntity>> {
    return this.repository.findTransactionsByShiftId(shiftId, page, limit, type, status);
  }

  async listTransactionsByStore(
    storeId: string,
    page: number,
    limit: number,
    dateFrom?: string,
    dateTo?: string,
    type?: string,
    status?: string,
    paymentMethod?: string,
  ): Promise<PaginatedResult<TransactionEntity>> {
    return this.repository.findTransactionsByStoreId(
      storeId, page, limit, dateFrom, dateTo, type, status, paymentMethod,
    );
  }

  async voidTransaction(id: string, voidReason: string, user: JwtPayload): Promise<TransactionEntity> {
    const tx = await this.repository.findTransactionById(id);
    if (!tx) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    if (tx.status === 'voided') {
      throw new BadRequestException('Transaction is already voided');
    }
    if (tx.status !== 'completed') {
      throw new BadRequestException(`Cannot void transaction with status "${tx.status}"`);
    }

    // Check shift is still open
    const shift = await this.repository.findShiftById(tx.shift_id);
    if (shift && shift.status !== 'open') {
      throw new BadRequestException('Cannot void transaction on a closed shift');
    }

    this.assertVendorOrAdmin(user, tx.store_id);

    const updated = await this.repository.updateTransaction(id, {
      status: 'voided',
      void_reason: voidReason,
    });

    if (!updated) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }

    this.logger.log(`Transaction voided: ${tx.transaction_number} by ${user.sub} — ${voidReason}`);

    await this.kafka.publish(KAFKA_TOPIC, 'transaction.voided', {
      transaction_id: id,
      transaction_number: tx.transaction_number,
      store_id: tx.store_id,
      total: tx.total,
      void_reason: voidReason,
    }, tx.store_id);

    return updated;
  }

  async getReceipt(transactionId: string) {
    const receipt = await this.repository.findReceiptByTransactionId(transactionId);
    if (!receipt) {
      throw new NotFoundException(`Receipt for transaction ${transactionId} not found`);
    }
    return receipt;
  }

  // ── Report Operations ──

  async getSalesSummary(storeId: string, dateFrom: string, dateTo: string) {
    return this.repository.getSalesSummary(storeId, dateFrom, dateTo);
  }

  async getProductSales(storeId: string, dateFrom: string, dateTo: string, limit?: number) {
    return this.repository.getProductSales(storeId, dateFrom, dateTo, limit || 20);
  }

  async getHourlySales(storeId: string, dateFrom: string, dateTo: string) {
    return this.repository.getHourlySales(storeId, dateFrom, dateTo);
  }

  async getCashierPerformance(storeId: string, dateFrom: string, dateTo: string) {
    return this.repository.getCashierPerformance(storeId, dateFrom, dateTo);
  }

  async getPaymentBreakdown(storeId: string, dateFrom: string, dateTo: string) {
    return this.repository.getPaymentMethodBreakdown(storeId, dateFrom, dateTo);
  }

  // ── Helpers ──

  private async generateTransactionNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    const txNumber = `POS-${dateStr}-${random}`;

    const exists = await this.repository.transactionNumberExists(txNumber);
    if (exists) {
      return this.generateTransactionNumber();
    }
    return txNumber;
  }

  private formatReceiptText(
    txNumber: string,
    items: Array<{ product_name: string; quantity: number; unit_price: number; total: number }>,
    subtotal: number,
    tax: number,
    discount: number,
    total: number,
    paymentMethod: string,
    amountTendered: number,
    change: number,
  ): string {
    const lines: string[] = [];
    lines.push('================================');
    lines.push('        DALTANERS POS');
    lines.push('================================');
    lines.push(`TX#: ${txNumber}`);
    lines.push(`Date: ${new Date().toLocaleString('en-PH')}`);
    lines.push('--------------------------------');

    for (const item of items) {
      lines.push(`${item.product_name}`);
      lines.push(`  ${item.quantity} x ${item.unit_price.toFixed(2)}    ${item.total.toFixed(2)}`);
    }

    lines.push('--------------------------------');
    lines.push(`Subtotal:      ${subtotal.toFixed(2)}`);
    if (tax > 0) lines.push(`Tax:           ${tax.toFixed(2)}`);
    if (discount > 0) lines.push(`Discount:     -${discount.toFixed(2)}`);
    lines.push(`TOTAL:         ${total.toFixed(2)}`);
    lines.push('--------------------------------');
    lines.push(`Payment: ${paymentMethod.toUpperCase()}`);
    if (paymentMethod === 'cash') {
      lines.push(`Tendered:      ${amountTendered.toFixed(2)}`);
      lines.push(`Change:        ${change.toFixed(2)}`);
    }
    lines.push('================================');
    lines.push('     Thank you! Come again!');
    lines.push('================================');

    return lines.join('\n');
  }

  // ── Authorization Helper ──

  private assertVendorOrAdmin(user: JwtPayload, storeId?: string): void {
    if (user.role === 'admin') return;

    if (user.role !== 'vendor_owner' && user.role !== 'vendor_staff') {
      throw new ForbiddenException('Only vendor owners, staff, or admins can perform this action');
    }

    if (storeId && user.vendor_id && user.vendor_id !== storeId) {
      throw new ForbiddenException('You do not have access to this store');
    }
  }
}
