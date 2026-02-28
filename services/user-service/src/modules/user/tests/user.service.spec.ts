import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';
import { ProfileEntity } from '../entities/profile.entity';
import { AddressEntity } from '../entities/address.entity';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  const userId = 'user-uuid-1';

  const mockProfile: Partial<ProfileEntity> = {
    id: userId,
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    display_name: 'Juan',
    avatar_url: null,
    date_of_birth: null,
    gender: null,
    locale: 'en',
    timezone: 'Asia/Manila',
    preferences: {},
    dietary_preferences: [],
    allergens: [],
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const mockAddress: Partial<AddressEntity> = {
    id: 'address-uuid-1',
    user_id: userId,
    label: 'Home',
    address_line1: '123 Test St',
    address_line2: null,
    barangay: 'San Isidro',
    city: 'Manila',
    province: 'Metro Manila',
    region: 'NCR',
    postal_code: '1000',
    country: 'PH',
    latitude: 14.5995,
    longitude: 120.9842,
    is_default: true,
    delivery_instructions: null,
    created_at: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            createProfile: jest.fn(),
            findProfileById: jest.fn(),
            updateProfile: jest.fn(),
            createAddress: jest.fn(),
            findAddressesByUserId: jest.fn(),
            findAddressById: jest.fn(),
            updateAddress: jest.fn(),
            deleteAddress: jest.fn(),
            setDefaultAddress: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  // ============================================================
  // Profile
  // ============================================================
  describe('getProfile', () => {
    it('should return profile when found', async () => {
      repository.findProfileById.mockResolvedValue(mockProfile as ProfileEntity);

      const result = await service.getProfile(userId);
      expect(result).toEqual(mockProfile);
    });

    it('should throw NotFoundException when profile not found', async () => {
      repository.findProfileById.mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updated = { ...mockProfile, first_name: 'Updated' };
      repository.findProfileById.mockResolvedValue(mockProfile as ProfileEntity);
      repository.updateProfile.mockResolvedValue(updated as ProfileEntity);

      const result = await service.updateProfile(userId, { first_name: 'Updated' });
      expect(result.first_name).toBe('Updated');
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      repository.findProfileById.mockResolvedValue(null);

      await expect(
        service.updateProfile(userId, { first_name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if update returns null', async () => {
      repository.findProfileById.mockResolvedValue(mockProfile as ProfileEntity);
      repository.updateProfile.mockResolvedValue(null);

      await expect(
        service.updateProfile(userId, { first_name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // Addresses
  // ============================================================
  describe('createAddress', () => {
    const createDto = {
      label: 'Office',
      address_line1: '456 Office Blvd',
      barangay: 'Makati',
      city: 'Makati City',
      province: 'Metro Manila',
      region: 'NCR',
      postal_code: '1200',
      latitude: 14.5547,
      longitude: 121.0244,
    };

    it('should create address successfully', async () => {
      const newAddress = { ...mockAddress, id: 'address-uuid-2', label: 'Office', is_default: false };
      repository.findAddressesByUserId.mockResolvedValue([mockAddress as AddressEntity]);
      repository.createAddress.mockResolvedValue(newAddress as AddressEntity);

      const result = await service.createAddress(userId, createDto);
      expect(result.label).toBe('Office');
    });

    it('should set first address as default automatically', async () => {
      repository.findAddressesByUserId.mockResolvedValue([]); // no existing addresses
      repository.createAddress.mockResolvedValue(mockAddress as AddressEntity);
      repository.setDefaultAddress.mockResolvedValue(mockAddress as AddressEntity);
      repository.findAddressById.mockResolvedValue(mockAddress as AddressEntity);

      await service.createAddress(userId, createDto);

      expect(repository.setDefaultAddress).toHaveBeenCalledWith('address-uuid-1', userId);
    });

    it('should throw ForbiddenException when max 10 addresses reached', async () => {
      const tenAddresses = Array(10)
        .fill(null)
        .map((_, i) => ({ ...mockAddress, id: `addr-${i}` }));
      repository.findAddressesByUserId.mockResolvedValue(tenAddresses as AddressEntity[]);

      await expect(service.createAddress(userId, createDto)).rejects.toThrow(ForbiddenException);
    });

    it('should handle setting new address as default', async () => {
      const existingDefault = { ...mockAddress, is_default: true };
      repository.findAddressesByUserId.mockResolvedValue([existingDefault as AddressEntity]);
      const newAddr = { ...mockAddress, id: 'new-addr', is_default: false };
      repository.createAddress.mockResolvedValue(newAddr as AddressEntity);
      repository.setDefaultAddress.mockResolvedValue(newAddr as AddressEntity);
      repository.findAddressById.mockResolvedValue({ ...newAddr, is_default: true } as AddressEntity);

      await service.createAddress(userId, { ...createDto, is_default: true });

      expect(repository.setDefaultAddress).toHaveBeenCalled();
    });
  });

  describe('getAddresses', () => {
    it('should return all addresses for user', async () => {
      repository.findAddressesByUserId.mockResolvedValue([mockAddress as AddressEntity]);

      const result = await service.getAddresses(userId);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no addresses', async () => {
      repository.findAddressesByUserId.mockResolvedValue([]);

      const result = await service.getAddresses(userId);
      expect(result).toHaveLength(0);
    });
  });

  describe('updateAddress', () => {
    it('should update address successfully', async () => {
      const updated = { ...mockAddress, label: 'Work' };
      repository.updateAddress.mockResolvedValue(updated as AddressEntity);

      const result = await service.updateAddress(userId, 'address-uuid-1', { label: 'Work' });
      expect(result.label).toBe('Work');
    });

    it('should throw NotFoundException if address not found', async () => {
      repository.updateAddress.mockResolvedValue(null);

      await expect(
        service.updateAddress(userId, 'nonexistent', { label: 'Work' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAddress', () => {
    it('should delete address successfully', async () => {
      repository.findAddressById.mockResolvedValue({ ...mockAddress, is_default: false } as AddressEntity);
      repository.deleteAddress.mockResolvedValue(true);

      await expect(service.deleteAddress(userId, 'address-uuid-1')).resolves.toBeUndefined();
    });

    it('should throw NotFoundException if address not found', async () => {
      repository.findAddressById.mockResolvedValue(null);

      await expect(service.deleteAddress(userId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should reassign default when deleting default address', async () => {
      repository.findAddressById.mockResolvedValue(mockAddress as AddressEntity); // is_default = true
      repository.deleteAddress.mockResolvedValue(true);
      const remaining = { ...mockAddress, id: 'address-uuid-2', is_default: false };
      repository.findAddressesByUserId.mockResolvedValue([remaining as AddressEntity]);
      repository.setDefaultAddress.mockResolvedValue(remaining as AddressEntity);

      await service.deleteAddress(userId, 'address-uuid-1');

      expect(repository.setDefaultAddress).toHaveBeenCalledWith('address-uuid-2', userId);
    });

    it('should not set default if no remaining addresses', async () => {
      repository.findAddressById.mockResolvedValue(mockAddress as AddressEntity);
      repository.deleteAddress.mockResolvedValue(true);
      repository.findAddressesByUserId.mockResolvedValue([]);

      await service.deleteAddress(userId, 'address-uuid-1');

      expect(repository.setDefaultAddress).not.toHaveBeenCalled();
    });
  });

  describe('setDefaultAddress', () => {
    it('should set default address', async () => {
      repository.setDefaultAddress.mockResolvedValue(mockAddress as AddressEntity);

      const result = await service.setDefaultAddress(userId, 'address-uuid-1');
      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException if address not found', async () => {
      repository.setDefaultAddress.mockResolvedValue(null);

      await expect(
        service.setDefaultAddress(userId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // Kafka Event Handler
  // ============================================================
  describe('handleUserRegistered', () => {
    const eventData = { user_id: userId, first_name: 'Juan', last_name: 'Dela Cruz' };

    it('should create skeleton profile for new user', async () => {
      repository.findProfileById.mockResolvedValue(null);
      repository.createProfile.mockResolvedValue(mockProfile as ProfileEntity);

      await service.handleUserRegistered(eventData);

      expect(repository.createProfile).toHaveBeenCalledWith({
        id: userId,
        first_name: 'Juan',
        last_name: 'Dela Cruz',
      });
    });

    it('should skip creation if profile already exists', async () => {
      repository.findProfileById.mockResolvedValue(mockProfile as ProfileEntity);

      await service.handleUserRegistered(eventData);

      expect(repository.createProfile).not.toHaveBeenCalled();
    });

    it('should handle duplicate event (error code 23505) gracefully', async () => {
      repository.findProfileById.mockResolvedValue(null);
      const dupError = new Error('Duplicate key') as Error & { code: string };
      dupError.code = '23505';
      repository.createProfile.mockRejectedValue(dupError);

      await expect(service.handleUserRegistered(eventData)).resolves.toBeUndefined();
    });

    it('should rethrow non-duplicate errors', async () => {
      repository.findProfileById.mockResolvedValue(null);
      repository.createProfile.mockRejectedValue(new Error('DB connection failed'));

      await expect(service.handleUserRegistered(eventData)).rejects.toThrow('DB connection failed');
    });
  });
});
