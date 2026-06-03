import { NestFactory, Reflector } from '@nestjs/core';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      bodyLimit: 10 * 1024 * 1024, // 10MB
    }),
    { bufferLogs: true },
  );

  // 1. Inject Pino Logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);
  const port = configService.get<number>('app.port') || 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';

  // 2. Register Fastify Security & Feature Plugins
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `'unsafe-inline'`, `https: 'unsafe-inline'`],
      },
    },
  });

  await app.register(fastifyCors, {
    origin: true, // In production, replace with specific domains
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-device-id',
      'x-device-type',
      'x-request-id',
    ],
  });

  await app.register(fastifyCookie, {
    secret: configService.get<string>('auth.jwtAccessSecret'),
  });

  // 3. Global Request Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 4. Global Interceptors & Exception Filters
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(reflector),
    app.get(AuditInterceptor),
  );
  app.useGlobalFilters(new AllExceptionsFilter(configService));

  // 5. Versioning Configuration
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 6. Swagger API Documentation Setup
  const config = new DocumentBuilder()
    .setTitle(configService.get<string>('app.name') || 'Enterprise API')
    .setDescription('Enterprise-grade NestJS Fastify SaaS Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  // Set Global Prefix (excluding docs)
  app.setGlobalPrefix(apiPrefix);

  // 7. Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  logger.log(`Starting NestJS application on port ${port}...`);
  await app.listen(port, '0.0.0.0');
  logger.log(`Application successfully listening at http://localhost:${port}/${apiPrefix}/v1`);
  logger.log(`API Documentation available at http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
