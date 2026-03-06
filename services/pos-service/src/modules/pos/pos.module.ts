import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PosRepository } from './pos.repository';
import { PosService } from './pos.service';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { JwtStrategy } from '../../config/jwt.strategy';
import { TerminalController } from './terminal.controller';
import { ShiftController } from './shift.controller';
import { CashMovementController } from './cash-movement.controller';
import { TransactionController } from './transaction.controller';
import { ReportController } from './report.controller';
import { TerminalEntity } from './entities/terminal.entity';
import { ShiftEntity } from './entities/shift.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionItemEntity } from './entities/transaction-item.entity';
import { CashMovementEntity } from './entities/cash-movement.entity';
import { ReceiptEntity } from './entities/receipt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TerminalEntity,
      ShiftEntity,
      TransactionEntity,
      TransactionItemEntity,
      CashMovementEntity,
      ReceiptEntity,
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
    TerminalController,
    ShiftController,
    CashMovementController,
    TransactionController,
    ReportController,
  ],
  providers: [
    PosService,
    PosRepository,
    RedisService,
    KafkaProducerService,
    JwtStrategy,
  ],
  exports: [PosService, PosRepository, RedisService, KafkaProducerService],
})
export class PosModule {}
