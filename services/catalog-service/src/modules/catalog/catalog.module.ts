import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BrandEntity } from './entities/brand.entity';
import { CategoryEntity } from './entities/category.entity';
import { PriceHistoryEntity } from './entities/price-history.entity';
import { PricingRuleEntity } from './entities/pricing-rule.entity';
import { ProductEntity } from './entities/product.entity';
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductVariantEntity } from './entities/product-variant.entity';
import { ReviewEntity } from './entities/review.entity';
import { ReviewHelpfulEntity } from './entities/review-helpful.entity';
import { CatalogController } from './catalog.controller';
import { BrandController, AdminBrandController } from './brand.controller';
import { PricingController, ProductPricingController } from './pricing.controller';
import { AdminPricingController } from './admin-pricing.controller';
import { ReviewController } from './review.controller';
import { SearchController } from './search.controller';
import { RecommendationController } from './recommendation.controller';
import { CatalogService } from './catalog.service';
import { BrandService } from './brand.service';
import { CsvImportService } from './csv-import.service';
import { PricingService } from './pricing.service';
import { ReviewService } from './review.service';
import { RecommendationService } from './recommendation.service';
import { ElasticsearchService } from './elasticsearch.service';
import { CatalogRepository } from './catalog.repository';
import { BrandRepository } from './brand.repository';
import { PricingRepository } from './pricing.repository';
import { ReviewRepository } from './review.repository';
import { RecommendationRepository } from './recommendation.repository';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { JwtStrategy } from '../../config/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      BrandEntity,
      CategoryEntity,
      PriceHistoryEntity,
      PricingRuleEntity,
      ProductEntity,
      ProductImageEntity,
      ProductVariantEntity,
      ReviewEntity,
      ReviewHelpfulEntity,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'daltaners_jwt_secret_dev'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRY', '15m'),
        },
      }),
    }),
  ],
  controllers: [
    CatalogController,
    BrandController,
    AdminBrandController,
    PricingController,
    ProductPricingController,
    AdminPricingController,
    ReviewController,
    SearchController,
    RecommendationController,
  ],
  providers: [
    CatalogService,
    BrandService,
    CsvImportService,
    PricingService,
    ReviewService,
    RecommendationService,
    ElasticsearchService,
    CatalogRepository,
    BrandRepository,
    PricingRepository,
    ReviewRepository,
    RecommendationRepository,
    RedisService,
    KafkaProducerService,
    JwtStrategy,
  ],
  exports: [CatalogService, BrandService, PricingService, ReviewService, RecommendationService, ElasticsearchService],
})
export class CatalogModule {}
