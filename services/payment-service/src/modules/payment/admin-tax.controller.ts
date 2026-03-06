import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { TaxService } from './tax.service';
import {
  CreateTaxConfigDto,
  UpdateTaxConfigDto,
  TaxConfigQueryDto,
} from './dto/tax-configuration.dto';
import {
  AdminTaxInvoiceQueryDto,
  CancelInvoiceDto,
} from './dto/tax-invoice.dto';
import {
  GenerateTaxReportDto,
  TaxReportQueryDto,
  FinalizeTaxReportDto,
  FileTaxReportDto,
} from './dto/tax-report.dto';

@ApiTags('Admin - Tax & Compliance')
@ApiBearerAuth()
@Controller('payments/admin/tax')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminTaxController {
  constructor(private readonly taxService: TaxService) {}

  // ── Tax Configuration CRUD ────────────────────────────────────────

  @Get('configs')
  @ApiOperation({ summary: 'List all tax configurations (admin)' })
  async listConfigs(@Query() query: TaxConfigQueryDto) {
    return this.taxService.listTaxConfigs(query);
  }

  @Get('configs/active')
  @ApiOperation({ summary: 'List only active (currently effective) tax configurations' })
  async getActiveConfigs() {
    const configs = await this.taxService.getActiveTaxConfigs();
    return {
      success: true,
      data: configs,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('configs/:id')
  @ApiOperation({ summary: 'Get tax configuration detail' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getConfig(@Param('id', ParseUUIDPipe) id: string) {
    const config = await this.taxService.getTaxConfigById(id);
    return {
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('configs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tax configuration' })
  async createConfig(
    @Body() dto: CreateTaxConfigDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    const config = await this.taxService.createTaxConfig(dto, adminUserId);
    return {
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('configs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a tax configuration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async updateConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxConfigDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    const config = await this.taxService.updateTaxConfig(id, dto, adminUserId);
    return {
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tax configuration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async deleteConfig(@Param('id', ParseUUIDPipe) id: string) {
    await this.taxService.deleteTaxConfig(id);
  }

  // ── Tax Invoice Management ────────────────────────────────────────

  @Get('invoices')
  @ApiOperation({ summary: 'List all tax invoices with filters (admin)' })
  async listInvoices(@Query() query: AdminTaxInvoiceQueryDto) {
    return this.taxService.adminListInvoices(query);
  }

  @Get('invoice-stats')
  @ApiOperation({ summary: 'Get tax invoice statistics (admin)' })
  async getInvoiceStats() {
    const stats = await this.taxService.getInvoiceStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get tax invoice detail (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    const invoice = await this.taxService.getInvoiceById(id);
    return {
      success: true,
      data: invoice,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('invoices/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a tax invoice (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async cancelInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelInvoiceDto,
  ) {
    const invoice = await this.taxService.cancelInvoice(id, dto.reason);
    return {
      success: true,
      data: invoice,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('invoices/:id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void a tax invoice (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async voidInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelInvoiceDto,
  ) {
    const invoice = await this.taxService.voidInvoice(id, dto.reason);
    return {
      success: true,
      data: invoice,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Tax Report Management ─────────────────────────────────────────

  @Get('reports')
  @ApiOperation({ summary: 'List all tax reports (admin)' })
  async listReports(@Query() query: TaxReportQueryDto) {
    return this.taxService.listTaxReports(query);
  }

  @Get('report-stats')
  @ApiOperation({ summary: 'Get tax report statistics (admin)' })
  async getReportStats() {
    const stats = await this.taxService.getReportStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get tax report detail (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getReport(@Param('id', ParseUUIDPipe) id: string) {
    const report = await this.taxService.getTaxReportById(id);
    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reports/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a tax report for a period (admin)' })
  async generateReport(
    @Body() dto: GenerateTaxReportDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    const report = await this.taxService.generateTaxReport(dto, adminUserId);
    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('reports/:id/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize a draft tax report (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async finalizeReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizeTaxReportDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    const report = await this.taxService.finalizeTaxReport(id, adminUserId, dto.notes);
    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('reports/:id/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a finalized tax report as filed with BIR (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async fileReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FileTaxReportDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    const report = await this.taxService.fileTaxReport(
      id,
      adminUserId,
      dto.filing_reference,
      dto.notes,
    );
    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }
}
