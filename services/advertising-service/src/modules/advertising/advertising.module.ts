import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import {
  CampaignEntity,
  CampaignProductEntity,
  AdImpressionEntity,
  AdClickEntity,
} from './entities';

import { AdvertisingRepository } from './advertising.repository';
import { AdvertisingService } from './advertising.service';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { JwtStrategy } from './jwt.strategy';

import { VendorCampaignController } from './vendor-campaign.controller';
import { AdminAdvertisingController } from './admin-advertising.controller';
import { PublicAdController } from './public-ad.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      CampaignEntity,
      CampaignProductEntity,
      AdImpressionEntity,
      AdClickEntity,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'daltaners_jwt_secret_dev'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [
    VendorCampaignController,
    AdminAdvertisingController,
    PublicAdController,
  ],
  providers: [
    AdvertisingService,
    AdvertisingRepository,
    RedisService,
    KafkaProducerService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AdvertisingService],
})
export class AdvertisingModule {}
