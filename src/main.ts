import './instrument';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { envs } from './config/envs';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { RpcAllExceptionsFilter, TracingDeserializer } from '@rideglory/common-lib';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: envs.port,
      deserializer: new TracingDeserializer(),
    },
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.useGlobalFilters(new RpcAllExceptionsFilter('users-ms'));

  app.get(Logger).log('Users MS is running on port ' + envs.port);

  await app.listen();
}
bootstrap();
