import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { User } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    // Return profile without password hash for security
    const { passwordHash, ...profile } = user;
    return profile;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    const updated = await this.userService.update(userId, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      avatarUrl: dto.avatarUrl,
      passwordHash: dto.password,
    });
    const { passwordHash, ...profile } = updated;
    return profile;
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get paginated list of users (Admin only)' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get user details by ID (Admin only)' })
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findOneWithRoles(id);
    const { passwordHash, ...profile } = user;
    return profile;
  }

  @Put(':id/roles')
  @Roles('SUPER_ADMIN')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Assign roles to user (Super Admin only)' })
  async assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    const user = await this.userService.assignRoles(id, dto.roles);
    const { passwordHash, ...profile } = user;
    return profile;
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @RequirePermissions('users:delete')
  @ApiOperation({ summary: 'Soft delete user account (Super Admin only)' })
  async remove(@Param('id') id: string) {
    const deleted = await this.userService.softDelete(id);
    const { passwordHash, ...profile } = deleted;
    return profile;
  }
}
