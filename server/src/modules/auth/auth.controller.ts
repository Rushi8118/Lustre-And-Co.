import { Throttle } from '@nestjs/throttler';
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Inject,
  HttpCode,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './auth-cookies.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { Verify2faDto } from './dto/verify-2fa.dto.js';
import { Enable2faDto } from './dto/enable-2fa.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserDocument } from '../users/schemas/user.schema.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  private getRequestMeta(req: Request) {
    return {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    };
  }

  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  /** Sets the session cookies and returns tokens alongside user data. */
  private issueSession<T extends { token?: string; refreshToken?: string }>(res: Response, result: T) {
    const { token, refreshToken, ...body } = result;
    setAuthCookies(res, { token, refreshToken });
    return { token, refreshToken, ...body };
  }

  @Post('register')
  @ApiOperation({ summary: 'Create a new customer account' })
  @ApiResponse({ status: 201, description: 'Account created successfully with JWT and refresh token.' })
  @ApiResponse({ status: 409, description: 'Email address already registered.' })
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.issueSession(res, await this.authService.register(dto, this.getRequestMeta(req)));
  }

  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email and password (with optional 2FA)' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully or 2FA required.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 403, description: 'Account deactivated.' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.issueSession(res, await this.authService.login(dto, this.getRequestMeta(req)));
  }

  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post('2fa/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete two-factor authentication challenge' })
  async verify2Fa(@Body() dto: Verify2faDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.issueSession(res, await this.authService.verify2Fa(dto, this.getRequestMeta(req)));
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a 2FA activation code via email' })
  async setup2Fa(@CurrentUser() user: UserDocument) {
    return this.authService.setup2Fa(user.id);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm and activate 2FA for current user' })
  async enable2Fa(@CurrentUser() user: UserDocument, @Body() dto: Enable2faDto) {
    return this.authService.enable2Fa(user.id, dto.code);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable 2FA for current user' })
  async disable2Fa(@CurrentUser() user: UserDocument) {
    return this.authService.disable2Fa(user.id);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = dto?.refreshToken || req.cookies?.[REFRESH_COOKIE];
    return this.issueSession(res, await this.authService.refreshTokens(refreshToken, this.getRequestMeta(req)));
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke refresh token and terminate session' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: UserDocument | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    clearAuthCookies(res);
    return this.authService.logout(
      dto?.refreshToken || req.cookies?.[REFRESH_COOKIE],
      user?.id,
      this.getRequestMeta(req),
    );
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleLogin() {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: any, @Res() res: Response) {
    let frontendOrigin = '';
    let redirectPath = '/';
    if (req.query?.state) {
      try {
        const decoded = JSON.parse(Buffer.from(req.query.state as string, 'base64').toString('utf8'));
        if (decoded.origin) frontendOrigin = decoded.origin;
        if (decoded.redirect) redirectPath = decoded.redirect;
      } catch {}
    }
    const targetFrontend = this.resolveFrontendOrigin(req, frontendOrigin);

    if (!req.user) {
      const redirectUrl = new URL(`${targetFrontend}/account/login`);
      redirectUrl.searchParams.set('google', 'error');
      redirectUrl.searchParams.set('message', 'Google sign-in was cancelled or failed.');
      return res.redirect(redirectUrl.toString());
    }

    try {
      const meta = this.getRequestMeta(req);
      const result = await this.authService.googleLogin(req.user, meta);
      setAuthCookies(res, { token: result.token, refreshToken: result.refreshToken });

      const redirectUrl = new URL(`${targetFrontend}/account/login`);
      redirectUrl.searchParams.set('google', 'success');
      redirectUrl.searchParams.set('token', result.token);
      if (
        redirectPath &&
        redirectPath !== '/' &&
        !redirectPath.includes('/account/login') &&
        !redirectPath.includes('/account/signup')
      ) {
        redirectUrl.searchParams.set('target', redirectPath);
      }
      return res.redirect(redirectUrl.toString());
    } catch (err: any) {
      const redirectUrl = new URL(`${targetFrontend}/account/login`);
      redirectUrl.searchParams.set('google', 'error');
      redirectUrl.searchParams.set('message', err?.message || 'Google sign-in failed.');
      return res.redirect(redirectUrl.toString());
    }
  }

  private resolveFrontendOrigin(req: any, preferredOrigin?: string): string {
    const rawFrontend = this.configService.get<string>('FRONTEND_URL') || 'https://lustre-and-co.vercel.app';
    const allowedOrigins = rawFrontend
      .split(',')
      .map((u) => u.trim().replace(/\/+$/, ''))
      .filter(Boolean);

    if (preferredOrigin) {
      const cleanPreferred = preferredOrigin.trim().replace(/\/+$/, '');
      if (allowedOrigins.includes(cleanPreferred)) {
        return cleanPreferred;
      }
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanPreferred)) {
        return cleanPreferred;
      }
    }

    const host = req.headers?.host || '';
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      const localAllowed = allowedOrigins.find((u) => u.includes('localhost') || u.includes('127.0.0.1'));
      return localAllowed || 'http://localhost:5177';
    }

    return allowedOrigins[0] || 'https://lustre-and-co.vercel.app';
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get profile of the current authenticated user' })
  @ApiResponse({ status: 401, description: 'Unauthorized / expired token.' })
  async me(@CurrentUser() user: UserDocument, @Req() req: Request) {
    const token =
      req.cookies?.[ACCESS_COOKIE] ||
      req.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
      undefined;
    return { user: this.authService.sanitizeUser(user), token };
  }

  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset link' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
