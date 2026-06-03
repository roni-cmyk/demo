import { Injectable } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { createPaginationResult } from '../../common/utils/pagination.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async logAction(
    userId: string | null,
    action: string,
    resource: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.auditRepository.create({
      action,
      resource,
      details: details ? (details as Prisma.JsonObject) : undefined,
      ipAddress,
      userAgent,
      user: userId ? { connect: { id: userId } } : undefined,
    });
  }

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { resource: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.AuditLogOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder }
      : { createdAt: 'desc' };

    const [data, totalItems] = await Promise.all([
      this.auditRepository.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.auditRepository.count(where),
    ]);

    return createPaginationResult(data, totalItems, query);
  }
}
