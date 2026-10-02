import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Attaches the authenticated user when a valid bearer token is present,
 * but lets anonymous (guest) requests through with `req.user` undefined.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(_err: unknown, user: TUser): TUser {
    return (user || undefined) as TUser;
  }
}
