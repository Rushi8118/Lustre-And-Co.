import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { UserDocument } from '../../users/schemas/user.schema.js';
import { UsersService } from '../../users/users.service.js';
import { SupabaseService } from '../../../database/supabase.service.js';
import { toDoc, unwrap } from '../../../common/utils/db.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(SupabaseService) private readonly db: SupabaseService,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:5000/api/auth/google/callback',
      scope: ['profile', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any): Promise<UserDocument> {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';

    if (!email) {
      throw new UnauthorizedException('Google account email not found.');
    }

    const now = new Date().toISOString();

    const byGoogleId = unwrap(await this.db.from('users').select('*').eq('googleId', googleId).maybeSingle());
    if (byGoogleId) {
      return toDoc(
        unwrap(await this.db.from('users').update({ lastLoginAt: now }).eq('id', byGoogleId.id).select().single()),
      );
    }

    const existingByEmail = await this.usersService.findByEmail(email);
    if (existingByEmail) {
      return toDoc(
        unwrap(
          await this.db
            .from('users')
            .update({ googleId, provider: 'google', lastLoginAt: now })
            .eq('id', existingByEmail.id)
            .select()
            .single(),
        ),
      );
    }

    const hashedPassword = await bcrypt.hash(`${googleId}-${Date.now()}`, 10);

    return this.usersService.create({
      name: name || `${firstName} ${lastName}`.trim(),
      email: email.toLowerCase().trim(),
      googleId,
      provider: 'google',
      password: hashedPassword,
      role: 'customer',
      addresses: [],
      lastLoginAt: now,
    });
  }
}
