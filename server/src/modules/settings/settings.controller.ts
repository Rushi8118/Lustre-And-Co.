import { Body, Controller, Get, Inject, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';

@ApiTags('Settings')
@Controller()
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Public storefront configuration, homepage content, and store stats' })
  getPublic() {
    return this.settingsService.getPublic();
  }

  @Get('admin/settings')
  @AdminOnly()
  @ApiOperation({ summary: 'Get editable store settings' })
  getForAdmin() {
    return this.settingsService.get();
  }

  @Put('admin/settings')
  @AdminOnly()
  @ApiOperation({ summary: 'Update store settings (partial, merged per section)' })
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}
