import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrescriptionRepository } from './prescription.repository';
import { KafkaProducerService } from './kafka-producer.service';
import { PrescriptionUploadEntity } from './entities/prescription-upload.entity';
import { CreatePrescriptionUploadDto } from './dto/create-prescription-upload.dto';
import { VerifyPrescriptionDto } from './dto/verify-prescription.dto';
import { PrescriptionQueryDto } from './dto/prescription-query.dto';

@Injectable()
export class PrescriptionService {
  private readonly logger = new Logger(PrescriptionService.name);

  constructor(
    private readonly prescriptionRepo: PrescriptionRepository,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async upload(
    customerId: string,
    dto: CreatePrescriptionUploadDto,
  ): Promise<PrescriptionUploadEntity> {
    // Check for duplicate upload by hash
    const existing = await this.prescriptionRepo.findByHash(dto.image_hash, customerId);
    if (existing && existing.status !== 'rejected' && existing.status !== 'expired') {
      throw new BadRequestException(
        'This prescription image has already been uploaded. Please use the existing upload or upload a different prescription.',
      );
    }

    const prescription = await this.prescriptionRepo.create({
      customer_id: customerId,
      image_url: dto.image_url,
      image_hash: dto.image_hash,
      status: 'pending',
      doctor_name: dto.doctor_name || null,
      doctor_license: dto.doctor_license || null,
      prescription_date: dto.prescription_date ? new Date(dto.prescription_date) : null,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
    });

    await this.kafkaProducer.publish(
      'daltaners.prescriptions.events',
      'com.daltaners.prescriptions.uploaded',
      {
        prescription_id: prescription.id,
        customer_id: customerId,
        status: 'pending',
      },
      prescription.id,
    );

    this.logger.log(`Prescription uploaded: ${prescription.id} by customer ${customerId}`);
    return prescription;
  }

  async verify(
    prescriptionId: string,
    verifierId: string,
    dto: VerifyPrescriptionDto,
  ): Promise<PrescriptionUploadEntity> {
    const prescription = await this.prescriptionRepo.findById(prescriptionId);
    if (!prescription) {
      throw new NotFoundException(`Prescription ${prescriptionId} not found`);
    }

    if (prescription.status !== 'pending') {
      throw new BadRequestException(
        `Prescription is already '${prescription.status}'. Only pending prescriptions can be verified.`,
      );
    }

    const updated = await this.prescriptionRepo.updateStatus(prescriptionId, dto.status, {
      verified_by: verifierId,
      verification_notes: dto.verification_notes || null,
    });

    if (!updated) {
      throw new NotFoundException(`Prescription ${prescriptionId} not found after update`);
    }

    await this.kafkaProducer.publish(
      'daltaners.prescriptions.events',
      `com.daltaners.prescriptions.${dto.status}`,
      {
        prescription_id: updated.id,
        customer_id: updated.customer_id,
        verified_by: verifierId,
        status: dto.status,
      },
      updated.id,
    );

    this.logger.log(
      `Prescription ${dto.status}: ${prescriptionId} by verifier ${verifierId}`,
    );
    return updated;
  }

  async getMyPrescriptions(
    customerId: string,
    query: PrescriptionQueryDto,
  ) {
    return this.prescriptionRepo.findByCustomer(
      customerId,
      query.page,
      query.limit,
      query.status,
    );
  }

  async getPrescriptionDetail(
    prescriptionId: string,
    userId: string,
    userRole: string,
  ): Promise<PrescriptionUploadEntity> {
    const prescription = await this.prescriptionRepo.findById(prescriptionId);
    if (!prescription) {
      throw new NotFoundException(`Prescription ${prescriptionId} not found`);
    }

    // Customers can only view their own prescriptions
    if (userRole === 'customer' && prescription.customer_id !== userId) {
      throw new ForbiddenException('You do not have access to this prescription');
    }

    return prescription;
  }

  async getPendingPrescriptions(query: PrescriptionQueryDto) {
    return this.prescriptionRepo.findByStatus('pending', query.page, query.limit);
  }

  async getAllPrescriptions(query: PrescriptionQueryDto) {
    if (query.status) {
      return this.prescriptionRepo.findByStatus(query.status, query.page, query.limit);
    }
    return this.prescriptionRepo.findByStatus('pending', query.page, query.limit);
  }

  async validateForOrder(prescriptionId: string, customerId: string): Promise<void> {
    const prescription = await this.prescriptionRepo.findById(prescriptionId);
    if (!prescription) {
      throw new BadRequestException('Prescription not found');
    }

    if (prescription.customer_id !== customerId) {
      throw new ForbiddenException('This prescription does not belong to you');
    }

    if (prescription.status !== 'verified') {
      throw new BadRequestException(
        `Prescription is '${prescription.status}'. Only verified prescriptions can be used for orders.`,
      );
    }

    if (prescription.expires_at && new Date(prescription.expires_at) < new Date()) {
      // Auto-expire
      await this.prescriptionRepo.updateStatus(prescriptionId, 'expired');
      throw new BadRequestException(
        'This prescription has expired. Please upload a new prescription.',
      );
    }
  }
}
