import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configLoads, configValidationSchema } from './config';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { PrismaModule } from './database/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './core/health/health.module';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      load: configLoads,
      validationSchema: configValidationSchema,
    }),

    // Structured Pino Logger
    LoggerModule,

    // Global Database Module (Prisma)
    PrismaModule,

    // Redis backed BullMQ Async Queue Engine
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host') || 'localhost',
          port: configService.get<number>('redis.port') || 6379,
          password: configService.get<string>('redis.password') || undefined,
          db: configService.get<number>('redis.db') || 0,
        },
      }),
    }),

    // Global Rate Limiter pointing to Redis
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000, // 1 second
            limit: 5,  // 5 requests per second
          },
          {
            name: 'medium',
            ttl: 60000, // 1 minute
            limit: 100, // 100 requests per minute
          },
        ],
        storage: new ThrottlerStorageRedisService({
          host: configService.get<string>('redis.host') || 'localhost',
          port: configService.get<number>('redis.port') || 6379,
          password: configService.get<string>('redis.password') || undefined,
          db: configService.get<number>('redis.db') || 0,
        }),
      }),
    }),

    // Bounded Context Domains
    AuthModule,
    UserModule,
    NotificationModule,
    AuditModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
export { ConfigService };
