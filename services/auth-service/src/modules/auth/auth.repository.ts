import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull, Not, ILike } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';

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

  async findAllUsersAdmin(query: AdminUserQueryDto): Promise<{ users: UserEntity[]; total: number }> {
    const { page = 1, limit = 20, search, role, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.userRepo.createQueryBuilder('u');

    if (search) {
      qb.andWhere('(u.email ILIKE :search OR u.phone ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (role) {
      qb.andWhere('u.role = :role', { role });
    }

    if (status === 'active') {
      qb.andWhere('u.is_active = TRUE');
    } else if (status === 'inactive') {
      qb.andWhere('u.is_active = FALSE');
    }

    qb.orderBy('u.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();
    return { users, total };
  }

  async findVendorProfile(userId: string): Promise<{
    first_name: string;
    last_name: string;
    vendor_id: string | null;
    avatar_url: string | null;
  } | null> {
    const result = await this.userRepo.query(
      `SELECT
         p.first_name,
         p.last_name,
         p.avatar_url,
         COALESCE(s.id, ss.store_id) AS vendor_id
       FROM users.profiles p
       LEFT JOIN vendors.stores s ON s.owner_id = p.id
       LEFT JOIN vendors.store_staff ss ON ss.user_id = p.id AND ss.is_active = TRUE
       WHERE p.id = $1
       LIMIT 1`,
      [userId],
    );
    return result.length > 0 ? result[0] : null;
  }
}
