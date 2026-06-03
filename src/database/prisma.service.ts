import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

function withSoftDeleteExtension(client: PrismaClient) {
  return client.$extends({
    query: {
      user: {
        async delete({ args }) {
          return client.user.update({
            where: args.where,
            data: { deletedAt: new Date(), isActive: false },
          });
        },
        async deleteMany({ args }) {
          return client.user.updateMany({
            where: args.where,
            data: { deletedAt: new Date(), isActive: false },
          });
        },
        async findUnique({ args }) {
          const where: Prisma.UserWhereInput = {
            ...args.where,
            deletedAt: args.where.deletedAt ?? null,
          };
          return client.user.findFirst({ ...args, where });
        },
        async findFirst({ args, query }) {
          const where: Prisma.UserWhereInput = {
            ...(args.where ?? {}),
            deletedAt: args.where?.deletedAt ?? null,
          };
          return query({ ...args, where });
        },
        async findMany({ args, query }) {
          const where: Prisma.UserWhereInput = {
            ...(args.where ?? {}),
            deletedAt: args.where?.deletedAt ?? null,
          };
          return query({ ...args, where });
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof withSoftDeleteExtension>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly baseClient: PrismaClient;
  private readonly extendedClient: ExtendedPrismaClient;

  constructor() {
    this.baseClient = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
    this.extendedClient = withSoftDeleteExtension(this.baseClient);
  }

  get user() {
    return this.extendedClient.user;
  }

  get session() {
    return this.extendedClient.session;
  }

  get auditLog() {
    return this.extendedClient.auditLog;
  }

  get refreshToken() {
    return this.extendedClient.refreshToken;
  }

  get $queryRaw() {
    return this.extendedClient.$queryRaw.bind(this.extendedClient);
  }

  async onModuleInit() {
    await this.extendedClient.$connect();

    (this.baseClient as any).$on('query', (e: Prisma.QueryEvent) => {
      this.logger.debug(
        `Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`,
      );
    });
    (this.baseClient as any).$on('error', (e: Prisma.LogEvent) => {
      this.logger.error(`Database Error: ${e.message}`);
    });
    (this.baseClient as any).$on('info', (e: Prisma.LogEvent) => {
      this.logger.log(`Database Info: ${e.message}`);
    });
    (this.baseClient as any).$on('warn', (e: Prisma.LogEvent) => {
      this.logger.warn(`Database Warning: ${e.message}`);
    });
  }

  async onModuleDestroy() {
    await this.extendedClient.$disconnect();
  }
}
