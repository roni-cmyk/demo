import * as Joi from 'joi';
import appConfig from './app.config';
import authConfig from './auth.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import mailerConfig from './mailer.config';

export const configLoads = [appConfig, authConfig, databaseConfig, redisConfig, mailerConfig];

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  APP_PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  APP_NAME: Joi.string().default('Demo Backend'),
  APP_URL: Joi.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: Joi.string().required().messages({
    'any.required': 'DATABASE_URL environment variable is required to run the application.',
  }),

  // Auth
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  BCRYPT_SALT_ROUNDS: Joi.number().default(12),

  // Redis
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_DB: Joi.number().default(0),
  REDIS_PASSWORD: Joi.string().allow('', null),
  REDIS_KEY_PREFIX: Joi.string().default('demo_backend:'),

  // Mailer
  MAIL_HOST: Joi.string().allow('', null),
  MAIL_PORT: Joi.number().allow('', null),
  MAIL_USER: Joi.string().allow('', null),
  MAIL_PASSWORD: Joi.string().allow('', null),
  MAIL_FROM: Joi.string().allow('', null),
});
export * from './app.config';
export * from './auth.config';
export * from './database.config';
export * from './redis.config';
export * from './mailer.config';
