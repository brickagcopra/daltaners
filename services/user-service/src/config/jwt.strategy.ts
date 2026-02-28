import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from './redis.service';

interface JwtPayload {
  sub: string;
  role: string;
  permissions: string[];
  vendor_id: string | null;
  jti: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'daltaners_jwt_secret_dev'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.jti) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const isBlacklisted = await this.redisService.isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: payload.sub,
      role: payload.role,
      permissions: payload.permissions || [],
      vendor_id: payload.vendor_id,
      jti: payload.jti,
    };
  }
}
