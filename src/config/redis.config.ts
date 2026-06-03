import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  db?: number;
  password?: string;
  keyPrefix?: string;
}

export default registerAs('redis', (): RedisConfig => ({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
  password: process.env.REDIS_PASSWORD || undefined,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'demo_backend:',
}));
