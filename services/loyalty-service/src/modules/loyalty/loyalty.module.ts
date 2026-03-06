import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyConsumer } from './loyalty.consumer';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyRepository } from './loyalty.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { JwtStrategy } from './jwt.strategy';
import { LoyaltyAccountEntity } from './entities/loyalty-account.entity';
import { LoyaltyTransactionEntity } from './entities/loyalty-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoyaltyAccountEntity, LoyaltyTransactionEntity]),
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
  controllers: [LoyaltyController, LoyaltyConsumer],
  providers: [
    LoyaltyService,
    LoyaltyRepository,
    RedisService,
    KafkaProducerService,
    JwtStrategy,
  ],
  exports: [LoyaltyService, RedisService],
})
export class LoyaltyModule {}
