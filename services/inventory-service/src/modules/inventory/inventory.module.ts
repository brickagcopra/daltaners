import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StockEntity } from './entities/stock.entity';
import { StockMovementEntity } from './entities/stock-movement.entity';
import { InventoryController } from './inventory.controller';
import { AdminInventoryController } from './admin.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { RedisService } from './redis.service';
import { StockCacheService } from './stock-cache.service';
import { KafkaProducerService } from './kafka-producer.service';
import { InventoryConsumer } from './inventory.consumer';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockEntity, StockMovementEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'daltaners_jwt_secret_dev'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [InventoryController, AdminInventoryController],
  providers: [
    InventoryService,
    InventoryRepository,
    RedisService,
    StockCacheService,
    KafkaProducerService,
    InventoryConsumer,
    JwtStrategy,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
