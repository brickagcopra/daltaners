import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProfileEntity } from './entities/profile.entity';
import { AddressEntity } from './entities/address.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(ProfileEntity)
    private readonly profileRepo: Repository<ProfileEntity>,
    @InjectRepository(AddressEntity)
    private readonly addressRepo: Repository<AddressEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createProfile(data: {
    id: string;
    first_name?: string;
    last_name?: string;
  }): Promise<ProfileEntity> {
    const profile = this.profileRepo.create({
      id: data.id,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      display_name: data.first_name && data.last_name
        ? `${data.first_name} ${data.last_name}`
        : data.first_name || null,
      locale: 'en',
      timezone: 'Asia/Manila',
      preferences: {},
    });
    return this.profileRepo.save(profile);
  }

  async findProfileById(id: string): Promise<ProfileEntity | null> {
    return this.profileRepo.findOne({ where: { id } });
  }

  async updateProfile(
    id: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileEntity | null> {
    const updateData: Partial<ProfileEntity> = {};

    if (dto.first_name !== undefined) updateData.first_name = dto.first_name;
    if (dto.last_name !== undefined) updateData.last_name = dto.last_name;
    if (dto.display_name !== undefined) updateData.display_name = dto.display_name;
    if (dto.date_of_birth !== undefined) updateData.date_of_birth = dto.date_of_birth;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.locale !== undefined) updateData.locale = dto.locale;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.dietary_preferences !== undefined) updateData.dietary_preferences = dto.dietary_preferences;
    if (dto.allergens !== undefined) updateData.allergens = dto.allergens;

    await this.profileRepo.update(id, updateData as any);
    return this.findProfileById(id);
  }

  async createAddress(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressEntity> {
    const address = this.addressRepo.create({
      user_id: userId,
      label: dto.label,
      address_line1: dto.address_line1,
      address_line2: dto.address_line2 || null,
      barangay: dto.barangay,
      city: dto.city,
      province: dto.province,
      region: dto.region,
      postal_code: dto.postal_code,
      latitude: dto.latitude,
      longitude: dto.longitude,
      is_default: dto.is_default || false,
      delivery_instructions: dto.delivery_instructions || null,
    });
    return this.addressRepo.save(address);
  }

  async findAddressesByUserId(userId: string): Promise<AddressEntity[]> {
    return this.addressRepo.find({
      where: { user_id: userId },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });
  }

  async findAddressById(
    id: string,
    userId: string,
  ): Promise<AddressEntity | null> {
    return this.addressRepo.findOne({
      where: { id, user_id: userId },
    });
  }

  async updateAddress(
    id: string,
    userId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressEntity | null> {
    const address = await this.findAddressById(id, userId);
    if (!address) return null;

    const updateData: Partial<AddressEntity> = {};

    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.address_line1 !== undefined) updateData.address_line1 = dto.address_line1;
    if (dto.address_line2 !== undefined) updateData.address_line2 = dto.address_line2;
    if (dto.barangay !== undefined) updateData.barangay = dto.barangay;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.province !== undefined) updateData.province = dto.province;
    if (dto.region !== undefined) updateData.region = dto.region;
    if (dto.postal_code !== undefined) updateData.postal_code = dto.postal_code;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.is_default !== undefined) updateData.is_default = dto.is_default;
    if (dto.delivery_instructions !== undefined) updateData.delivery_instructions = dto.delivery_instructions;

    await this.addressRepo.update({ id, user_id: userId }, updateData);
    return this.findAddressById(id, userId);
  }

  async deleteAddress(id: string, userId: string): Promise<boolean> {
    const result = await this.addressRepo.delete({ id, user_id: userId });
    return (result.affected ?? 0) > 0;
  }

  async setDefaultAddress(id: string, userId: string): Promise<AddressEntity | null> {
    const address = await this.findAddressById(id, userId);
    if (!address) return null;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        AddressEntity,
        { user_id: userId, is_default: true },
        { is_default: false },
      );

      await queryRunner.manager.update(
        AddressEntity,
        { id, user_id: userId },
        { is_default: true },
      );

      await queryRunner.commitTransaction();

      return this.findAddressById(id, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to set default address: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
