import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { EngagementService } from './engagement.service.js';
import { EngagementController } from './engagement.controller.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [EngagementController],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementModule {}
