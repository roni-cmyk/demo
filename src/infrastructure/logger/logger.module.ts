import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('app.env') === 'production';
        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: !isProduction
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
                  },
                }
              : undefined,
            genReqId: (req: any) => {
              // Fastify requests have headers, and raw node requests have headers
              const rawHeaders = req.headers || (req.raw && req.raw.headers);
              const reqId = rawHeaders ? rawHeaders['x-request-id'] || rawHeaders['x-correlation-id'] : null;
              return reqId || randomUUID();
            },
            customProps: (req: any) => {
              return {
                requestId: req.id,
              };
            },
            serializers: {
              req: (req: any) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                ip: req.ip,
              }),
              res: (res: any) => ({
                statusCode: res.statusCode,
              }),
              err: (err: any) => ({
                type: err.type,
                message: err.message,
                stack: err.stack,
              }),
            },
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
export { Logger } from 'nestjs-pino';
