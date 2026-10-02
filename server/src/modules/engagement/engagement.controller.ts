import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EngagementService } from './engagement.service.js';
import {
  CreateContactMessageDto,
  SubscribeDto,
  UpdateContactMessageDto,
  UpdateSubscriberDto,
} from './dto/engagement.dto.js';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserDocument } from '../users/schemas/user.schema.js';

@ApiTags('Contact & Newsletter')
@Controller()
export class EngagementController {
  constructor(@Inject(EngagementService) private readonly engagementService: EngagementService) {}

  @Post('contact')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Send a message to store support' })
  createMessage(@Body() dto: CreateContactMessageDto, @CurrentUser() user?: UserDocument) {
    return this.engagementService.createMessage(dto, user?._id as any);
  }

  @Post('newsletter/subscribe')
  @ApiOperation({ summary: 'Subscribe an email address to the newsletter' })
  subscribe(@Body() dto: SubscribeDto) {
    return this.engagementService.subscribe(dto);
  }

  @Get('admin/messages')
  @AdminOnly()
  findMessages(@Query('status') status?: string, @Query('search') search?: string) {
    return this.engagementService.findMessages(status, search);
  }

  @Patch('admin/messages/:id')
  @AdminOnly()
  updateMessage(@Param('id') id: string, @Body() dto: UpdateContactMessageDto) {
    return this.engagementService.updateMessage(id, dto);
  }

  @Delete('admin/messages/:id')
  @AdminOnly()
  removeMessage(@Param('id') id: string) {
    return this.engagementService.removeMessage(id);
  }

  @Get('admin/subscribers')
  @AdminOnly()
  findSubscribers(@Query('search') search?: string) {
    return this.engagementService.findSubscribers(search);
  }

  @Patch('admin/subscribers/:id')
  @AdminOnly()
  updateSubscriber(@Param('id') id: string, @Body() dto: UpdateSubscriberDto) {
    return this.engagementService.updateSubscriber(id, dto.isActive);
  }

  @Delete('admin/subscribers/:id')
  @AdminOnly()
  removeSubscriber(@Param('id') id: string) {
    return this.engagementService.removeSubscriber(id);
  }
}
