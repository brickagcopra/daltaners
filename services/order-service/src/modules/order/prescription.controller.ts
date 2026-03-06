import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrescriptionService } from './prescription.service';
import { CreatePrescriptionUploadDto } from './dto/create-prescription-upload.dto';
import { VerifyPrescriptionDto } from './dto/verify-prescription.dto';
import { PrescriptionQueryDto } from './dto/prescription-query.dto';

@ApiTags('prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
@UseGuards(AuthGuard('jwt'))
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Post()
  async upload(@Request() req: any, @Body() dto: CreatePrescriptionUploadDto) {
    const prescription = await this.prescriptionService.upload(req.user.sub, dto);
    return {
      success: true,
      data: prescription,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async getMyPrescriptions(@Request() req: any, @Query() query: PrescriptionQueryDto) {
    const result = await this.prescriptionService.getMyPrescriptions(req.user.sub, query);
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
    const prescription = await this.prescriptionService.getPrescriptionDetail(
      id,
      req.user.sub,
      req.user.role,
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
    // Only admin and vendor roles can verify
    const role = req.user.role;
    if (!['admin', 'vendor_owner', 'vendor_staff'].includes(role)) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only pharmacists and admins can verify prescriptions',
          statusCode: 403,
        },
        timestamp: new Date().toISOString(),
      };
    }

    const prescription = await this.prescriptionService.verify(id, req.user.sub, dto);
    return {
      success: true,
      data: prescription,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/pending')
  async getPending(@Request() req: any, @Query() query: PrescriptionQueryDto) {
    const role = req.user.role;
    if (!['admin', 'vendor_owner', 'vendor_staff'].includes(role)) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
          statusCode: 403,
        },
        timestamp: new Date().toISOString(),
      };
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
}
