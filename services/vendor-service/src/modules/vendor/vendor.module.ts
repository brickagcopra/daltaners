import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { Store } from './entities/store.entity';
import { StoreLocation } from './entities/store-location.entity';
import { OperatingHours } from './entities/operating-hours.entity';
import { StoreStaff } from './entities/store-staff.entity';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { VendorRepository } from './vendor.repository';
import { KafkaProducerService } from './kafka-producer.service';
import { JwtStrategy } from '../../config/jwt.strategy';
import { RedisService } from '../../config/redis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, StoreLocation, OperatingHours, StoreStaff]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
  ],
  controllers: [VendorController],
  providers: [
    VendorService,
    VendorRepository,
    KafkaProducerService,
    JwtStrategy,
    RedisService,
  ],
  exports: [VendorService],
})
export class VendorModule {}
