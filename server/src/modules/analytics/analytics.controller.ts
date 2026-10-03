import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AnalyticsEventDto } from '../marketing/dto/analytics-event.dto.js';
import { AnalyticsService } from './analytics.service.js';

@ApiTags('Analytics')
@Controller()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post('analytics/events')
  @ApiOperation({ summary: 'Track customer frontend analytics event' })
  trackEvent(
    @Body() dto: AnalyticsEventDto,
    @CurrentUser() user?: any,
    @Headers('x-session-id') headerSessionId?: string,
  ) {
    return this.analyticsService.trackEvent(
      user?.id,
      {
        ...dto,
        sessionId: dto.sessionId || headerSessionId,
      },
    );
  }

  @AdminOnly()
  @Get('admin/analytics/dashboard')
  @ApiOperation({ summary: 'Retrieve full analytics & BI metrics dashboard' })
  getDashboard(
    @Query('preset') preset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getDashboard({
      preset,
      from,
      to,
    });
  }

  @AdminOnly()
  @Get('admin/analytics/export')
  @ApiOperation({ summary: 'Export orders, customers, products, revenue, or inventory as CSV or XLSX' })
  async export(
    @Query('type')
    type:
      | 'orders'
      | 'customers'
      | 'products'
      | 'revenue'
      | 'inventory',
    @Query('format') format: 'csv' | 'xlsx',
    @Query('preset') preset: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() response: Response,
  ) {
    const exportFormat = format || 'csv';

    const result = await this.analyticsService.exportData(
      type,
      exportFormat,
      {
        preset,
        from,
        to,
      },
    );

    if (exportFormat === 'xlsx') {
      response.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${type}-export-${Date.now()}.xlsx"`,
      );

      response.send(result);
      return;
    }

    response.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${type}-export-${Date.now()}.csv"`,
    );

    response.send(result);
  }
}
