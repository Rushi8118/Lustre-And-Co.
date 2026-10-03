import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const userId = req.user?.id || 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = res.statusCode;
          const duration = Date.now() - start;
          this.logger.log(
            `[${method}] ${originalUrl} ${statusCode} - ${duration}ms | User: ${userId} | IP: ${ip}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          const status = err.status || 500;
          this.logger.warn(
            `[${method}] ${originalUrl} ${status} - ${duration}ms | User: ${userId} | IP: ${ip} | Error: ${err.message}`,
          );
        },
      }),
    );
  }
}
