import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { VoidTransactionDto } from './dto/void-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('pos/transactions')
@Roles('vendor_owner', 'vendor_staff', 'admin')
export class TransactionController {
  constructor(private readonly posService: PosService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new POS transaction (sale, refund, exchange)' })
  async create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const transaction = await this.posService.createTransaction(dto, user);
    return {
      success: true,
      data: transaction,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('shift/:shiftId')
  @ApiOperation({ summary: 'List transactions for a shift' })
  async listByShift(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Query() query: TransactionQueryDto,
  ) {
    const result = await this.posService.listTransactionsByShift(
      shiftId,
      query.page || 1,
      query.limit || 50,
      query.type,
      query.status,
    );
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'List transactions for a store' })
  async listByStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: TransactionQueryDto,
  ) {
    const result = await this.posService.listTransactionsByStore(
      storeId,
      query.page || 1,
      query.limit || 20,
      query.date_from,
      query.date_to,
      query.type,
      query.status,
      query.payment_method,
    );
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const transaction = await this.posService.getTransaction(id);
    return {
      success: true,
      data: transaction,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Get receipt for a transaction' })
  async getReceipt(@Param('id', ParseUUIDPipe) id: string) {
    const receipt = await this.posService.getReceipt(id);
    return {
      success: true,
      data: receipt,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/void')
  @ApiOperation({ summary: 'Void a completed transaction' })
  async voidTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidTransactionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const transaction = await this.posService.voidTransaction(id, dto.void_reason, user);
    return {
      success: true,
      data: transaction,
      timestamp: new Date().toISOString(),
    };
  }
}
