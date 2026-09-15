import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CmsService } from './cms.service.js';
import { CreateFaqDto, CreatePageDto, UpdateFaqDto, UpdatePageDto } from './dto/cms.dto.js';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';

@ApiTags('Content')
@Controller()
export class CmsController {
  constructor(@Inject(CmsService) private readonly cmsService: CmsService) {}

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get a published content page by slug' })
  findPage(@Param('slug') slug: string) {
    return this.cmsService.findPublishedPage(slug);
  }

  @Get('faqs')
  @ApiOperation({ summary: 'List active FAQs' })
  findFaqs() {
    return this.cmsService.findActiveFaqs();
  }

  @Get('admin/pages')
  @AdminOnly()
  findAllPages() {
    return this.cmsService.findAllPages();
  }

  @Post('admin/pages')
  @AdminOnly()
  createPage(@Body() dto: CreatePageDto) {
    return this.cmsService.createPage(dto);
  }

  @Put('admin/pages/:slug')
  @AdminOnly()
  updatePage(@Param('slug') slug: string, @Body() dto: UpdatePageDto) {
    return this.cmsService.updatePage(slug, dto);
  }

  @Delete('admin/pages/:slug')
  @AdminOnly()
  removePage(@Param('slug') slug: string) {
    return this.cmsService.removePage(slug);
  }

  @Get('admin/faqs')
  @AdminOnly()
  findAllFaqs() {
    return this.cmsService.findAllFaqs();
  }

  @Post('admin/faqs')
  @AdminOnly()
  createFaq(@Body() dto: CreateFaqDto) {
    return this.cmsService.createFaq(dto);
  }

  @Put('admin/faqs/:id')
  @AdminOnly()
  updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.cmsService.updateFaq(id, dto);
  }

  @Delete('admin/faqs/:id')
  @AdminOnly()
  removeFaq(@Param('id') id: string) {
    return this.cmsService.removeFaq(id);
  }
}
