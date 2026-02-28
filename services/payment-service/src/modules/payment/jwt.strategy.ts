import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from './redis.service';

interface JwtPayload {
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
      secretOrKey: configService.get('JWT_SECRET', 'change-this-to-a-strong-secret-in-production'),
    });
  }

  async validate(payload: JwtPayload) {
    const isBlacklisted = await this.redisService.get(`blacklist:${payload.jti}`);
    if (isBlacklisted !== null) {
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
