import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Server-side Supabase client. Uses the service-role key, so it must never reach the browser. */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  readonly client: SupabaseClient;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const url = configService.get<string>('SUPABASE_URL');
    const key = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in server/.env');
    }
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  from(table: string) {
    return this.client.from(table);
  }

  /** Calls a Postgres function and returns its data, throwing on error. */
  async rpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) {
      this.logger.error(`rpc ${fn} failed: ${error.message}`);
      throw new InternalServerErrorException('A database error occurred.');
    }
    return data as T;
  }
}
