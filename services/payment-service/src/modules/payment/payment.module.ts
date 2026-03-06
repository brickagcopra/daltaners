import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentController } from './payment.controller';
import { AdminPaymentController } from './admin.controller';
import { AdminTaxController } from './admin-tax.controller';
import { PaymentConsumer } from './payment.consumer';
import { PaymentService } from './payment.service';
import { SettlementService } from './settlement.service';
import { TaxService } from './tax.service';
import { SettlementScheduler } from './settlement.scheduler';
import { PaymentRepository } from './payment.repository';
import { TaxRepository } from './tax.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { JwtStrategy } from './jwt.strategy';
import { TransactionEntity } from './entities/transaction.entity';
import { VendorSettlementEntity } from './entities/vendor-settlement.entity';
import { SettlementItemEntity } from './entities/settlement-item.entity';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { TaxConfigurationEntity } from './entities/tax-configuration.entity';
import { TaxInvoiceEntity } from './entities/tax-invoice.entity';
import { TaxReportEntity } from './entities/tax-report.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      TransactionEntity,
      VendorSettlementEntity,
      SettlementItemEntity,
      WalletEntity,
      WalletTransactionEntity,
      TaxConfigurationEntity,
      TaxInvoiceEntity,
      TaxReportEntity,
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
  controllers: [PaymentController, AdminPaymentController, AdminTaxController, PaymentConsumer],
  providers: [
    PaymentService,
    SettlementService,
    TaxService,
    SettlementScheduler,
    PaymentRepository,
    TaxRepository,
    RedisService,
    KafkaProducerService,
    JwtStrategy,
  ],
  exports: [PaymentService, SettlementService, TaxService, RedisService],
})
export class PaymentModule {}
