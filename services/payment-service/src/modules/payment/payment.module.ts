import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentConsumer } from './payment.consumer';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { JwtStrategy } from './jwt.strategy';
import { TransactionEntity } from './entities/transaction.entity';
import { VendorSettlementEntity } from './entities/vendor-settlement.entity';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity, VendorSettlementEntity, WalletEntity, WalletTransactionEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'change-this-to-a-strong-secret-in-production'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [PaymentController, PaymentConsumer],
  providers: [
    PaymentService,
    PaymentRepository,
    RedisService,
    KafkaProducerService,
    JwtStrategy,
  ],
  exports: [PaymentService, RedisService],
})
export class PaymentModule {}
