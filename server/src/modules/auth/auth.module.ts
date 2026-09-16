import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { SmtpModule } from './smtp/smtp.module.js';
import { UsersModule } from '../users/users.module.js';
import { UsersService } from '../users/users.service.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { getGoogleCredentials } from '../../common/utils/google.js';

/**
 * The Google strategy is only registered when real OAuth credentials are set;
 * passport-google-oauth20 throws at startup when the client id is empty.
 */
const googleStrategyProvider = {
  provide: GoogleStrategy,
  inject: [ConfigService, SupabaseService, UsersService],
  useFactory: (config: ConfigService, db: SupabaseService, users: UsersService) =>
    getGoogleCredentials(config).configured ? new GoogleStrategy(config, db, users) : null,
};

@Module({
  imports: [
    UsersModule,
    SmtpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'lustre_luxury_secret_key_2026_change_in_production',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') || '7d') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, googleStrategyProvider, JwtAuthGuard, GoogleAuthGuard],
  exports: [AuthService, JwtAuthGuard, GoogleAuthGuard, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
