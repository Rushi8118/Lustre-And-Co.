import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { AuditLogService } from './audit.service.js';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
