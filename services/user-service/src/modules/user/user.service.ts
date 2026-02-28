import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ProfileEntity } from './entities/profile.entity';
import { AddressEntity } from './entities/address.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async getProfile(userId: string): Promise<ProfileEntity> {
    const profile = await this.userRepository.findProfileById(userId);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileEntity> {
    const existing = await this.userRepository.findProfileById(userId);
    if (!existing) {
      throw new NotFoundException('Profile not found');
    }

    const updated = await this.userRepository.updateProfile(userId, dto);
    if (!updated) {
      throw new NotFoundException('Profile not found after update');
    }

    this.logger.log(`Profile updated for user: ${userId}`);
    return updated;
  }

  async createAddress(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressEntity> {
    const existingAddresses = await this.userRepository.findAddressesByUserId(userId);

    if (existingAddresses.length >= 10) {
      throw new ForbiddenException('Maximum of 10 addresses allowed per user');
    }

    if (dto.is_default && existingAddresses.some((a) => a.is_default)) {
      await this.userRepository.setDefaultAddress(
        existingAddresses.find((a) => a.is_default)!.id,
        userId,
      );
    }

    const address = await this.userRepository.createAddress(userId, dto);

    if (dto.is_default) {
      await this.userRepository.setDefaultAddress(address.id, userId);
      return (await this.userRepository.findAddressById(address.id, userId))!;
    }

    if (existingAddresses.length === 0) {
      await this.userRepository.setDefaultAddress(address.id, userId);
      return (await this.userRepository.findAddressById(address.id, userId))!;
    }

    this.logger.log(`Address created for user: ${userId}, address: ${address.id}`);
    return address;
  }

  async getAddresses(userId: string): Promise<AddressEntity[]> {
    return this.userRepository.findAddressesByUserId(userId);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressEntity> {
    const updated = await this.userRepository.updateAddress(addressId, userId, dto);
    if (!updated) {
      throw new NotFoundException('Address not found');
    }

    this.logger.log(`Address updated: ${addressId} for user: ${userId}`);
    return updated;
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.userRepository.findAddressById(addressId, userId);
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const wasDefault = address.is_default;
    const deleted = await this.userRepository.deleteAddress(addressId, userId);
    if (!deleted) {
      throw new NotFoundException('Address not found');
    }

    if (wasDefault) {
      const remaining = await this.userRepository.findAddressesByUserId(userId);
      if (remaining.length > 0) {
        await this.userRepository.setDefaultAddress(remaining[0].id, userId);
      }
    }

    this.logger.log(`Address deleted: ${addressId} for user: ${userId}`);
  }

  async setDefaultAddress(
    userId: string,
    addressId: string,
  ): Promise<AddressEntity> {
    const updated = await this.userRepository.setDefaultAddress(addressId, userId);
    if (!updated) {
      throw new NotFoundException('Address not found');
    }

    this.logger.log(`Default address set: ${addressId} for user: ${userId}`);
    return updated;
  }

  async handleUserRegistered(data: {
    user_id: string;
    first_name: string;
    last_name: string;
  }): Promise<void> {
    const existing = await this.userRepository.findProfileById(data.user_id);
    if (existing) {
      this.logger.warn(`Profile already exists for user: ${data.user_id}, skipping creation`);
      return;
    }

    try {
      await this.userRepository.createProfile({
        id: data.user_id,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      this.logger.log(`Skeleton profile created for user: ${data.user_id}`);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        this.logger.warn(`Profile already exists for user: ${data.user_id} (duplicate event)`);
        return;
      }
      this.logger.error(
        `Failed to create profile for user: ${data.user_id}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
