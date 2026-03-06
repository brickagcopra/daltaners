import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderController } from './order.controller';
import { AdminOrderController } from './admin.controller';
import { CouponController } from './coupon.controller';
import { AdminCouponController } from './admin-coupon.controller';
import { VendorCouponController } from './vendor-coupon.controller';
import { VendorAnalyticsController } from './vendor-analytics.controller';
import { ReturnController } from './return.controller';
import { VendorReturnController } from './vendor-return.controller';
import { AdminReturnController } from './admin-return.controller';
import { DisputeController } from './dispute.controller';
import { VendorDisputeController } from './vendor-dispute.controller';
import { AdminDisputeController } from './admin-dispute.controller';
import { PrescriptionController } from './prescription.controller';
import { VendorPrescriptionController } from './vendor-prescription.controller';
import { OrderConsumer } from './order.consumer';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';
import { CouponService } from './coupon.service';
import { CouponRepository } from './coupon.repository';
import { ReturnService } from './return.service';
import { ReturnRepository } from './return.repository';
import { DisputeService } from './dispute.service';
import { DisputeRepository } from './dispute.repository';
import { PrescriptionService } from './prescription.service';
import { PrescriptionRepository } from './prescription.repository';
import { ZoneClientService } from './zone-client.service';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { JwtStrategy } from '../../config/jwt.strategy';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { CouponEntity } from './entities/coupon.entity';
import { CouponUsageEntity } from './entities/coupon-usage.entity';
import { ReturnRequestEntity } from './entities/return-request.entity';
import { ReturnItemEntity } from './entities/return-item.entity';
import { DisputeEntity } from './entities/dispute.entity';
import { DisputeMessageEntity } from './entities/dispute-message.entity';
import { PrescriptionUploadEntity } from './entities/prescription-upload.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      CouponEntity,
      CouponUsageEntity,
      ReturnRequestEntity,
      ReturnItemEntity,
      DisputeEntity,
      DisputeMessageEntity,
      PrescriptionUploadEntity,
    ]),
    ConfigModule,
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
    OrderController,
    AdminOrderController,
    VendorAnalyticsController,
    CouponController,
    AdminCouponController,
    VendorCouponController,
    ReturnController,
    VendorReturnController,
    AdminReturnController,
    DisputeController,
    VendorDisputeController,
    AdminDisputeController,
    PrescriptionController,
    VendorPrescriptionController,
    OrderConsumer,
  ],
  providers: [
    OrderService,
    OrderRepository,
    CouponService,
    CouponRepository,
    ReturnService,
    ReturnRepository,
    DisputeService,
    DisputeRepository,
    PrescriptionService,
    PrescriptionRepository,
    ZoneClientService,
    RedisService,
    KafkaProducerService,
    JwtStrategy,
  ],
  exports: [OrderService, CouponService, ReturnService, DisputeService, PrescriptionService, RedisService],
})
export class OrderModule {}
