import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  private readonly redisClient: Redis;

  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Instantiate a quick ioredis connection check
    this.redisClient = new Redis({
      host: this.configService.get<string>('redis.host') || 'localhost',
      port: this.configService.get<number>('redis.port') || 6379,
      password: this.configService.get<string>('redis.password') || undefined,
      db: this.configService.get<number>('redis.db') || 0,
      lazyConnect: true,
    });
  }

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      async () => this.checkDatabase(),
      async () => this.checkRedis(),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { database: { status: 'up' } };
    } catch (err) {
      return { database: { status: 'down', message: err.message } };
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      await this.redisClient.connect();
      const pong = await this.redisClient.ping();
      await this.redisClient.disconnect();
      
      if (pong === 'PONG') {
        return { redis: { status: 'up' } };
      }
      throw new Error('Redis ping failed');
    } catch (err) {
      return { redis: { status: 'down', message: err.message } };
    }
  }
}
export { HealthCheckService };
export { HealthCheck };
