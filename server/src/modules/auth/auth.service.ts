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
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { SmtpService } from './smtp/smtp.service.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly smtpService: SmtpService,
  ) {}

  sanitizeUser(user: UserDocument) {
    const obj = user.toObject ? user.toObject() : (user as any);
    delete obj.password;
    delete obj.resetPasswordTokenHash;
    delete obj.resetPasswordExpires;
    obj.id = obj._id;
    return obj;
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
      lastLoginAt: new Date(),
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

    user.lastLoginAt = new Date();
    await user.save();

    return {
      message: 'Welcome back.',
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async googleLogin(profile: any): Promise<{ user: any; token: string }> {
    const user = await this.userModel.findOne({ googleId: profile.id });

    if (!user || user.isActive === false) {
      throw new UnauthorizedException('Google account not found or deactivated.');
    }

    user.lastLoginAt = new Date();
    await user.save();

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (user && user.isActive !== false) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetPasswordTokenHash = hashToken(token);
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      await this.smtpService.sendPasswordResetEmail(user.email, token);
    }

    return {
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userModel.findOne({
      resetPasswordTokenHash: hashToken(dto.token.trim()),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('This reset link is invalid or has expired. Please request a new one.');
    }

    user.password = await bcrypt.hash(dto.password, 10);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { success: true, message: 'Your password has been reset. You can now sign in.' };
  }

  private generateToken(user: UserDocument): string {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
