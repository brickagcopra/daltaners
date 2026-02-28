import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { DeliveryPersonnelEntity } from './entities/delivery-personnel.entity';
import { DeliveryEntity } from './entities/delivery.entity';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryRepository } from './delivery.repository';
import { LocationService } from './location.service';
import { DeliveryGateway } from './delivery.gateway';
import { DeliveryConsumer } from './delivery.consumer';
import { RedisService } from '../../config/redis.service';
import { JwtStrategy } from '../../config/jwt.strategy';
import { KafkaProducerService } from '../../config/kafka-producer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryPersonnelEntity, DeliveryEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [DeliveryController, DeliveryConsumer],
  providers: [
    DeliveryService,
    DeliveryRepository,
    LocationService,
    DeliveryGateway,
    RedisService,
    JwtStrategy,
    KafkaProducerService,
  ],
  exports: [DeliveryService, LocationService],
})
export class DeliveryModule {}
