import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../database/supabase.service.js';
import { USER_PUBLIC_COLUMNS } from '../../users/schemas/user.schema.js';
import { isUuid, toDoc, unwrap } from '../../../common/utils/db.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(SupabaseService) private readonly db: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'lustre_luxury_secret_key_2026_change_in_production',
    });
  }

  async validate(payload: { sub: string; email: string }) {
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
