import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { ConversationEntity } from './entities/conversation.entity';
import { ConversationParticipantEntity } from './entities/conversation-participant.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRepository } from './chat.repository';
import { ChatGateway } from './chat.gateway';
import { CassandraService } from './cassandra.service';
import { RedisService } from './redis.service';
import { KafkaProducerService } from './kafka-producer.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationEntity, ConversationParticipantEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatRepository,
    ChatGateway,
    CassandraService,
    RedisService,
    KafkaProducerService,
    JwtStrategy,
  ],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
