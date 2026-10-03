import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' && metadata.type !== 'query' && metadata.type !== 'param') {
      return value;
    }
    return this.sanitize(value);
  }

  private sanitize(value: any): any {
    if (typeof value === 'string') {
      return value
        .replace(/\0/g, '') // Strip null bytes
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
        .trim();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value !== null && typeof value === 'object') {
      const sanitizedObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitizedObj[key] = this.sanitize(val);
      }
      return sanitizedObj;
    }

    return value;
  }
}
