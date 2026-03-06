import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrescriptionService } from './prescription.service';
import { VerifyPrescriptionDto } from './dto/verify-prescription.dto';
import { PrescriptionQueryDto } from './dto/prescription-query.dto';

@ApiTags('vendor-prescriptions')
@ApiBearerAuth()
@Controller('vendor/prescriptions')
@UseGuards(AuthGuard('jwt'))
export class VendorPrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Get('pending')
  async getPending(@Request() req: any, @Query() query: PrescriptionQueryDto) {
    const role = req.user.role;
    if (!['vendor_owner', 'vendor_staff'].includes(role)) {
      throw new ForbiddenException('Only vendor staff can access this endpoint');
    }

    const result = await this.prescriptionService.getPendingPrescriptions(query);
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
  async getDetail(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const role = req.user.role;
    if (!['vendor_owner', 'vendor_staff'].includes(role)) {
      throw new ForbiddenException('Only vendor staff can access this endpoint');
    }

    const prescription = await this.prescriptionService.getPrescriptionDetail(
      id,
      req.user.sub,
      role,
    );
    return {
      success: true,
      data: prescription,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/verify')
  async verify(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyPrescriptionDto,
  ) {
    const role = req.user.role;
    if (!['vendor_owner', 'vendor_staff'].includes(role)) {
      throw new ForbiddenException('Only pharmacists can verify prescriptions');
    }

    const prescription = await this.prescriptionService.verify(id, req.user.sub, dto);
    return {
      success: true,
      data: prescription,
      timestamp: new Date().toISOString(),
    };
  }
}
