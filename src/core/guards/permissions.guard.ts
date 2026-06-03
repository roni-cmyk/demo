import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      return false;
    }

    // Flatten all permissions from user's roles
    const userRoles = user.roles.map((role: any) => role.name);

    // SUPER_ADMIN bypasses all permission checks
    if (userRoles.includes('SUPER_ADMIN')) {
      return true;
    }

    const userPermissions: string[] = user.roles.flatMap((role: any) =>
      role.permissions ? role.permissions.map((p: any) => p.name) : [],
    );

    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}
