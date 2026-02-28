import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: process.env.NODE_ENV === 'development' ? true : (process.env.CORS_ORIGINS || '').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Daltaners Notification Service')
    .setDescription('Push Notifications, Email, SMS, WebSocket real-time, and Notification Preferences API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

  // Kafka consumer for order events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service-orders',
        brokers: kafkaBrokers,
      },
      consumer: {
        groupId: 'daltaners-notification-service-orders-group',
      },
    },
  });

  // Kafka consumer for delivery status events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service-delivery',
        brokers: kafkaBrokers,
      },
      consumer: {
        groupId: 'daltaners-notification-service-delivery-group',
      },
    },
  });

  // Kafka consumer for delivery GPS location updates
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service-delivery-location',
        brokers: kafkaBrokers,
      },
      consumer: {
        groupId: 'daltaners-notification-service-delivery-location-group',
      },
    },
  });

  // Kafka consumer for payment events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service-payments',
        brokers: kafkaBrokers,
      },
      consumer: {
        groupId: 'daltaners-notification-service-payments-group',
      },
    },
  });

  // Kafka consumer for inventory events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service-inventory',
        brokers: kafkaBrokers,
      },
      consumer: {
        groupId: 'daltaners-notification-service-inventory-group',
      },
    },
  });

  await app.startAllMicroservices();

  const port = process.env.NOTIFICATION_SERVICE_PORT || 3010;
  await app.listen(port);
  console.log(`Notification Service running on port ${port}`);
  console.log(`WebSocket Gateway available at ws://localhost:${port}/notifications`);
}
bootstrap();
