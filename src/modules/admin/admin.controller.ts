import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly auditService: AuditService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stats')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Retrieve dashboard statistics and system metrics' })
  @ApiResponse({ status: 200, description: 'Stats successfully calculated' })
  async getDashboardStats() {
    const [totalUsers, totalSessions, totalAudits] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.session.count({ where: { isActive: true } }),
      this.prisma.auditLog.count(),
    ]);

    return {
      metrics: {
        totalUsers,
        totalSessions,
        totalAudits,
      },
    };
  }

  @Get('audit-logs')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Query and view all action audit logs' })
  async getAuditLogs(@Query() query: PaginationQueryDto) {
    return this.auditService.findAll(query);
  }
}
