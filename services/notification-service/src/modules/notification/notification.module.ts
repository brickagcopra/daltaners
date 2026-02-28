import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import { NotificationConsumer } from './notification.consumer';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { NotificationGateway } from './notification.gateway';
import { CassandraService } from './cassandra.service';
import { RedisService } from './redis.service';
import { PushNotificationService } from './channels/push.service';
import { EmailService } from './channels/email.service';
import { SmsService } from './channels/sms.service';
import { JwtStrategy } from '../../config/jwt.strategy';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationPreferenceEntity]),
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
  controllers: [NotificationController, NotificationConsumer],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationGateway,
    CassandraService,
    RedisService,
    PushNotificationService,
    EmailService,
    SmsService,
    JwtStrategy,
  ],
  exports: [NotificationService, NotificationGateway, CassandraService, RedisService],
})
export class NotificationModule {}
