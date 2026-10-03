import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/common/guards/roles.guard.js';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard.js';

describe('RBAC & Security Guards (RolesGuard & PermissionsGuard)', () => {
  let rolesGuard: RolesGuard;
  let permissionsGuard: PermissionsGuard;
  let reflector: Reflector;

  function createMockContext(user: any): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    permissionsGuard = new PermissionsGuard(reflector);
  });

  // Important test case: Admin-only routes reject normal customers
  it('should reject unauthenticated requests on admin routes', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext(null);

    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => rolesGuard.canActivate(context)).toThrow(
      'Authentication required for administrative access.',
    );
  });

  it('should reject normal customers from accessing admin-only routes', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext({
      id: 'customer-1',
      email: 'buyer@example.com',
      role: 'customer',
    });

    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => rolesGuard.canActivate(context)).toThrow('Access denied');
  });

  it('should grant access to admin user on admin routes', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext({
      id: 'admin-1',
      email: 'admin@lustre.com',
      role: 'admin',
    });

    const result = rolesGuard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should grant access to specialized admin roles (e.g. order-manager, catalog-manager)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const orderManagerCtx = createMockContext({
      id: 'staff-1',
      role: 'order-manager',
    });
    expect(rolesGuard.canActivate(orderManagerCtx)).toBe(true);

    const catalogManagerCtx = createMockContext({
      id: 'staff-2',
      role: 'catalog-manager',
    });
    expect(rolesGuard.canActivate(catalogManagerCtx)).toBe(true);

    const ownerCtx = createMockContext({
      id: 'owner-1',
      role: 'owner',
    });
    expect(rolesGuard.canActivate(ownerCtx)).toBe(true);
  });

  // Permissions guard tests
  it('should verify granular permissions correctly', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['orders.update']);

    // Order manager has orders.update -> allowed
    const allowedCtx = createMockContext({
      id: 'staff-1',
      role: 'order-manager',
    });
    expect(permissionsGuard.canActivate(allowedCtx)).toBe(true);

    // Support agent does NOT have orders.update -> denied
    const deniedCtx = createMockContext({
      id: 'staff-3',
      role: 'support-agent',
    });
    expect(() => permissionsGuard.canActivate(deniedCtx)).toThrow(ForbiddenException);
    expect(() => permissionsGuard.canActivate(deniedCtx)).toThrow(
      'You do not possess the required permission: [orders.update]',
    );
  });
});
