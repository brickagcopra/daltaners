import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrescriptionService } from '../prescription.service';
import { PrescriptionRepository } from '../prescription.repository';
import { KafkaProducerService } from '../kafka-producer.service';
import { PrescriptionUploadEntity } from '../entities/prescription-upload.entity';

describe('PrescriptionService', () => {
  let service: PrescriptionService;
  let repo: jest.Mocked<PrescriptionRepository>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockPrescription: Partial<PrescriptionUploadEntity> = {
    id: 'rx-uuid-1',
    customer_id: 'customer-uuid-1',
    image_url: 'https://cdn.example.com/rx/img1.jpg',
    image_hash: 'abc123hash',
    status: 'pending',
    verified_by: null,
    verification_notes: null,
    doctor_name: 'Dr. Santos',
    doctor_license: 'PRC-12345',
    prescription_date: new Date('2026-02-01'),
    expires_at: new Date('2027-02-01'),
    created_at: new Date('2026-02-15T10:00:00Z'),
    updated_at: new Date('2026-02-15T10:00:00Z'),
  };

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCustomer: jest.fn(),
      findByStatus: jest.fn(),
      findVerifiedById: jest.fn(),
      findByHash: jest.fn(),
      updateStatus: jest.fn(),
    };

    const mockKafkaProducer = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionService,
        { provide: PrescriptionRepository, useValue: mockRepo },
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
      ],
    }).compile();

    service = module.get<PrescriptionService>(PrescriptionService);
    repo = module.get(PrescriptionRepository);
    kafkaProducer = module.get(KafkaProducerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    const uploadDto = {
      image_url: 'https://cdn.example.com/rx/img1.jpg',
      image_hash: 'abc123hash',
      doctor_name: 'Dr. Santos',
      doctor_license: 'PRC-12345',
      prescription_date: '2026-02-01',
      expires_at: '2027-02-01T00:00:00Z',
    };

    it('should create a new prescription upload', async () => {
      repo.findByHash.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.upload('customer-uuid-1', uploadDto);

      expect(result).toEqual(mockPrescription);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: 'customer-uuid-1',
          image_url: uploadDto.image_url,
          image_hash: uploadDto.image_hash,
          status: 'pending',
        }),
      );
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.prescriptions.events',
        'com.daltaners.prescriptions.uploaded',
        expect.objectContaining({ prescription_id: mockPrescription.id }),
        mockPrescription.id,
      );
    });

    it('should reject duplicate upload by hash', async () => {
      repo.findByHash.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);

      await expect(service.upload('customer-uuid-1', uploadDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should allow re-upload if previous was rejected', async () => {
      const rejectedRx = { ...mockPrescription, status: 'rejected' };
      repo.findByHash.mockResolvedValue(rejectedRx as PrescriptionUploadEntity);
      repo.create.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);

      const result = await service.upload('customer-uuid-1', uploadDto);
      expect(result).toEqual(mockPrescription);
      expect(repo.create).toHaveBeenCalled();
    });

    it('should allow re-upload if previous was expired', async () => {
      const expiredRx = { ...mockPrescription, status: 'expired' };
      repo.findByHash.mockResolvedValue(expiredRx as PrescriptionUploadEntity);
      repo.create.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);

      const result = await service.upload('customer-uuid-1', uploadDto);
      expect(result).toEqual(mockPrescription);
    });
  });

  describe('verify', () => {
    it('should verify a pending prescription', async () => {
      const verified = { ...mockPrescription, status: 'verified', verified_by: 'verifier-uuid' };
      repo.findById.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);
      repo.updateStatus.mockResolvedValue(verified as PrescriptionUploadEntity);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.verify('rx-uuid-1', 'verifier-uuid', {
        status: 'verified',
        verification_notes: 'Valid prescription',
      });

      expect(result.status).toBe('verified');
      expect(repo.updateStatus).toHaveBeenCalledWith('rx-uuid-1', 'verified', {
        verified_by: 'verifier-uuid',
        verification_notes: 'Valid prescription',
      });
      expect(kafkaProducer.publish).toHaveBeenCalledWith(
        'daltaners.prescriptions.events',
        'com.daltaners.prescriptions.verified',
        expect.objectContaining({ status: 'verified' }),
        verified.id,
      );
    });

    it('should reject a pending prescription', async () => {
      const rejected = { ...mockPrescription, status: 'rejected', verified_by: 'verifier-uuid' };
      repo.findById.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);
      repo.updateStatus.mockResolvedValue(rejected as PrescriptionUploadEntity);
      kafkaProducer.publish.mockResolvedValue(undefined);

      const result = await service.verify('rx-uuid-1', 'verifier-uuid', {
        status: 'rejected',
        verification_notes: 'Illegible',
      });

      expect(result.status).toBe('rejected');
    });

    it('should throw NotFoundException when prescription not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.verify('nonexistent', 'verifier-uuid', { status: 'verified' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when prescription is already verified', async () => {
      const verified = { ...mockPrescription, status: 'verified' };
      repo.findById.mockResolvedValue(verified as PrescriptionUploadEntity);

      await expect(
        service.verify('rx-uuid-1', 'verifier-uuid', { status: 'verified' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when prescription is already rejected', async () => {
      const rejected = { ...mockPrescription, status: 'rejected' };
      repo.findById.mockResolvedValue(rejected as PrescriptionUploadEntity);

      await expect(
        service.verify('rx-uuid-1', 'verifier-uuid', { status: 'verified' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyPrescriptions', () => {
    it('should return paginated prescriptions for customer', async () => {
      const result = {
        items: [mockPrescription as PrescriptionUploadEntity],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      repo.findByCustomer.mockResolvedValue(result);

      const response = await service.getMyPrescriptions('customer-uuid-1', {
        page: 1,
        limit: 20,
      });

      expect(response).toEqual(result);
      expect(repo.findByCustomer).toHaveBeenCalledWith('customer-uuid-1', 1, 20, undefined);
    });

    it('should filter by status', async () => {
      const result = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      repo.findByCustomer.mockResolvedValue(result);

      await service.getMyPrescriptions('customer-uuid-1', {
        page: 1,
        limit: 20,
        status: 'verified',
      });

      expect(repo.findByCustomer).toHaveBeenCalledWith('customer-uuid-1', 1, 20, 'verified');
    });
  });

  describe('getPrescriptionDetail', () => {
    it('should return prescription for its owner', async () => {
      repo.findById.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);

      const result = await service.getPrescriptionDetail(
        'rx-uuid-1',
        'customer-uuid-1',
        'customer',
      );

      expect(result).toEqual(mockPrescription);
    });

    it('should throw ForbiddenException when customer accesses another customers prescription', async () => {
      repo.findById.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);

      await expect(
        service.getPrescriptionDetail('rx-uuid-1', 'other-customer', 'customer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to access any prescription', async () => {
      repo.findById.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);

      const result = await service.getPrescriptionDetail('rx-uuid-1', 'admin-uuid', 'admin');
      expect(result).toEqual(mockPrescription);
    });

    it('should allow vendor to access any prescription', async () => {
      repo.findById.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);

      const result = await service.getPrescriptionDetail(
        'rx-uuid-1',
        'vendor-uuid',
        'vendor_owner',
      );
      expect(result).toEqual(mockPrescription);
    });

    it('should throw NotFoundException when prescription not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.getPrescriptionDetail('nonexistent', 'customer-uuid-1', 'customer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateForOrder', () => {
    it('should pass for verified non-expired prescription owned by customer', async () => {
      const verifiedRx = {
        ...mockPrescription,
        status: 'verified',
        expires_at: new Date(Date.now() + 86400000), // tomorrow
      };
      repo.findById.mockResolvedValue(verifiedRx as PrescriptionUploadEntity);

      await expect(
        service.validateForOrder('rx-uuid-1', 'customer-uuid-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw BadRequestException when prescription not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.validateForOrder('nonexistent', 'customer-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when prescription belongs to another customer', async () => {
      const verifiedRx = { ...mockPrescription, status: 'verified' };
      repo.findById.mockResolvedValue(verifiedRx as PrescriptionUploadEntity);

      await expect(
        service.validateForOrder('rx-uuid-1', 'other-customer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when prescription is pending', async () => {
      repo.findById.mockResolvedValue(mockPrescription as PrescriptionUploadEntity);

      await expect(
        service.validateForOrder('rx-uuid-1', 'customer-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validateForOrder('rx-uuid-1', 'customer-uuid-1'),
      ).rejects.toThrow("Only verified prescriptions");
    });

    it('should throw BadRequestException when prescription is rejected', async () => {
      const rejectedRx = { ...mockPrescription, status: 'rejected' };
      repo.findById.mockResolvedValue(rejectedRx as PrescriptionUploadEntity);

      await expect(
        service.validateForOrder('rx-uuid-1', 'customer-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException and auto-expire when prescription is expired', async () => {
      const expiredRx = {
        ...mockPrescription,
        status: 'verified',
        expires_at: new Date(Date.now() - 86400000), // yesterday
      };
      repo.findById.mockResolvedValue(expiredRx as PrescriptionUploadEntity);
      repo.updateStatus.mockResolvedValue(null);

      await expect(
        service.validateForOrder('rx-uuid-1', 'customer-uuid-1'),
      ).rejects.toThrow('expired');
      expect(repo.updateStatus).toHaveBeenCalledWith('rx-uuid-1', 'expired');
    });

    it('should pass when prescription has no expiry date', async () => {
      const verifiedRx = {
        ...mockPrescription,
        status: 'verified',
        expires_at: null,
      };
      repo.findById.mockResolvedValue(verifiedRx as PrescriptionUploadEntity);

      await expect(
        service.validateForOrder('rx-uuid-1', 'customer-uuid-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getPendingPrescriptions', () => {
    it('should return pending prescriptions', async () => {
      const result = {
        items: [mockPrescription as PrescriptionUploadEntity],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      repo.findByStatus.mockResolvedValue(result);

      const response = await service.getPendingPrescriptions({ page: 1, limit: 20 });

      expect(response).toEqual(result);
      expect(repo.findByStatus).toHaveBeenCalledWith('pending', 1, 20);
    });
  });
});
