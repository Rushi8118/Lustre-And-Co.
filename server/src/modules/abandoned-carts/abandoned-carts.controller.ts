import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { AbandonedCartsService } from './abandoned-carts.service.js';
import { UpdateAbandonedCartSettingsDto } from './dto/update-recovery-settings.dto.js';
import { SetRecoveryEmailDto } from './dto/set-recovery-email.dto.js';

@ApiTags('Abandoned Carts')
@Controller(['admin/abandoned-carts', 'abandoned-carts'])
export class AbandonedCartsController {
  constructor(
    private readonly abandonedCartsService: AbandonedCartsService,
  ) {}

  @AdminOnly()
  @Get()
  @ApiOperation({ summary: 'List abandoned carts' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAbandonedCarts(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.abandonedCartsService.getAbandonedCarts({
      status,
      search,
      page: Math.max(1, Number(page || 1)),
      limit: Math.min(100, Math.max(1, Number(limit || 20))),
    });
  }

  @AdminOnly()
  @Get('stats')
  getStats() {
    return this.abandonedCartsService.getStats();
  }

  @AdminOnly()
  @Get('settings')
  getSettings() {
    return this.abandonedCartsService.getSettings();
  }

  @AdminOnly()
  @Put('settings')
  updateSettings(@Body() dto: UpdateAbandonedCartSettingsDto) {
    return this.abandonedCartsService.updateSettings(dto);
  }

  @AdminOnly()
  @Get(':id')
  @ApiParam({ name: 'id' })
  getCartById(@Param('id') id: string) {
    return this.abandonedCartsService.getAbandonedCartById(id);
  }

  @AdminOnly()
  @Post(':id/send-recovery')
  @ApiBody({ type: SetRecoveryEmailDto })
  sendRecoveryEmail(
    @Param('id') id: string,
    @Body() dto: SetRecoveryEmailDto,
  ) {
    return this.abandonedCartsService.sendRecoveryEmail(
      id,
      dto.customMessage,
      dto.reminderNumber,
    );
  }

  @AdminOnly()
  @Post('process')
  processAbandonedCarts() {
    return this.abandonedCartsService.processAbandonedCarts();
  }

  @Post('identify')
  identifyCart(@Body() body: { cartId?: string; email?: string }) {
    if (!body?.cartId || !body?.email) {
      throw new BadRequestException('cartId and email are required.');
    }

    return this.abandonedCartsService.setRecoveryEmail(
      body.cartId,
      body.email,
    );
  }
}
