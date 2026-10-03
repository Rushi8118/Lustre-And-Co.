import { Module } from '@nestjs/common';
import { BundlesController } from './bundles.controller.js';
import { BundlesService } from './bundles.service.js';

@Module({
  controllers: [BundlesController],
  providers: [BundlesService],
  exports: [BundlesService],
})
export class BundlesModule {}
