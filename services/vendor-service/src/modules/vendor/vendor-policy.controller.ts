import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PolicyService } from './policy.service';
import { ViolationQueryDto } from './dto/policy-violation.dto';
import { CreateAppealDto, AppealQueryDto } from './dto/appeal.dto';

@ApiTags('Vendor - Policy')
@ApiBearerAuth()
@Controller('vendors/policy')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendor_owner', 'vendor_staff')
export class VendorPolicyController {
  constructor(private readonly policyService: PolicyService) {}

  // ── Violations ────────────────────────────────────────────────

  @Get('violations')
  @ApiOperation({ summary: 'List my store violations' })
  async listViolations(
    @CurrentUser('vendor_id') storeId: string,
    @Query() query: ViolationQueryDto,
  ) {
    return {
      success: true,
      ...(await this.policyService.listViolationsByStore(storeId, query)),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('violations/:id')
  @ApiOperation({ summary: 'Get violation detail' })
  @ApiParam({ name: 'id', type: String })
  async getViolation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
  ) {
    const violation = await this.policyService.getViolation(id);
    if (violation.store_id !== storeId) {
      throw new Error('Violation not found');
    }
    return {
      success: true,
      data: violation,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('violations/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge a pending violation' })
  @ApiParam({ name: 'id', type: String })
  async acknowledgeViolation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
  ) {
    const violation = await this.policyService.acknowledgeViolation(id, storeId);
    return {
      success: true,
      data: violation,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get violation summary for my store' })
  async getViolationSummary(@CurrentUser('vendor_id') storeId: string) {
    const summary = await this.policyService.getStoreViolationSummary(storeId);
    return {
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Appeals ───────────────────────────────────────────────────

  @Post('violations/:violationId/appeal')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an appeal against a violation' })
  @ApiParam({ name: 'violationId', type: String })
  async createAppeal(
    @Param('violationId', ParseUUIDPipe) violationId: string,
    @CurrentUser('vendor_id') storeId: string,
    @Body() dto: CreateAppealDto,
  ) {
    const appeal = await this.policyService.createAppeal(violationId, storeId, dto);
    return {
      success: true,
      data: appeal,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('appeals')
  @ApiOperation({ summary: 'List my store appeals' })
  async listAppeals(
    @CurrentUser('vendor_id') storeId: string,
    @Query() query: AppealQueryDto,
  ) {
    return {
      success: true,
      ...(await this.policyService.listAppealsByStore(storeId, query)),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('appeals/:id')
  @ApiOperation({ summary: 'Get appeal detail' })
  @ApiParam({ name: 'id', type: String })
  async getAppeal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('vendor_id') storeId: string,
  ) {
    const appeal = await this.policyService.getAppeal(id);
    if (appeal.store_id !== storeId) {
      throw new Error('Appeal not found');
    }
    return {
      success: true,
      data: appeal,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Policy Rules (Read-only for vendors) ──────────────────────

  @Get('rules')
  @ApiOperation({ summary: 'List active policy rules' })
  async listActiveRules() {
    const rules = await this.policyService.getActiveRules();
    return {
      success: true,
      data: rules,
      timestamp: new Date().toISOString(),
    };
  }
}
