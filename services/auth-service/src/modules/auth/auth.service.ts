import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto, ChangePasswordDto } from './dto/password-reset.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { RedisService } from './redis.service';
import { KafkaProducerService, KAFKA_TOPICS } from './kafka-producer.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    if (dto.email) {
      const existing = await this.authRepo.findUserByEmail(dto.email);
      if (existing) throw new ConflictException('Email already registered');
    }

    if (dto.phone) {
      const existing = await this.authRepo.findUserByPhone(dto.phone);
      if (existing) throw new ConflictException('Phone already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = await this.authRepo.createUser({
      email: dto.email || null,
      phone: dto.phone || null,
      password_hash: passwordHash,
      role: dto.role || 'customer',
      is_verified: false,
      is_active: true,
    });

    const tokens = await this.generateTokens(user.id, user.role);

    this.logger.log(`User registered: ${user.id} (${user.role})`);

    // Publish user.registered event for user-service profile creation
    await this.kafkaProducer.publish(
      KAFKA_TOPICS.USERS_EVENTS,
      'registered',
      {
        user_id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      user.id,
    );

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    const user = dto.email
      ? await this.authRepo.findUserByEmail(dto.email)
      : await this.authRepo.findUserByPhone(dto.phone!);

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for user: ${user.id}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.authRepo.updateUser(user.id, { last_login_at: new Date() });

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async vendorLogin(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    const user = dto.email
      ? await this.authRepo.findUserByEmail(dto.email)
      : await this.authRepo.findUserByPhone(dto.phone!);

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (!['vendor_owner', 'vendor_staff'].includes(user.role)) {
      throw new UnauthorizedException('This login is for vendor accounts only');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      this.logger.warn(`Failed vendor login attempt for user: ${user.id}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.authRepo.updateUser(user.id, { last_login_at: new Date() });

    const tokens = await this.generateTokens(user.id, user.role);

    // Enrich with profile + vendor data
    const profile = await this.authRepo.findVendorProfile(user.id);

    return {
      user: {
        id: user.id,
        email: user.email ?? '',
        firstName: profile?.first_name ?? '',
        lastName: profile?.last_name ?? '',
        role: user.role as 'vendor_owner' | 'vendor_staff',
        permissions: [],
        vendorId: profile?.vendor_id ?? '',
        avatarUrl: profile?.avatar_url ?? null,
      },
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.authRepo.findRefreshTokenByHash(tokenHash);

    if (!storedToken || storedToken.revoked_at) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke old, issue new
    await this.authRepo.revokeRefreshToken(storedToken.id);

    const user = storedToken.user;
    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.generateTokens(user.id, user.role);
  }

  async logout(jti: string, userId: string) {
    // Blacklist the JTI in Redis (TTL = access token expiry)
    const ttl = 15 * 60; // 15 minutes
    await this.redisService.set(`blacklist:${jti}`, '1', ttl);

    // Revoke all refresh tokens
    await this.authRepo.revokeAllUserRefreshTokens(userId);
  }

  async requestOtp(phone: string) {
    const otp = this.generateOtp();
    const ttl = parseInt(this.configService.get('OTP_TTL_SECONDS', '300'), 10);
    await this.redisService.set(`otp:${phone}`, otp, ttl);
    this.logger.log(`OTP generated for ${phone.slice(0, 4)}****`);
    // In production: send via Twilio SMS
    return { message: 'OTP sent successfully', expires_in: ttl };
  }

  async verifyOtp(phone: string, otp: string) {
    const storedOtp = await this.redisService.get(`otp:${phone}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.redisService.del(`otp:${phone}`);

    // Mark phone as verified
    const user = await this.authRepo.findUserByPhone(phone);
    if (user) {
      await this.authRepo.updateUser(user.id, { is_verified: true });
    }

    return { verified: true };
  }

  async getMe(userId: string) {
    const user = await this.authRepo.findUserById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return this.sanitizeUser(user);
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    const user = dto.email
      ? await this.authRepo.findUserByEmail(dto.email)
      : await this.authRepo.findUserByPhone(dto.phone!);

    // Always return success to prevent user enumeration
    if (!user || !user.is_active) {
      return { message: 'If an account exists, a password reset link has been sent' };
    }

    const rawToken = randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.authRepo.updateUser(user.id, {
      password_reset_token: tokenHash,
      password_reset_expires_at: expiresAt,
    });

    this.logger.log(`Password reset requested for user: ${user.id}`);

    // In production: send email/SMS with the reset link containing rawToken
    return {
      message: 'If an account exists, a password reset link has been sent',
      // Only include token in development for testing
      ...(this.configService.get('NODE_ENV') === 'development' && { reset_token: rawToken }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const user = await this.authRepo.findUserByResetTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.new_password, this.BCRYPT_ROUNDS);

    await this.authRepo.updateUser(user.id, {
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires_at: null,
    });

    // Revoke all refresh tokens to force re-login
    await this.authRepo.revokeAllUserRefreshTokens(user.id);

    this.logger.log(`Password reset completed for user: ${user.id}`);

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.authRepo.findUserById(userId);
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.new_password, this.BCRYPT_ROUNDS);

    await this.authRepo.updateUser(userId, { password_hash: passwordHash });

    // Revoke all refresh tokens to force re-login on other devices
    await this.authRepo.revokeAllUserRefreshTokens(userId);

    this.logger.log(`Password changed for user: ${userId}`);

    return { message: 'Password changed successfully' };
  }

  // ── Admin methods ──────────────────────────────────────────────

  async adminListUsers(query: AdminUserQueryDto) {
    const { page = 1, limit = 20 } = query;
    const { users, total } = await this.authRepo.findAllUsersAdmin(query);

    return {
      data: users.map((u) => this.sanitizeUser(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminGetUser(id: string) {
    const user = await this.authRepo.findUserById(id);
    if (!user) throw new BadRequestException('User not found');
    return this.sanitizeUser(user);
  }

  async adminCreateUser(dto: AdminCreateUserDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    if (dto.email) {
      const existing = await this.authRepo.findUserByEmail(dto.email);
      if (existing) throw new ConflictException('Email already registered');
    }

    if (dto.phone) {
      const existing = await this.authRepo.findUserByPhone(dto.phone);
      if (existing) throw new ConflictException('Phone already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = await this.authRepo.createUser({
      email: dto.email || null,
      phone: dto.phone || null,
      password_hash: passwordHash,
      role: dto.role,
      is_verified: false,
      is_active: true,
    });

    this.logger.log(`Admin created user: ${user.id} (${user.role})`);

    try {
      await this.kafkaProducer.publish(
        KAFKA_TOPICS.USERS_EVENTS,
        'registered',
        {
          user_id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          first_name: dto.first_name,
          last_name: dto.last_name,
        },
        user.id,
      );
    } catch {
      this.logger.warn(`Failed to publish user.registered event for ${user.id}`);
    }

    return this.sanitizeUser(user);
  }

  async adminUpdateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.authRepo.findUserById(id);
    if (!user) throw new BadRequestException('User not found');

    const updateData: Record<string, unknown> = {};

    if (dto.email !== undefined) {
      if (dto.email !== user.email) {
        const existing = await this.authRepo.findUserByEmail(dto.email);
        if (existing && existing.id !== id) {
          throw new ConflictException('Email already in use');
        }
      }
      updateData.email = dto.email;
    }

    if (dto.phone !== undefined) {
      if (dto.phone !== user.phone) {
        const existing = await this.authRepo.findUserByPhone(dto.phone);
        if (existing && existing.id !== id) {
          throw new ConflictException('Phone already in use');
        }
      }
      updateData.phone = dto.phone;
    }

    if (dto.role !== undefined) {
      updateData.role = dto.role;
    }

    if (dto.is_active !== undefined) {
      updateData.is_active = dto.is_active;
    }

    if (Object.keys(updateData).length > 0) {
      await this.authRepo.updateUser(id, updateData);
    }

    this.logger.log(`Admin updated user: ${id}`);

    const updated = await this.authRepo.findUserById(id);
    return this.sanitizeUser(updated!);
  }

  async adminResetPassword(id: string) {
    const user = await this.authRepo.findUserById(id);
    if (!user) throw new BadRequestException('User not found');

    const newPassword = randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    await this.authRepo.updateUser(id, {
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires_at: null,
    });

    await this.authRepo.revokeAllUserRefreshTokens(id);

    this.logger.log(`Admin reset password for user: ${id}`);

    return { temporary_password: newPassword };
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redisService.get(`blacklist:${jti}`);
    return result !== null;
  }

  private async generateTokens(userId: string, role: string) {
    const jti = uuidv4();
    const accessToken = this.jwtService.sign(
      { sub: userId, role, permissions: [], vendor_id: null, jti },
      { expiresIn: '15m' },
    );

    const refreshTokenRaw = randomBytes(40).toString('hex');
    const refreshTokenHash = this.hashToken(refreshTokenRaw);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.authRepo.createRefreshToken({
      user_id: userId,
      token_hash: refreshTokenHash,
      expires_at: expiresAt,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshTokenRaw,
      expires_in: 900,
      token_type: 'Bearer' as const,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateOtp(): string {
    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += Math.floor(Math.random() * 10).toString();
    }
    return otp;
  }

  private sanitizeUser(user: { id: string; email: string | null; phone: string | null; role: string; is_verified: boolean; is_active: boolean; mfa_enabled: boolean; last_login_at: Date | null; created_at: Date }) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_verified: user.is_verified,
      is_active: user.is_active,
      mfa_enabled: user.mfa_enabled,
      last_login_at: user.last_login_at?.toISOString() || null,
      created_at: user.created_at.toISOString(),
    };
  }
}
