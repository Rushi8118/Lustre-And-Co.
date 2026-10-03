import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { AuditLogService } from './audit.service.js';

@ApiTags('Audit')
@Controller()
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @AdminOnly()
  @Get('admin/audit-logs')
  @ApiOperation({ summary: 'Retrieve security and administrative audit logs' })
  listAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditLogService.listLogs({
      page,
      limit,
      action,
      resource,
      userId,
    });
  }
}
