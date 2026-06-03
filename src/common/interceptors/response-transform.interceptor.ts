import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  timestamp: string;
  requestId: string;
  data: T;
}

export const SKIP_RESPONSE_TRANSFORM_KEY = 'skipResponseTransform';
export const SkipResponseTransform = () =>
  SetMetadata(SKIP_RESPONSE_TRANSFORM_KEY, true);

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const isSkipped = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isSkipped) {
      return next.handle();
    }

    const host = context.switchToHttp();
    const request = host.getRequest();
    const response = host.getResponse();

    // Fastify/Express request ID extraction
    const requestId = request.id || request.headers['x-request-id'] || 'N/A';
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode,
        timestamp: new Date().toISOString(),
        requestId,
        data: data === undefined ? null : data,
      })),
    );
  }
}
