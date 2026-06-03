import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';
import { AUDIT_METADATA_KEY, AuditMetadata } from '../decorators/audit-log.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMetadata = this.reflector.getAllAndOverride<AuditMetadata>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const host = context.switchToHttp();
    const request = host.getRequest();

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log only on successful operations
          const userId = request.user?.id || null;
          const ip = request.ip || request.headers['x-forwarded-for'];
          const userAgent = request.headers['user-agent'];
          
          // Construct audit details (excluding sensitive credentials)
          const details = {
            query: request.query,
            params: request.params,
            body: { ...request.body },
          };

          if (details.body) {
            delete details.body.password;
            delete details.body.refreshToken;
          }

          // Run asynchronously in background without blocking response
          this.auditService
            .logAction(userId, auditMetadata.action, auditMetadata.resource, details, ip, userAgent)
            .catch((err) => {
              // Fail-silent for audit logging to not affect business flows
              console.error('Audit logging background failure:', err);
            });
        },
      }),
    );
  }
}
