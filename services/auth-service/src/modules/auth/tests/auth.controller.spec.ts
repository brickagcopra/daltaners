import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUserResponse = {
    id: 'user-uuid-1',
    email: 'test@daltaners.com',
    phone: '+639171234567',
    role: 'customer',
    is_verified: false,
    is_active: true,
    mfa_enabled: false,
    last_login_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  const mockTokens = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 900,
    token_type: 'Bearer' as const,
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      requestOtp: jest.fn(),
      verifyOtp: jest.fn(),
      getMe: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register and return result', async () => {
      const dto = {
        email: 'new@daltaners.com',
        password: 'SecurePass123!',
        first_name: 'Juan',
        last_name: 'Dela Cruz',
      };
      const expected = { user: mockUserResponse, ...mockTokens };

      authService.register.mockResolvedValue(expected);

      const result = await controller.register(dto as any);

      expect(result).toEqual(expected);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login and return user with tokens', async () => {
      const dto = { email: 'test@daltaners.com', password: 'SecurePass123!' };
      const expected = { user: mockUserResponse, ...mockTokens };

      authService.login.mockResolvedValue(expected);

      const result = await controller.login(dto as any);

      expect(result).toEqual(expected);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with the refresh_token', async () => {
      const dto = { refresh_token: 'old-refresh-token' };

      authService.refreshTokens.mockResolvedValue(mockTokens);

      const result = await controller.refresh(dto as any);

      expect(result).toEqual(mockTokens);
      expect(authService.refreshTokens).toHaveBeenCalledWith(dto.refresh_token);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return success message', async () => {
      const user = { id: 'user-uuid-1', jti: 'token-jti-123' };

      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(user);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(authService.logout).toHaveBeenCalledWith(user.jti, user.id);
    });
  });

  describe('requestOtp', () => {
    it('should call authService.requestOtp with phone number', async () => {
      const dto = { phone: '+639171234567' };
      const expected = { message: 'OTP sent successfully', expires_in: 300 };

      authService.requestOtp.mockResolvedValue(expected);

      const result = await controller.requestOtp(dto as any);

      expect(result).toEqual(expected);
      expect(authService.requestOtp).toHaveBeenCalledWith(dto.phone);
    });
  });

  describe('verifyOtp', () => {
    it('should call authService.verifyOtp with phone and otp', async () => {
      const dto = { phone: '+639171234567', otp: '123456' };
      const expected = { verified: true };

      authService.verifyOtp.mockResolvedValue(expected);

      const result = await controller.verifyOtp(dto as any);

      expect(result).toEqual(expected);
      expect(authService.verifyOtp).toHaveBeenCalledWith(dto.phone, dto.otp);
    });
  });

  describe('getMe', () => {
    it('should call authService.getMe with userId', async () => {
      authService.getMe.mockResolvedValue(mockUserResponse);

      const result = await controller.getMe('user-uuid-1');

      expect(result).toEqual(mockUserResponse);
      expect(authService.getMe).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('requestPasswordReset', () => {
    it('should call authService.requestPasswordReset', async () => {
      const dto = { email: 'test@daltaners.com' };
      const expected = {
        message: 'If an account exists, a password reset link has been sent',
      };

      authService.requestPasswordReset.mockResolvedValue(expected);

      const result = await controller.requestPasswordReset(dto as any);

      expect(result).toEqual(expected);
      expect(authService.requestPasswordReset).toHaveBeenCalledWith(dto);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword', async () => {
      const dto = { token: 'reset-token', new_password: 'NewPass123!' };
      const expected = { message: 'Password has been reset successfully' };

      authService.resetPassword.mockResolvedValue(expected);

      const result = await controller.resetPassword(dto as any);

      expect(result).toEqual(expected);
      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword with userId and dto', async () => {
      const dto = {
        current_password: 'OldPass123!',
        new_password: 'NewPass456!',
      };
      const expected = { message: 'Password changed successfully' };

      authService.changePassword.mockResolvedValue(expected);

      const result = await controller.changePassword('user-uuid-1', dto as any);

      expect(result).toEqual(expected);
      expect(authService.changePassword).toHaveBeenCalledWith('user-uuid-1', dto);
    });
  });
});
