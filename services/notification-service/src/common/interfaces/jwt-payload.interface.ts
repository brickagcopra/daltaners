export interface JwtPayload {
  sub: string;
  role: 'customer' | 'vendor_owner' | 'vendor_staff' | 'delivery' | 'admin';
  permissions: string[];
  vendor_id: string | null;
  jti: string;
}
