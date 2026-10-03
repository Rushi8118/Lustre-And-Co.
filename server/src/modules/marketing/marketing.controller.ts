import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AnalyticsEventDto } from './dto/analytics-event.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { SubscribeBackInStockDto } from './dto/subscribe-back-in-stock.dto.js';
import { MarketingService } from './marketing.service.js';

@ApiTags('Marketing')
@Controller()
export class MarketingController {
  constructor(
    private readonly marketingService: MarketingService,
  ) {}

  @Post('marketing/events')
  @ApiOperation({ summary: 'Track client-side marketing/analytics event' })
  trackAnalyticsEvent(
    @Body() dto: AnalyticsEventDto,
    @CurrentUser() user?: any,
  ) {
    return this.marketingService.trackAnalyticsEvent(
      user?.id,
      dto,
    );
  }

  @Post('marketing/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe email from marketing communications' })
  unsubscribe(
    @Body()
    body: {
      email: string;
      reason?: string;
    },
  ) {
    return this.marketingService.unsubscribe(
      body.email,
      body.reason,
    );
  }

  @Post('back-in-stock')
  @ApiOperation({ summary: 'Subscribe to a stock notification' })
  subscribeBackInStock(
    @Body() dto: SubscribeBackInStockDto,
  ) {
    return this.marketingService.subscribeBackInStock(dto);
  }

  @Delete('back-in-stock/:token')
  @ApiOperation({ summary: 'Cancel a back-in-stock subscription' })
  cancelBackInStock(@Param('token') token: string) {
    return this.marketingService.cancelBackInStockSubscription(
      token,
    );
  }

  @AdminOnly()
  @Post('admin/back-in-stock/:productId/notify')
  @ApiOperation({ summary: 'Admin manual trigger to notify back-in-stock subscribers' })
  notifyBackInStock(@Param('productId') productId: string) {
    return this.marketingService.notifyBackInStock(
      productId,
    );
  }

  @AdminOnly()
  @Get('admin/marketing/templates')
  @ApiOperation({ summary: 'List reusable marketing templates' })
  listTemplates() {
    return this.marketingService.listTemplates();
  }

  @AdminOnly()
  @Post('admin/marketing/templates')
  @ApiOperation({ summary: 'Create marketing template' })
  createTemplate(
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user?: any,
  ) {
    return this.marketingService.createTemplate(
      dto,
      user?.id,
    );
  }

  @AdminOnly()
  @Put('admin/marketing/templates/:id')
  @ApiOperation({ summary: 'Update marketing template' })
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTemplateDto>,
  ) {
    return this.marketingService.updateTemplate(id, dto);
  }

  @AdminOnly()
  @Get('admin/marketing/campaigns')
  @ApiOperation({ summary: 'List email and notification campaigns' })
  listCampaigns() {
    return this.marketingService.listCampaigns();
  }

  @AdminOnly()
  @Post('admin/marketing/campaigns')
  @ApiOperation({ summary: 'Create a new marketing campaign' })
  createCampaign(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user?: any,
  ) {
    return this.marketingService.createCampaign(
      dto,
      user?.id,
    );
  }

  @AdminOnly()
  @Post('admin/marketing/campaigns/:id/send')
  @ApiOperation({ summary: 'Trigger campaign dispatch now' })
  sendCampaign(@Param('id') id: string) {
    return this.marketingService.sendCampaign(id);
  }
}
