import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { hasPermission } from '../constants/roles-permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException(
        'Authentication required to perform this action.',
      );
    }

    for (const perm of requiredPermissions) {
      const allowed = hasPermission(user.role, user.permissions, perm);
      if (!allowed) {
        throw new ForbiddenException(
          `Access denied. You do not possess the required permission: [${perm}]`,
        );
      }
    }

    return true;
  }
}
