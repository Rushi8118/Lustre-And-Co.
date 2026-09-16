import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { SmtpService } from './smtp/smtp.service.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { unwrap } from '../../common/utils/db.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(SupabaseService) private readonly db: SupabaseService,
    private readonly smtpService: SmtpService,
  ) {}

  sanitizeUser(user: UserDocument) {
    const { password, resetPasswordTokenHash, resetPasswordExpires, ...safe } = user as any;
    return { ...safe, _id: user.id, id: user.id };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'customer',
      addresses: [],
      lastLoginAt: new Date().toISOString(),
    });

    await this.smtpService.sendWelcomeEmail(user.email, user.name);

    return {
      message: 'Your account is ready.',
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    const isMatch = user ? await bcrypt.compare(dto.password, user.password) : false;
    if (!user || !isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.isActive === false) {
      throw new ForbiddenException('This account has been deactivated. Please contact support.');
    }

    await this.usersService.touchLastLogin(user.id);

    return {
      message: 'Welcome back.',
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  /** Takes the user resolved by GoogleStrategy.validate and issues a session token. */
  async googleLogin(user: UserDocument): Promise<{ user: any; token: string }> {
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('Google account not found or deactivated.');
    }

    await this.usersService.touchLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (user && user.isActive !== false) {
      const token = crypto.randomBytes(32).toString('hex');
      unwrap(
        await this.db
          .from('users')
          .update({
            resetPasswordTokenHash: hashToken(token),
            resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
          })
          .eq('id', user.id),
      );

      await this.smtpService.sendPasswordResetEmail(user.email, token);
    }

    return {
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = unwrap(
      await this.db
        .from('users')
        .select('id')
        .eq('resetPasswordTokenHash', hashToken(dto.token.trim()))
        .gt('resetPasswordExpires', new Date().toISOString())
        .maybeSingle(),
    );

    if (!user) {
      throw new BadRequestException('This reset link is invalid or has expired. Please request a new one.');
    }

    unwrap(
      await this.db
        .from('users')
        .update({
          password: await bcrypt.hash(dto.password, 10),
          resetPasswordTokenHash: null,
          resetPasswordExpires: null,
        })
        .eq('id', user.id),
    );

    return { success: true, message: 'Your password has been reset. You can now sign in.' };
  }

  private generateToken(user: UserDocument): string {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
