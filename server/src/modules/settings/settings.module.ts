import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SettingsService } from './settings.service.js';
import { SettingsController } from './settings.controller.js';

@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
