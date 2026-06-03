import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Global()
@Module({
  providers: [AuditService, AuditRepository, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
