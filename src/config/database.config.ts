import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
}

export default registerAs('database', (): DatabaseConfig => ({
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/demo_backend?schema=public',
}));
