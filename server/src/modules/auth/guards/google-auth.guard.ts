import { ExecutionContext, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { getGoogleCredentials } from '../../../common/utils/google.js';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Without credentials the passport strategy is never registered, so fail with a clear message.
    if (!getGoogleCredentials(this.configService).configured) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this store. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      );
    }
    return super.canActivate(context);
  }
}
