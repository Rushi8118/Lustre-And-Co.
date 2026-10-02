import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CmsService } from './cms.service.js';
import { CmsController } from './cms.controller.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
