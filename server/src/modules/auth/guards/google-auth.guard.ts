import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const host = req.headers?.host || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

    // Dynamically set callbackURL so local dev and production render both work automatically
    let callbackURL = this.configService.get<string>('GOOGLE_CALLBACK_URL');
    if (isLocal) {
      callbackURL = `http://${host}/api/auth/google/callback`;
    } else if (!callbackURL) {
      const proto = req.headers?.['x-forwarded-proto'] || 'https';
      callbackURL = `${proto}://${host}/api/auth/google/callback`;
    }

    // Preserve caller's origin and redirect target in state
    const origin = req.query?.origin || (req.headers?.referer ? new URL(req.headers.referer).origin : '');
    const redirect = req.query?.redirect || req.query?.target || '';
    const statePayload: Record<string, string> = {};
    if (origin) statePayload.origin = String(origin);
    if (redirect) statePayload.redirect = String(redirect);

    const state = Object.keys(statePayload).length > 0
      ? Buffer.from(JSON.stringify(statePayload)).toString('base64')
      : undefined;

    return {
      callbackURL,
      ...(state ? { state } : {}),
      accessType: 'offline',
      prompt: 'select_account',
    };
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      return null;
    }
    return user;
  }
}
