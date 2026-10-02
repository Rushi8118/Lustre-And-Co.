import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from './roles.decorator.js';

/** Restricts a controller or route to authenticated admins. */
export function AdminOnly() {
  return applyDecorators(ApiBearerAuth(), UseGuards(JwtAuthGuard, RolesGuard), Roles('admin'));
}
