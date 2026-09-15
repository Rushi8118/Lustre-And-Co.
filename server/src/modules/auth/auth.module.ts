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
  providers: [AuthService, JwtStrategy, GoogleStrategy, JwtAuthGuard, GoogleAuthGuard],
  exports: [AuthService, JwtAuthGuard, GoogleAuthGuard, JwtStrategy, GoogleStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
