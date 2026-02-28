export interface JwtPayload {
  sub: string;
  role: string;
  permissions: string[];
  vendor_id: string | null;
  jti: string;
  iat: number;
  exp: number;
}
