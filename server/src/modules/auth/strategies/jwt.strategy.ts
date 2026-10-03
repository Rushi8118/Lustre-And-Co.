import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../database/supabase.service.js';
import { USER_PUBLIC_COLUMNS } from '../../users/schemas/user.schema.js';
import { isUuid, toDoc, unwrap } from '../../../common/utils/db.js';
import { getJwtSecret } from '../../../common/utils/jwt-secret.js';
import { ACCESS_COOKIE } from '../auth-cookies.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(SupabaseService) private readonly db: SupabaseService,
  ) {
    super({
      // Browsers send the session cookie; API clients may still use a Bearer header.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.[ACCESS_COOKIE] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService),
    });
  }

  async validate(payload: { sub: string; email: string; purpose?: string }) {
    // Challenge tokens (e.g. '2fa_pending') share this secret. They must never
    // authenticate a request, or a password alone would bypass admin 2FA.
    if (payload.purpose) {
      throw new UnauthorizedException('User session has expired or no longer exists.');
    }
    // Tokens issued before the Supabase migration carry non-uuid ids and are rejected.
    const user = isUuid(payload.sub)
      ? unwrap(await this.db.from('users').select(USER_PUBLIC_COLUMNS).eq('id', payload.sub).maybeSingle())
      : null;
    if (!user || (user as any).isActive === false) {
      throw new UnauthorizedException('User session has expired or no longer exists.');
    }
    return toDoc(user);
  }
}
