import { UserRole } from './enums';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  permissions: string[];
  vendor_id: string | null;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface RegisterRequest {
  email?: string;
  phone?: string;
  password: string;
  role?: UserRole;
  first_name: string;
  last_name: string;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface OtpRequest {
  phone: string;
}

export interface OtpVerifyRequest {
  phone: string;
  otp: string;
}
