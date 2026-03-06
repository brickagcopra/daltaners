import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Store } from './entities/store.entity';
import { StoreLocation } from './entities/store-location.entity';
import { OperatingHours } from './entities/operating-hours.entity';
import { StoreStaff } from './entities/store-staff.entity';
import { PerformanceMetrics } from './entities/performance-metrics.entity';
import { PerformanceHistory } from './entities/performance-history.entity';
import { PolicyRule } from './entities/policy-rule.entity';
import { PolicyViolation } from './entities/policy-violation.entity';
import { Appeal } from './entities/appeal.entity';
import { VendorController } from './vendor.controller';
import { AdminVendorController } from './admin.controller';
import { PerformanceController } from './performance.controller';
import { AdminPerformanceController } from './admin-performance.controller';
import { VendorPolicyController } from './vendor-policy.controller';
import { AdminPolicyController } from './admin-policy.controller';
import { PerformanceSubscriber } from './subscribers/performance.subscriber';
import { VendorService } from './vendor.service';
import { VendorRepository } from './vendor.repository';
import { PerformanceService } from './performance.service';
import { PerformanceRepository } from './performance.repository';
import { PolicyService } from './policy.service';
import { PolicyRepository } from './policy.repository';
import { KafkaProducerService } from './kafka-producer.service';
import { JwtStrategy } from '../../config/jwt.strategy';
import { RedisService } from '../../config/redis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Store,
      StoreLocation,
      OperatingHours,
      StoreStaff,
      PerformanceMetrics,
      PerformanceHistory,
      PolicyRule,
      PolicyViolation,
      Appeal,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    VendorController,
    AdminVendorController,
    PerformanceController,
    AdminPerformanceController,
    VendorPolicyController,
    AdminPolicyController,
    PerformanceSubscriber,
  ],
  providers: [
    VendorService,
    VendorRepository,
    PerformanceService,
    PerformanceRepository,
    PolicyService,
    PolicyRepository,
    KafkaProducerService,
    JwtStrategy,
    RedisService,
  ],
  exports: [VendorService, PerformanceService, PolicyService],
})
export class VendorModule {}
