import { Injectable } from '@nestjs/common';
import { Prisma, Session } from '@prisma/client';
import { BaseRepository } from '../../database/base.repository';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SessionRepository extends BaseRepository<
  Session,
  Prisma.SessionCreateInput,
  Prisma.SessionUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.session);
  }

  async findActiveUserSessions(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async deactivateSession(id: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async deactivateAllUserSessions(userId: string): Promise<any> {
    return this.prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }
}
