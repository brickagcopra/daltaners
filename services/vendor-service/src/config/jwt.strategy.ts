import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

export interface JwtPayload {
  sub: string;
  role: string;
  permissions: string[];
  vendor_id: string | null;
  jti: string;
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
    const isBlacklisted = await this.redisService.get(`auth:blacklist:${payload.jti}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: payload.sub,
      role: payload.role,
      permissions: payload.permissions,
      vendor_id: payload.vendor_id,
      jti: payload.jti,
    };
  }
}
