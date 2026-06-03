import { registerAs } from '@nestjs/config';

export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  fallbackLanguage: string;
  headerLanguage: string;
  name: string;
  url: string;
}

export default registerAs('app', (): AppConfig => ({
  env: process.env.NODE_ENV || 'development',
  port: process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 3000,
  apiPrefix: process.env.API_PREFIX || 'api',
  fallbackLanguage: process.env.APP_FALLBACK_LANGUAGE || 'en',
  headerLanguage: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
  name: process.env.APP_NAME || 'Demo Backend',
  url: process.env.APP_URL || 'http://localhost:3000',
}));
