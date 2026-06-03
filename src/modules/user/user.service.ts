import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { HashUtil } from '../../shared/utils/hash.util';
import { Prisma, User } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { createPaginationResult } from '../../common/utils/pagination.util';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await HashUtil.hash(data.passwordHash);
    return this.userRepository.create({
      ...data,
      passwordHash,
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne(id);
    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneWithRoles(id: string) {
    const user = await this.userRepository.findByIdWithRoles(id);
    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByEmailWithRoles(email: string) {
    return this.userRepository.findByEmailWithRoles(email);
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const user = await this.findOne(id);
    if (data.passwordHash && typeof data.passwordHash === 'string') {
      data.passwordHash = await HashUtil.hash(data.passwordHash);
    }
    return this.userRepository.update(user.id, data);
  }

  async softDelete(id: string): Promise<User> {
    await this.findOne(id);
    // BaseRepository deletes directly, but since we set up soft-delete middleware in Prisma,
    // calling delete(id) will trigger an update set deletedAt and isActive = false
    return this.userRepository.delete(id);
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<User>> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder }
      : { createdAt: 'desc' };

    const [data, totalItems] = await Promise.all([
      this.userRepository.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: {
          roles: {
            select: {
              name: true,
              description: true,
            },
          },
        },
      }),
      this.userRepository.count(where),
    ]);

    return createPaginationResult(data, totalItems, query);
  }

  async assignRoles(id: string, roleNames: string[]): Promise<User> {
    await this.findOne(id);
    return this.userRepository.update(id, {
      roles: {
        set: roleNames.map((name) => ({ name })),
      },
    });
  }
}
