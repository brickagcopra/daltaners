import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull, Not } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
  ) {}

  async createUser(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findUserByPhone(phone: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { phone } });
  }

  async findUserById(id: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async updateUser(id: string, data: Partial<UserEntity>): Promise<void> {
    await this.userRepo.update(id, data);
  }

  async findUserByResetTokenHash(tokenHash: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: {
        password_reset_token: tokenHash,
        password_reset_expires_at: MoreThan(new Date()),
      },
    });
  }

  async createRefreshToken(data: Partial<RefreshTokenEntity>): Promise<RefreshTokenEntity> {
    const token = this.refreshTokenRepo.create(data);
    return this.refreshTokenRepo.save(token);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return this.refreshTokenRepo.findOne({
      where: { token_hash: tokenHash, revoked_at: undefined },
      relations: ['user'],
    });
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.refreshTokenRepo.update(id, { revoked_at: new Date() });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update()
      .set({ revoked_at: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }
}
