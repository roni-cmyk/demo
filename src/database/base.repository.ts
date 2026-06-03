import { PrismaService } from './prisma.service';

export abstract class BaseRepository<
  Entity extends { id: string },
  CreateInput,
  UpdateInput,
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelDelegate: any,
  ) {}

  async create(data: CreateInput): Promise<Entity> {
    return this.modelDelegate.create({ data });
  }

  async findOne(id: string): Promise<Entity | null> {
    return this.modelDelegate.findUnique({
      where: { id },
    });
  }

  async findMany(options?: {
    where?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
    include?: any;
  }): Promise<Entity[]> {
    return this.modelDelegate.findMany(options);
  }

  async update(id: string, data: UpdateInput): Promise<Entity> {
    return this.modelDelegate.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Entity> {
    return this.modelDelegate.delete({
      where: { id },
    });
  }

  async count(where?: any): Promise<number> {
    return this.modelDelegate.count({ where });
  }
}
