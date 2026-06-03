import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit_metadata';

export interface AuditMetadata {
  action: string;
  resource: string;
}

export const AuditLogAction = (action: string, resource: string) =>
  SetMetadata(AUDIT_METADATA_KEY, { action, resource });
