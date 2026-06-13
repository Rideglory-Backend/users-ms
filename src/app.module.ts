import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule, ClsService } from 'nestjs-cls';
import { UsersModule } from './users/users.module';
import { ClsRpcInterceptor, pinoHttpOptions } from '@rideglory/common-lib';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ClsService],
      useFactory: (cls: ClsService) =>
        pinoHttpOptions('UsersMicroservice', () => cls.get<string>('traceId')),
    }),
    ClsModule.forRoot({ global: true, middleware: { mount: false } }),
    UsersModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      inject: [ClsService],
      useFactory: (cls: ClsService) => new ClsRpcInterceptor(cls),
    },
  ],
})
export class AppModule {}
