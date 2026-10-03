import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { ADMIN_ROLES } from '../constants/roles-permissions.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException(
        'Authentication required for administrative access.',
      );
    }

    const userRole = String(user.role || '').toLowerCase().trim();
    let hasRole = requiredRoles.includes(userRole);

    // If endpoint requires admin, any administrative role satisfies it
    if (!hasRole && requiredRoles.includes('admin') && ADMIN_ROLES.includes(userRole)) {
      hasRole = true;
    }

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Requires one of roles: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
