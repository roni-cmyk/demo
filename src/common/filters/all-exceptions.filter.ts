import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isProduction = this.configService.get<string>('app.env') === 'production';
    const requestId = request.id || request.headers['x-request-id'] || 'N/A';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as any;
        message = resObj.message || exception.message;
        error = resObj.error || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Prisma error mapping
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[])?.join(', ') || 'field';
          message = `Unique constraint failed on ${target}. Record already exists.`;
          error = 'Conflict';
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          message = exception.meta?.cause as string || 'Record not found';
          error = 'NotFound';
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          message = `Foreign key constraint failed on ${exception.meta?.field_name || 'relation'}.`;
          error = 'BadRequest';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          message = 'Database operation failed';
          error = 'DatabaseError';
          break;
        }
      }
    } else if (exception instanceof Error) {
      // General error handling
      if (!isProduction) {
        message = exception.message;
        error = exception.name;
      }
    }

    // Log the error using Pino logger structure
    this.logger.error(
      {
        message: Array.isArray(message) ? message.join(', ') : message,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
        requestId,
        path: request.url,
        method: request.method,
      },
      'Request Exception Captured',
    );

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      requestId,
      error,
      message: Array.isArray(message) && message.length === 1 ? message[0] : message,
    };

    // Fastify send syntax
    response.status(status).send(errorResponse);
  }
}
