import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { ProfileEntity } from './entities/profile.entity';
import { AddressEntity } from './entities/address.entity';
import { UserController } from './user.controller';
import { UserConsumer } from './user.consumer';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { JwtStrategy } from '../../config/jwt.strategy';
import { RedisService } from '../../config/redis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileEntity, AddressEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
  ],
  controllers: [UserController, UserConsumer],
  providers: [UserService, UserRepository, JwtStrategy, RedisService],
  exports: [UserService],
})
export class UserModule {}
