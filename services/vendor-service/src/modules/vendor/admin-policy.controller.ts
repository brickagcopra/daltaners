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
import {
  CreatePolicyRuleDto,
  UpdatePolicyRuleDto,
  PolicyRuleQueryDto,
} from './dto/policy-rule.dto';
import {
  CreateViolationDto,
  AdminViolationQueryDto,
  ApplyPenaltyDto,
  ResolveViolationDto,
  DismissViolationDto,
} from './dto/policy-violation.dto';
import { AdminAppealQueryDto, ReviewAppealDto, DenyAppealDto } from './dto/appeal.dto';

@ApiTags('Admin - Policy Enforcement')
@ApiBearerAuth()
@Controller('vendors/admin/policy')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPolicyController {
  constructor(private readonly policyService: PolicyService) {}

  // ── Policy Rules ──────────────────────────────────────────────

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a policy rule' })
  async createRule(@Body() dto: CreatePolicyRuleDto) {
    const rule = await this.policyService.createRule(dto);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('rules')
  @ApiOperation({ summary: 'List policy rules with filters' })
  async listRules(@Query() query: PolicyRuleQueryDto) {
    return {
      success: true,
      ...(await this.policyService.listRules(query)),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get policy rule detail' })
  @ApiParam({ name: 'id', type: String })
  async getRule(@Param('id', ParseUUIDPipe) id: string) {
    const rule = await this.policyService.getRuleById(id);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update a policy rule' })
  @ApiParam({ name: 'id', type: String })
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyRuleDto,
  ) {
    const rule = await this.policyService.updateRule(id, dto);
    return {
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Violations ────────────────────────────────────────────────

  @Post('violations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a policy violation against a vendor' })
  async createViolation(
    @Body() dto: CreateViolationDto,
    @CurrentUser('id') adminId: string,
  ) {
    const violation = await this.policyService.createViolation(dto, adminId);
    return {
      success: true,
      data: violation,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('violations')
  @ApiOperation({ summary: 'List all violations with filters' })
  async listViolations(@Query() query: AdminViolationQueryDto) {
    return {
      success: true,
      ...(await this.policyService.listAllViolations(query)),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('violations/stats')
  @ApiOperation({ summary: 'Get violation statistics' })
  async getViolationStats() {
    const stats = await this.policyService.getViolationStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('violations/:id')
  @ApiOperation({ summary: 'Get violation detail' })
  @ApiParam({ name: 'id', type: String })
  async getViolation(@Param('id', ParseUUIDPipe) id: string) {
    const violation = await this.policyService.getViolation(id);
    return {
      success: true,
      data: violation,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('violations/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark violation as under review' })
  @ApiParam({ name: 'id', type: String })
  async markUnderReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const violation = await this.policyService.markUnderReview(id, adminId);
    return {
      success: true,
      data: violation,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('violations/:id/penalty')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply penalty to a violation' })
  @ApiParam({ name: 'id', type: String })
  async applyPenalty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyPenaltyDto,
    @CurrentUser('id') adminId: string,
  ) {
    const violation = await this.policyService.applyPenalty(id, dto, adminId);
    return {
      success: true,
      data: violation,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('violations/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a violation' })
  @ApiParam({ name: 'id', type: String })
  async resolveViolation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveViolationDto,
    @CurrentUser('id') adminId: string,
  ) {
    const violation = await this.policyService.resolveViolation(id, dto, adminId);
    return {
      success: true,
      data: violation,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('violations/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss a violation' })
  @ApiParam({ name: 'id', type: String })
  async dismissViolation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DismissViolationDto,
    @CurrentUser('id') adminId: string,
  ) {
    const violation = await this.policyService.dismissViolation(id, dto, adminId);
    return {
      success: true,
      data: violation,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Store Violations ──────────────────────────────────────────

  @Get('stores/:storeId/violations')
  @ApiOperation({ summary: 'List violations for a specific store' })
  @ApiParam({ name: 'storeId', type: String })
  async listStoreViolations(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: AdminViolationQueryDto,
  ) {
    return {
      success: true,
      ...(await this.policyService.listViolationsByStore(storeId, query)),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stores/:storeId/summary')
  @ApiOperation({ summary: 'Get violation summary for a store' })
  @ApiParam({ name: 'storeId', type: String })
  async getStoreSummary(@Param('storeId', ParseUUIDPipe) storeId: string) {
    const summary = await this.policyService.getStoreViolationSummary(storeId);
    return {
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Appeals ───────────────────────────────────────────────────

  @Get('appeals')
  @ApiOperation({ summary: 'List all appeals with filters' })
  async listAppeals(@Query() query: AdminAppealQueryDto) {
    return {
      success: true,
      ...(await this.policyService.listAllAppeals(query)),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('appeals/stats')
  @ApiOperation({ summary: 'Get appeal statistics' })
  async getAppealStats() {
    const stats = await this.policyService.getAppealStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('appeals/:id')
  @ApiOperation({ summary: 'Get appeal detail' })
  @ApiParam({ name: 'id', type: String })
  async getAppeal(@Param('id', ParseUUIDPipe) id: string) {
    const appeal = await this.policyService.getAppeal(id);
    return {
      success: true,
      data: appeal,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('appeals/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move appeal to under review' })
  @ApiParam({ name: 'id', type: String })
  async reviewAppeal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const appeal = await this.policyService.reviewAppeal(id, adminId);
    return {
      success: true,
      data: appeal,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('appeals/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an appeal (dismisses the violation)' })
  @ApiParam({ name: 'id', type: String })
  async approveAppeal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewAppealDto,
    @CurrentUser('id') adminId: string,
  ) {
    const appeal = await this.policyService.approveAppeal(id, dto, adminId);
    return {
      success: true,
      data: appeal,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('appeals/:id/deny')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deny an appeal' })
  @ApiParam({ name: 'id', type: String })
  async denyAppeal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DenyAppealDto,
    @CurrentUser('id') adminId: string,
  ) {
    const appeal = await this.policyService.denyAppeal(id, dto, adminId);
    return {
      success: true,
      data: appeal,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('appeals/:id/escalate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Escalate an appeal' })
  @ApiParam({ name: 'id', type: String })
  async escalateAppeal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const appeal = await this.policyService.escalateAppeal(id, adminId);
    return {
      success: true,
      data: appeal,
      timestamp: new Date().toISOString(),
    };
  }
}
