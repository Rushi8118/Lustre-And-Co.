import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';

export interface AuditLogEntry {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  status?: 'success' | 'failed' | 'denied';
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly db: SupabaseService) {}

  async recordLog(entry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await this.db.from('audit_logs').insert({
        user_id: entry.userId || null,
        user_email: entry.userEmail || null,
        user_role: entry.userRole || null,
        action: entry.action,
        resource: entry.resource || null,
        resource_id: entry.resourceId || null,
        status: entry.status || 'success',
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        details: entry.details || {},
      });

      if (error) {
        this.logger.warn(`Failed to persist audit log: ${error.message}`);
      }
    } catch (err: any) {
      this.logger.error(`Exception while recording audit log: ${err.message}`);
    }
  }

  async listLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    resource?: string;
    userId?: string;
  } = {}) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 30)));
    const offset = (page - 1) * limit;

    let query = this.db
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.action) query = query.eq('action', params.action);
    if (params.resource) query = query.eq('resource', params.resource);
    if (params.userId) query = query.eq('user_id', params.userId);

    const { data, count, error } = await query;
    if (error) {
      this.logger.warn(`Could not fetch audit logs: ${error.message}`);
      return { logs: [], total: 0, page, limit };
    }

    return {
      logs: data || [],
      total: count || 0,
      page,
      limit,
    };
  }
}
