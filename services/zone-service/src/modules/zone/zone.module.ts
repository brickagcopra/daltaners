import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { DeliveryZoneEntity } from './entities/zone.entity';
import { ZoneController } from './zone.controller';
import { ZoneService } from './zone.service';
import { ZoneRepository } from './zone.repository';
import { ZoneSeedService } from './zone-seed.service';
import { JwtStrategy } from '../../config/jwt.strategy';
import { RedisService } from '../../config/redis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryZoneEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
  ],
  controllers: [ZoneController],
  providers: [
    ZoneService,
    ZoneRepository,
    ZoneSeedService,
    JwtStrategy,
    RedisService,
  ],
  exports: [ZoneService, ZoneRepository],
})
export class ZoneModule {}
