import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

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

  // Connect Kafka microservice for consuming events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'loyalty-service',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      },
      consumer: {
        groupId: 'daltaners-loyalty-service-group',
      },
    },
  });

  const config = new DocumentBuilder()
    .setTitle('Daltaners Loyalty Service')
    .setDescription('Loyalty & Rewards Program — Points, Tiers, Redemption API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.startAllMicroservices();

  const port = process.env.LOYALTY_SERVICE_PORT || 3017;
  await app.listen(port);
  console.log(`Loyalty Service running on port ${port}`);
}
bootstrap();
