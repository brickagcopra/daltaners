import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { DeliveryPersonnelEntity } from './entities/delivery-personnel.entity';
import { DeliveryEntity } from './entities/delivery.entity';
import { ShippingCarrierEntity } from './entities/shipping-carrier.entity';
import { CarrierServiceEntity } from './entities/carrier-service.entity';
import { ShipmentEntity } from './entities/shipment.entity';
import { DeliveryController } from './delivery.controller';
import { ShippingController } from './shipping.controller';
import { AdminShippingController } from './admin-shipping.controller';
import { DeliveryService } from './delivery.service';
import { ShippingService } from './shipping.service';
import { DeliveryRepository } from './delivery.repository';
import { ShippingRepository } from './shipping.repository';
import { LocationService } from './location.service';
import { DeliveryGateway } from './delivery.gateway';
import { DeliveryConsumer } from './delivery.consumer';
import { RedisService } from '../../config/redis.service';
import { JwtStrategy } from '../../config/jwt.strategy';
import { KafkaProducerService } from '../../config/kafka-producer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryPersonnelEntity,
      DeliveryEntity,
      ShippingCarrierEntity,
      CarrierServiceEntity,
      ShipmentEntity,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    DeliveryController,
    ShippingController,
    AdminShippingController,
    DeliveryConsumer,
  ],
  providers: [
    DeliveryService,
    ShippingService,
    DeliveryRepository,
    ShippingRepository,
    LocationService,
    DeliveryGateway,
    RedisService,
    JwtStrategy,
    KafkaProducerService,
  ],
  exports: [DeliveryService, LocationService, ShippingService],
})
export class DeliveryModule {}
