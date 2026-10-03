import { Global, Module } from '@nestjs/common';
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
import { getJwtSecret } from '../../common/utils/jwt-secret.js';

const googleProviders = process.env.GOOGLE_CLIENT_ID
  ? [GoogleStrategy, GoogleAuthGuard]
  : [];
const googleExports = process.env.GOOGLE_CLIENT_ID
  ? [GoogleAuthGuard, GoogleStrategy]
  : [];

@Global()
@Module({
  imports: [
    UsersModule,
    SmtpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecret(configService),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') || '7d') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, ...googleProviders],
  exports: [AuthService, JwtAuthGuard, JwtStrategy, ...googleExports, PassportModule, JwtModule],
})
export class AuthModule {}
