import { Injectable } from '@nestjs/common';
import { Prisma, AuditLog } from '@prisma/client';
import { BaseRepository } from '../../database/base.repository';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditRepository extends BaseRepository<
  AuditLog,
  Prisma.AuditLogCreateInput,
  Prisma.AuditLogUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.auditLog);
  }

  async findByUserId(userId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
