import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthService } from '../auth.service';
import { AuthRepository } from '../auth.repository';
import { RedisService } from '../redis.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { UserEntity } from '../entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let authRepo: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockUser: Partial<UserEntity> = {
    id: 'user-uuid-1',
    email: 'test@daltaners.com',
    phone: '+639171234567',
    password_hash: 'hashed_password_123',
    role: 'customer',
    is_verified: false,
    is_active: true,
    mfa_enabled: false,
    mfa_secret: null,
    last_login_at: null,
    password_reset_token: null,
    password_reset_expires_at: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  };

  const mockRefreshToken: Partial<RefreshTokenEntity> = {
    id: 'token-uuid-1',
    user_id: 'user-uuid-1',
    token_hash: 'hashed_refresh_token',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    revoked_at: null,
    created_at: new Date(),
    user: mockUser as UserEntity,
  };

  beforeEach(async () => {
    const mockAuthRepo = {
      createUser: jest.fn(),
      findUserByEmail: jest.fn(),
      findUserByPhone: jest.fn(),
      findUserById: jest.fn(),
      updateUser: jest.fn(),
      findUserByResetTokenHash: jest.fn(),
      createRefreshToken: jest.fn(),
      findRefreshTokenByHash: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllUserRefreshTokens: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(() => 'mock-access-token'),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          OTP_TTL_SECONDS: '300',
          NODE_ENV: 'test',
        };
        return config[key] || defaultValue || '';
      }),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockKafkaProducer = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepo = module.get(AuthRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    redisService = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user with email', async () => {
      const dto = {
        email: 'new@daltaners.com',
        password: 'SecurePass123!',
        first_name: 'Juan',
        last_name: 'Dela Cruz',
      };

      authRepo.findUserByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      authRepo.createUser.mockResolvedValue({
        ...mockUser,
        email: dto.email,
      } as UserEntity);
      authRepo.createRefreshToken.mockResolvedValue(mockRefreshToken as RefreshTokenEntity);

      const result = await service.register(dto as any);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(dto.email);
      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBeDefined();
      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBe(900);
      expect(authRepo.findUserByEmail).toHaveBeenCalledWith(dto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
    });

    it('should register a new user with phone number', async () => {
      const dto = {
        phone: '+639171234567',
        password: 'SecurePass123!',
        first_name: 'Maria',
        last_name: 'Santos',
      };

      authRepo.findUserByPhone.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      authRepo.createUser.mockResolvedValue({
        ...mockUser,
        email: null,
        phone: dto.phone,
      } as UserEntity);
      authRepo.createRefreshToken.mockResolvedValue(mockRefreshToken as RefreshTokenEntity);

      const result = await service.register(dto as any);

      expect(result.user).toBeDefined();
      expect(result.user.phone).toBe(dto.phone);
      expect(authRepo.findUserByPhone).toHaveBeenCalledWith(dto.phone);
    });

    it('should throw BadRequestException when neither email nor phone provided', async () => {
      const dto = {
        password: 'SecurePass123!',
        first_name: 'Test',
        last_name: 'User',
      };

      await expect(service.register(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.register(dto as any)).rejects.toThrow(
        'Either email or phone is required',
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto = {
        email: 'existing@daltaners.com',
        password: 'SecurePass123!',
        first_name: 'Test',
        last_name: 'User',
      };

      authRepo.findUserByEmail.mockResolvedValue(mockUser as UserEntity);

      await expect(service.register(dto as any)).rejects.toThrow(ConflictException);
      await expect(service.register(dto as any)).rejects.toThrow('Email already registered');
    });

    it('should throw ConflictException when phone already exists', async () => {
      const dto = {
        phone: '+639171234567',
        password: 'SecurePass123!',
        first_name: 'Test',
        last_name: 'User',
      };

      authRepo.findUserByPhone.mockResolvedValue(mockUser as UserEntity);

      await expect(service.register(dto as any)).rejects.toThrow(ConflictException);
      await expect(service.register(dto as any)).rejects.toThrow('Phone already registered');
    });

    it('should set default role to customer when not specified', async () => {
      const dto = {
        email: 'new@daltaners.com',
        password: 'SecurePass123!',
        first_name: 'Test',
        last_name: 'User',
      };

      authRepo.findUserByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      authRepo.createUser.mockResolvedValue(mockUser as UserEntity);
      authRepo.createRefreshToken.mockResolvedValue(mockRefreshToken as RefreshTokenEntity);

      await service.register(dto as any);

      expect(authRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'customer' }),
      );
    });

    it('should not include password_hash in returned user', async () => {
      const dto = {
        email: 'new@daltaners.com',
        password: 'SecurePass123!',
        first_name: 'Test',
        last_name: 'User',
      };

      authRepo.findUserByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      authRepo.createUser.mockResolvedValue(mockUser as UserEntity);
      authRepo.createRefreshToken.mockResolvedValue(mockRefreshToken as RefreshTokenEntity);

      const result = await service.register(dto as any);

      expect((result.user as any).password_hash).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should login user with valid email and password', async () => {
      const dto = { email: 'test@daltaners.com', password: 'SecurePass123!' };

      authRepo.findUserByEmail.mockResolvedValue(mockUser as UserEntity);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      authRepo.updateUser.mockResolvedValue(undefined);
      authRepo.createRefreshToken.mockResolvedValue(mockRefreshToken as RefreshTokenEntity);

      const result = await service.login(dto as any);

      expect(result.user.email).toBe(dto.email);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(authRepo.updateUser).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ last_login_at: expect.any(Date) }),
      );
    });

    it('should login user with valid phone and password', async () => {
      const dto = { phone: '+639171234567', password: 'SecurePass123!' };

      authRepo.findUserByPhone.mockResolvedValue(mockUser as UserEntity);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      authRepo.updateUser.mockResolvedValue(undefined);
      authRepo.createRefreshToken.mockResolvedValue(mockRefreshToken as RefreshTokenEntity);

      const result = await service.login(dto as any);

      expect(result.user).toBeDefined();
      expect(authRepo.findUserByPhone).toHaveBeenCalledWith(dto.phone);
    });

    it('should throw BadRequestException when neither email nor phone provided', async () => {
      const dto = { password: 'SecurePass123!' };

      await expect(service.login(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const dto = { email: 'nonexistent@daltaners.com', password: 'SecurePass123!' };

      authRepo.findUserByEmail.mockResolvedValue(null);

      await expect(service.login(dto as any)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto as any)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const dto = { email: 'test@daltaners.com', password: 'WrongPassword!' };

      authRepo.findUserByEmail.mockResolvedValue(mockUser as UserEntity);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto as any)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto as any)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when account is deactivated', async () => {
      const dto = { email: 'test@daltaners.com', password: 'SecurePass123!' };
      const inactiveUser = { ...mockUser, is_active: false };

      authRepo.findUserByEmail.mockResolvedValue(inactiveUser as UserEntity);

      await expect(service.login(dto as any)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto as any)).rejects.toThrow('Account is deactivated');
    });

    it('should throw UnauthorizedException when user has no password_hash', async () => {
      const dto = { email: 'test@daltaners.com', password: 'SecurePass123!' };
      const noPasswordUser = { ...mockUser, password_hash: null };

      authRepo.findUserByEmail.mockResolvedValue(noPasswordUser as UserEntity);

      await expect(service.login(dto as any)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto as any)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshTokens', () => {
    it('should issue new tokens with a valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

      authRepo.findRefreshTokenByHash.mockResolvedValue(mockRefreshToken as RefreshTokenEntity);
      authRepo.revokeRefreshToken.mockResolvedValue(undefined);
      authRepo.createRefreshToken.mockResolvedValue(mockRefreshToken as RefreshTokenEntity);

      const result = await service.refreshTokens(refreshToken);

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBeDefined();
      expect(authRepo.revokeRefreshToken).toHaveBeenCalledWith(mockRefreshToken.id);
    });

    it('should throw UnauthorizedException when refresh token not found', async () => {
      authRepo.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token is revoked', async () => {
      const revokedToken = { ...mockRefreshToken, revoked_at: new Date() };
      authRepo.findRefreshTokenByHash.mockResolvedValue(revokedToken as RefreshTokenEntity);

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      const expiredToken = {
        ...mockRefreshToken,
        expires_at: new Date('2020-01-01'),
        revoked_at: null,
      };
      authRepo.findRefreshTokenByHash.mockResolvedValue(expiredToken as RefreshTokenEntity);

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        'Refresh token expired',
      );
    });

    it('should throw UnauthorizedException when user account is deactivated', async () => {
      const tokenWithInactiveUser = {
        ...mockRefreshToken,
        revoked_at: null,
        user: { ...mockUser, is_active: false },
      };
      authRepo.findRefreshTokenByHash.mockResolvedValue(
        tokenWithInactiveUser as RefreshTokenEntity,
      );
      authRepo.revokeRefreshToken.mockResolvedValue(undefined);

      await expect(service.refreshTokens('some-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens('some-token')).rejects.toThrow(
        'Account is deactivated',
      );
    });
  });

  describe('logout', () => {
    it('should blacklist JTI in Redis and revoke all refresh tokens', async () => {
      const jti = 'token-jti-123';
      const userId = 'user-uuid-1';

      redisService.set.mockResolvedValue(undefined);
      authRepo.revokeAllUserRefreshTokens.mockResolvedValue(undefined);

      await service.logout(jti, userId);

      expect(redisService.set).toHaveBeenCalledWith(`blacklist:${jti}`, '1', 900);
      expect(authRepo.revokeAllUserRefreshTokens).toHaveBeenCalledWith(userId);
    });
  });

  describe('requestOtp', () => {
    it('should generate and store OTP in Redis', async () => {
      const phone = '+639171234567';
      redisService.set.mockResolvedValue(undefined);

      const result = await service.requestOtp(phone);

      expect(result.message).toBe('OTP sent successfully');
      expect(result.expires_in).toBe(300);
      expect(redisService.set).toHaveBeenCalledWith(
        `otp:${phone}`,
        expect.stringMatching(/^\d{6}$/),
        300,
      );
    });

    it('should use configurable OTP TTL', async () => {
      const phone = '+639171234567';
      redisService.set.mockResolvedValue(undefined);
      (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'OTP_TTL_SECONDS') return '600';
        return defaultValue || '';
      });

      const result = await service.requestOtp(phone);

      expect(result.expires_in).toBe(600);
    });
  });

  describe('verifyOtp', () => {
    it('should verify valid OTP and mark user as verified', async () => {
      const phone = '+639171234567';
      const otp = '123456';

      redisService.get.mockResolvedValue('123456');
      redisService.del.mockResolvedValue(undefined);
      authRepo.findUserByPhone.mockResolvedValue(mockUser as UserEntity);
      authRepo.updateUser.mockResolvedValue(undefined);

      const result = await service.verifyOtp(phone, otp);

      expect(result.verified).toBe(true);
      expect(redisService.del).toHaveBeenCalledWith(`otp:${phone}`);
      expect(authRepo.updateUser).toHaveBeenCalledWith(mockUser.id, { is_verified: true });
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      redisService.get.mockResolvedValue('654321');

      await expect(service.verifyOtp('+639171234567', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyOtp('+639171234567', '123456')).rejects.toThrow(
        'Invalid or expired OTP',
      );
    });

    it('should throw UnauthorizedException for expired OTP', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(service.verifyOtp('+639171234567', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should still verify even if user not found by phone', async () => {
      const phone = '+639999999999';
      const otp = '123456';

      redisService.get.mockResolvedValue('123456');
      redisService.del.mockResolvedValue(undefined);
      authRepo.findUserByPhone.mockResolvedValue(null);

      const result = await service.verifyOtp(phone, otp);

      expect(result.verified).toBe(true);
      expect(authRepo.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('should return sanitized user profile', async () => {
      authRepo.findUserById.mockResolvedValue(mockUser as UserEntity);

      const result = await service.getMe('user-uuid-1');

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.role).toBe(mockUser.role);
      expect((result as any).password_hash).toBeUndefined();
      expect((result as any).password_reset_token).toBeUndefined();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      authRepo.findUserById.mockResolvedValue(null);

      await expect(service.getMe('nonexistent-uuid')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.getMe('nonexistent-uuid')).rejects.toThrow('User not found');
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate reset token and store hash in DB', async () => {
      const dto = { email: 'test@daltaners.com' };

      authRepo.findUserByEmail.mockResolvedValue(mockUser as UserEntity);
      authRepo.updateUser.mockResolvedValue(undefined);

      const result = await service.requestPasswordReset(dto as any);

      expect(result.message).toBe(
        'If an account exists, a password reset link has been sent',
      );
      expect(authRepo.updateUser).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          password_reset_token: expect.any(String),
          password_reset_expires_at: expect.any(Date),
        }),
      );
    });

    it('should return success even when user not found (prevent enumeration)', async () => {
      const dto = { email: 'nonexistent@daltaners.com' };

      authRepo.findUserByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset(dto as any);

      expect(result.message).toBe(
        'If an account exists, a password reset link has been sent',
      );
      expect(authRepo.updateUser).not.toHaveBeenCalled();
    });

    it('should return success when user is inactive (prevent enumeration)', async () => {
      const dto = { email: 'test@daltaners.com' };
      const inactiveUser = { ...mockUser, is_active: false };

      authRepo.findUserByEmail.mockResolvedValue(inactiveUser as UserEntity);

      const result = await service.requestPasswordReset(dto as any);

      expect(result.message).toBe(
        'If an account exists, a password reset link has been sent',
      );
      expect(authRepo.updateUser).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when neither email nor phone provided', async () => {
      await expect(service.requestPasswordReset({} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should lookup user by phone when phone is provided', async () => {
      const dto = { phone: '+639171234567' };

      authRepo.findUserByPhone.mockResolvedValue(mockUser as UserEntity);
      authRepo.updateUser.mockResolvedValue(undefined);

      await service.requestPasswordReset(dto as any);

      expect(authRepo.findUserByPhone).toHaveBeenCalledWith(dto.phone);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const dto = { token: 'valid-reset-token', new_password: 'NewSecure123!' };

      authRepo.findUserByResetTokenHash.mockResolvedValue(mockUser as UserEntity);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      authRepo.updateUser.mockResolvedValue(undefined);
      authRepo.revokeAllUserRefreshTokens.mockResolvedValue(undefined);

      const result = await service.resetPassword(dto as any);

      expect(result.message).toBe('Password has been reset successfully');
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.new_password, 12);
      expect(authRepo.updateUser).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          password_hash: 'new_hashed_password',
          password_reset_token: null,
          password_reset_expires_at: null,
        }),
      );
      expect(authRepo.revokeAllUserRefreshTokens).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw BadRequestException for invalid/expired token', async () => {
      const dto = { token: 'invalid-token', new_password: 'NewSecure123!' };

      authRepo.findUserByResetTokenHash.mockResolvedValue(null);

      await expect(service.resetPassword(dto as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(dto as any)).rejects.toThrow(
        'Invalid or expired reset token',
      );
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is valid', async () => {
      const dto = {
        current_password: 'OldPass123!',
        new_password: 'NewPass456!',
      };

      authRepo.findUserById.mockResolvedValue(mockUser as UserEntity);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      authRepo.updateUser.mockResolvedValue(undefined);
      authRepo.revokeAllUserRefreshTokens.mockResolvedValue(undefined);

      const result = await service.changePassword('user-uuid-1', dto as any);

      expect(result.message).toBe('Password changed successfully');
      expect(bcrypt.compare).toHaveBeenCalledWith(dto.current_password, mockUser.password_hash);
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.new_password, 12);
      expect(authRepo.revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      authRepo.findUserById.mockResolvedValue(null);

      await expect(
        service.changePassword('bad-uuid', { current_password: 'a', new_password: 'b' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      authRepo.findUserById.mockResolvedValue(mockUser as UserEntity);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-uuid-1', {
          current_password: 'WrongPass!',
          new_password: 'NewPass456!',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.changePassword('user-uuid-1', {
          current_password: 'WrongPass!',
          new_password: 'NewPass456!',
        } as any),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw UnauthorizedException when user has no password (social login)', async () => {
      const socialUser = { ...mockUser, password_hash: null };
      authRepo.findUserById.mockResolvedValue(socialUser as UserEntity);

      await expect(
        service.changePassword('user-uuid-1', {
          current_password: 'a',
          new_password: 'b',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true when JTI is blacklisted in Redis', async () => {
      redisService.get.mockResolvedValue('1');

      const result = await service.isTokenBlacklisted('blacklisted-jti');

      expect(result).toBe(true);
      expect(redisService.get).toHaveBeenCalledWith('blacklist:blacklisted-jti');
    });

    it('should return false when JTI is not blacklisted', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted('valid-jti');

      expect(result).toBe(false);
    });
  });
});
